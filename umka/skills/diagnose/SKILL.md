---
name: diagnose
description: "Diagnose and fix a reported bug in one run: build a tight feedback loop, reproduce, minimise, hypothesise, instrument, commit the red test, apply the fix at the cause, clean up, until the full suite is green and the commits are pushed. Headless: nothing is asked of a user mid-run. Used by the umka:run phase diagnose; called by name, not for auto-triggering."
origin:
  upstream: mattpocock-skills:diagnosing-bugs
  repo: github.com/mattpocock/skills
  version: 1.3.2
  commit: a496f5513d4a4cf889bc48e189e579f4b0bdf6aa
  license: MIT
  adapted: true
  derived: the whole upstream skill, with the red test committed before the fix, four findings that end the run early, and no questions to a user
---

# Diagnose

The input is a bug report and its source ticket, in a checkout on the unit's branch. The output is the cause, the reproduction (a red test committed on the branch) and the commits that make it green with the full suite green, pushed. Or one of the four findings that end the run early. Nobody is asked anything mid-run: a point where a human's word would help is a line in the return, and the run goes on.

Read `GLOSSARY.md` when it exists for the modules the report names, and the ADRs in the area you touch. A fix that contradicts an ADR is a finding, not a fix.

## Redact

Commands, outputs and captured artifacts go into the return and onto the ticket. Redact every secret first: write `<REDACTED>` in its place. Build loops against env vars, so the credential stays in the environment. A captured artifact carries auth headers: quote only the lines that carry the signal.

## 1. Build a feedback loop

This is the skill; everything after it is mechanical. A tight pass/fail signal that goes red on this bug finds the cause; bisection, hypotheses and instrumentation all consume it. Without one, reading code finds nothing. Spend most of the effort here. Be aggressive, be creative, do not give up.

Ways to build one, in this order:

1. A failing test at whatever seam reaches the bug: unit, integration, e2e.
2. A curl or HTTP script against a running dev server.
3. A CLI invocation with a fixture input, its stdout diffed against a known-good snapshot.
4. A headless browser script (Playwright, Puppeteer) that drives the UI and asserts on DOM, console or network.
5. A replayed trace: save a real request, payload or event log to disk and replay it through the code path alone.
6. A throwaway harness: a minimal subset of the system (one service, mocked deps) that hits the bug path with one call.
7. A property or fuzz loop: for "sometimes wrong output", run 1000 random inputs and look for the failure mode.
8. A bisection harness: when the bug appeared between two known states (commit, dataset, version), automate "boot at state X, check" so `git bisect run` can drive it.
9. A differential loop: the same input through the old and new version, or two configs, outputs diffed.

Tighten the loop once it exists. Faster: cache the setup, skip unrelated init, narrow the scope. Sharper: assert on the exact symptom, not "did not crash". Deterministic: pin time, seed the RNG, isolate the filesystem, freeze the network. A 30-second flaky loop is barely a loop; a 2-second deterministic one is the tool.

A non-deterministic bug needs a higher reproduction rate, not a clean repro: loop the trigger 100 times, parallelise, add stress, narrow the timing window, inject sleeps. A 50% flake is debuggable; 1% is not.

**No loop.** When no loop can be built, stop here. The return is the `No loop` finding: what you tried, one line each, and what a human must supply: an environment that reproduces it, a redacted captured artifact (HAR, log dump, core dump, recording with timestamps), or temporary production instrumentation. Do not hypothesise without a loop.

**Done** when one command (a test invocation, a script path, a curl) has already run at least once, with its invocation and redacted output in hand, and is:

- Red-capable: it drives the bug's code path and asserts the reporter's exact symptom, so it goes red on this bug and green once fixed.
- Deterministic: the same verdict every run, or a pinned high rate for a flaky bug.
- Fast: seconds.
- Agent-runnable: it runs unattended.

Reading code to build a theory before this command exists is the failure this skill prevents. No red-capable command, no step 2.

## 2. Reproduce and minimise

Run the loop. Watch it go red. Confirm:

- The loop produces the failure the reporter described, not a nearby one. Wrong bug, wrong fix.
- The failure repeats across runs, or at a rate high enough to work against.
- The exact symptom is captured (error text, wrong output, timing), so step 7 can prove it is gone.

Then shrink the repro to the smallest scenario that still goes red. Cut inputs, callers, config, data and steps one at a time, re-running after each cut, and keep only what the failure needs. Done when removing any remaining element makes the loop go green. The minimal repro narrows the hypotheses and becomes the regression test.

