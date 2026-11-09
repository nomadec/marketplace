---
phase: diagnose
mode: afk
skill: umka:mattpocock-diagnosing-bugs
from: [source, intake, explore]
to:
  - phase: pr
    when: the fix is green
  - phase: grill
    when: the finding is a design question or a large fix
  - phase: answer
    when: the finding is not a bug or no loop
artifact: cause, reproduction and fix posted on the source ticket with the commits on the branch, or the finding in the close reason
budget: 300k
---
# diagnose

**Input:** the bug report in this item's brief; the source ticket from the epic's `external_ref`; the unit's branch.

**Run:** `/umka:mattpocock-diagnosing-bugs` on the bug report, in the unit's worktree, with these rules in place of the skill's questions to the user:

- **Nobody is asked anything mid-run.** The skill's "ask the user" points become lines in the ticket comment: the ranked hypotheses go there as they were before testing, and the redacted output goes there too. The hitl bash loop, the skill's option 10, is off when the human is absent: a loop that needs a human's clicks is `No loop`. With the human present, option 10 runs as the skill says.
- **Read the ADRs** in the area before the first probe. A fix that contradicts one is a design question, with the ADR as one of the two behaviours.
- **Size the fix** once the cause is named, before the regression test. `small`: one change in one place, the red test covers it. `medium`: several files, a data change or a migration; the suite covers the rest. `large`: the fix changes a design or an interface other code depends on; stop, no fix.
- **Commit the red test alone** before the fix, message `test: reproduce <ticket>: <symptom>`, on the unit's branch. No correct seam: commit the feedback loop under `scripts/debug/<ticket>/` instead, and delete it with the fix when a regression test now covers it.
- **The fix removes the cause, not the symptom.** A guard at the call site for a bug in the callee, or a retry around a race, is not the fix. Never change the test to make it pass; a test that asserts the wrong thing is a line in the comment.
- **Checks:** typecheck, the affected test files, then the full suite once. A test unrelated to the fix goes red: the fix broke it (then the fix is wrong), or it was red on the default branch already (then say so in the comment and leave it).
- **Commit the fix** in one commit, or one per logical part, the message carrying the cause sentence and the hypothesis that held. Push the branch.

Four **findings** end the run early. Each is posted on the source ticket with its evidence and becomes the close reason:

- `No loop: <what was tried, one line each; what a human must supply>`, from the skill's "cannot build a loop" stop.
- `Not a bug: <the pointer that asks for this behaviour>`: the loop shows what the spec, the docs or an ADR asks for.
- `Design question: <the two behaviours and the evidence for each>`: the cause is a decision nobody took, and the spec does not choose.
- `Large fix: <the cause; the interface it changes; who depends on it>`.

**Done when:** the ticket comment carries the cause, the reproduction (test path, command, red commit), the fix size, the commits, the checks run and the ranked hypotheses, with the red test and the fix commits pushed on the branch; or the ticket comment carries one finding with its evidence. A `Seam: none` line when no regression test could be placed, and an `Unrelated red: <test>, red on <default branch> at <sha>` line when one was found.

**Reconcile:** the ticket comment with cause, reproduction and commits exists: done. The fix commits exist and the comment does not: post the comment only. The red test exists and no fix commit: run the skill from its Phase 5 step 3 with the committed test as the red signal.

**Close out:** the close reason is the ticket comment's first line. A `grill` brief: the finding with its evidence, and the line `Run /umka:run <this id> in a session with you present`. An `answer` brief: the finding with its evidence; `No loop` lists what a human must supply, so the reply asks the reporter for it.
