---
phase: reproduce
mode: afk
skill: umka:reproduce
from: [source, intake, sort, explore]
to:
  - phase: decide-fix
    when: the cause is named
  - phase: grill
    when: the failure is a design question
  - phase: answer
    when: the failure is not a bug
artifact: cause, reproduction and fix size posted on the source ticket, or in the close reason
budget: 150k
---
# reproduce

**Input:** the bug report in this item's brief; the source ticket from the epic's `external_ref`.

**Run:** `/umka:reproduce` with the bug report and the source ticket; it returns the cause, the reproduction (the red test on the branch) and the fix size, or the finding that the failure is not a bug or is a design question.

**Done when:** the cause, the reproduction (the red test, committed on the branch) and the fix size are posted on the source ticket.

**Reconcile:** the comment with cause, reproduction and fix size exists: done. The red test exists and the comment does not: post the comment only.

**Close out:** `checkpoint: decide fix` brief: the cause, the reproduction, the fix size, the line `Source ticket is the fix's ticket: yes` or `no`, and the recommended answer.