Not a bug: the loop shows the behaviour the spec, the docs or an ADR asks for. Stop with the `Not a bug` finding and the pointer.

## 3. Hypothesise

Write 3 to 5 ranked hypotheses before testing any one of them; a single hypothesis anchors on the first plausible idea. Each one is falsifiable and states its prediction: "If X is the cause, then changing Y makes the bug disappear, or changing Z makes it worse." A hypothesis with no prediction is a vibe: sharpen it or drop it. The ranked list goes into the return as it was before testing.

## 4. Instrument

Each probe tests one prediction from step 3. Change one variable at a time. In order of preference: a debugger or REPL when the environment has one (one breakpoint beats ten logs); targeted logs at the boundaries that separate the hypotheses; never "log everything and grep". Tag every debug log with one prefix, `[DEBUG-<4 hex>]`, so cleanup is one grep.

A performance regression: logs are the wrong tool. Take a baseline (a timing harness, `performance.now()`, a profiler, a query plan), then bisect. Measure first.

Done when one hypothesis held and the others fell: the cause is one sentence that names the code and the condition.

Design question: the cause is a decision nobody took, two behaviours are each defensible and the spec does not choose. Stop with the `Design question` finding: the two behaviours and the evidence for each.

## 5. Size the fix

- `small`: one change in one place; the red test covers it.
- `medium`: several files, a data change or a migration; the red test covers the behaviour, the suite covers the rest.
- `large`: the fix changes a design or an interface other code depends on. Stop with the `Large fix` finding: the cause, the interface it changes, and who depends on it. A grill decides it before any fix.

## 6. Lock the cause in a red test

Write the regression test at a correct seam: one where the test exercises the real bug pattern as it occurs at the call site. A seam that is too shallow (a single-caller test when the bug needs several callers, a unit test that cannot replay the chain) gives false confidence. No correct seam is itself a finding for the return: commit the loop from step 1 under a marked path (`scripts/debug/<ticket>/`) and use it as the red signal for step 7.

With a seam: turn the minimised repro into a failing test there. Watch it fail. A red forced by mutating code or a fixture is proved with a `diff` against a pristine copy before it is trusted. Commit the test alone, message `test: reproduce <ticket>: <symptom>`, on the unit's branch.

## 7. Apply the fix

The fix removes the cause, not the symptom. A change that makes the test green at a different place than the cause (a guard at the call site for a bug in the callee, a retry around a race) is not the fix. The smallest change that removes the cause. Never change the test to make it pass; a test that asserts the wrong thing is a finding for the return, not an edit. Match the repo's conventions. When the fix opens a correct seam that step 6 lacked, write the regression test there now, red before the fix, green after.

Watch the red test go green. Re-run the original, un-minimised reproduction from the ticket's report: the symptom is gone there too, not only in the minimal case.

## 8. Suite and checks

Run the project's checks: typecheck, the affected test files, then the full suite once. Every check green. A test unrelated to the fix goes red: find whether the fix broke it (then the fix is wrong) or it was red on the default branch already (then say so in the return; do not touch it).

## 9. Cleanup

Before the commit, each line holds:

- The original repro does not reproduce (step 7 re-run).
- The regression test passes, or the absence of a seam is in the return.
- No `[DEBUG-...]` instrumentation remains: `grep` the prefix across the tree.
- Every throwaway harness is deleted; `scripts/debug/<ticket>/` goes with the fix when the regression test now covers it.
- No change outside the fix's scope.

## 10. Commit and push

One commit for the fix, or one per logical part of it. The message says what was wrong and why: the cause sentence, the hypothesis that held, so the next reader learns it. The red test's commit stays as it is; the fix commit follows it. Push the branch.

## Return

```
Cause: <one sentence: the code and the condition; the hypothesis that held>
Reproduction: <test path>, run with `<command>`, red at <commit sha>
Fix size: small | medium. <reason, one sentence>
Commits: <sha> <subject>, one per line
Test: <test path> green; suite green (<n> tests); <checks run>
Hypotheses: <the ranked list, one line each, with held or fell>
```

A line `Seam: none; <why>` when no regression test could be placed, and a line `Unrelated red: <test>, red on <default branch> at <sha>` when one was found.

Or one of the four findings, each with its evidence under it: `No loop: <what was tried; what a human must supply>`, `Not a bug: <the pointer that asks for this behaviour>`, `Design question: <the two behaviours>`, `Large fix: <the cause; the interface it changes; who depends on it>`. A fix that contradicts an ADR is `Design question` with the ADR as one of the two behaviours. Nothing else.
