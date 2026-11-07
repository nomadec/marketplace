---
name: fix
description: "Fix a bug whose cause is named and whose red test is on the branch: apply the fix at the cause, watch the test go green, re-run the original repro, clean up, until the full suite is green and the commits are pushed. Headless: nothing is asked of a user mid-run. Used by the umka:run phase fix; called by name, not for auto-triggering."
origin:
  upstream: mattpocock-skills:diagnosing-bugs
  repo: github.com/mattpocock/skills
  version: 1.3.2
  commit: a496f5513d4a4cf889bc48e189e579f4b0bdf6aa
  license: MIT
  adapted: true
  derived: the second half of the upstream skill, the fix of Phase 5 and the Cleanup of Phase 6, with the red test taken as given and no questions to a user
---

# Fix

The input is the cause in one sentence, the reproduction (the red test, its command, the commit) and the human's words on the fix: its scope, its ticket, what to leave alone. The checkout is the unit's branch with the red test on it. The output is the commits that make the test green with the full suite green, pushed. Nobody is asked anything mid-run: a point where a human's word would help is a line in the return.

Read `GLOSSARY.md` when it exists for the modules you touch, and the ADRs in the area; a fix that contradicts an ADR stops with that as the return.

## 1. Run the red test

Run the reproduction command. It goes red with the symptom the reproduction names. Green already: stop, the return says so with the run's output; nothing is fixed twice. A different red: the branch moved under the test; find why before any fix.

No test, only a committed loop under `scripts/debug/<ticket>/`: run that loop; it is the red signal for this run.

## 2. Scope the fix

The fix removes the cause, not the symptom. A change that makes the test green at a different place than the cause (a guard at the call site for a bug in the callee, a retry around a race) is not the fix. The human's words bound it: the ticket it lands on, the parts to leave alone. A fix that needs a design change, a new interface or a change the words forbid stops here: the return names what it needs and why.

## 3. Apply the fix

The smallest change that removes the cause. Never change the test to make it pass; a test that asserts the wrong thing is a finding for the return, not an edit. Match the repo's conventions. A regression test at a shallow seam, or none because the reproduction found no seam: when the fix opens a correct seam, write the test there now, red before the fix, green after; when it does not, say so in the return.

Watch the red test go green. Re-run the original, un-minimised reproduction from the ticket's report: the symptom is gone there too, not only in the minimal case.

## 4. Suite and checks

Run the project's checks: typecheck, the affected test files, then the full suite once. Every check green. A test unrelated to the fix goes red: find whether the fix broke it (then the fix is wrong) or it was red on the default branch already (then say so in the return; do not touch it).

## 5. Cleanup

Before the commit, each line holds:

- The original repro does not reproduce (step 3 re-run).
- The regression test passes, or the absence of a seam is in the return.
- No `[DEBUG-...]` instrumentation remains: `grep` the prefix across the tree.
- Every throwaway harness is deleted; `scripts/debug/<ticket>/` goes with the fix when the regression test now covers it.
- No change outside the fix's scope.

## 6. Commit and push

One commit for the fix, or one per logical part of it. The message says what was wrong and why: the cause sentence, the hypothesis that held, so the next reader learns it. The red test's commit stays as it is; the fix commit follows it. Push the branch.

## Return

```
Fixed: <the cause, one sentence>
Commits: <sha> <subject>, one per line
Test: <test path> green; suite green (<n> tests); <checks run>
```

A line `Seam: none; <why>` when no regression test could be placed, and a line `Unrelated red: <test>, red on <default branch> at <sha>` when one was found. Or the early stop, with its reason: `Already green: <output>`, `Needs a design change: <what and why>`, `Contradicts <ADR>: <how>`. Nothing else.
