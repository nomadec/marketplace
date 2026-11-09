---
phase: diagnose
mode: afk
skill: umka:diagnose
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

**Input:** the bug report in this item's brief; the source ticket from the epic's `external_ref`.

**Run:** `/umka:diagnose` with the bug report and the source ticket; it returns the cause, the reproduction (the red test on the branch), the fix commits with the full suite green, and the hypotheses, or one of four findings: no loop, not a bug, design question, large fix.

**Done when:** the cause, the reproduction, the fix size and the commits are posted on the source ticket, with the red test and the fix commits pushed on the branch; or the finding is posted on the source ticket with its evidence.

**Reconcile:** the comment with cause, reproduction and commits exists: done. The fix commits exist and the comment does not: post the comment only. The red test exists and no fix commit: resume the skill at step 7 with the test as the red signal.

**Close out:** the close reason is the return. A `grill` brief: the finding with its evidence, and the line `Run /umka:run <this id> in a session with you present`. An `answer` brief: the finding with its evidence; `No loop` lists what a human must supply, so the reply asks the reporter for it.
