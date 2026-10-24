---
phase: reproduce
mode: afk
skill: mattpocock-skills:diagnosing-bugs
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

**Run:** `/mattpocock-skills:diagnosing-bugs`, the first half only: reproduce, minimise, until a test goes red on the bug and the cause is named. No fix.

**Done when:** the cause, the reproduction (the red test, committed on the branch) and the fix size are posted on the source ticket.

**Reconcile:** the comment with cause, reproduction and fix size exists: done. The red test exists and the comment does not: post the comment only.

**Close out:** `checkpoint: decide fix` brief: the cause, the reproduction, the fix size, the line `Source ticket is the fix's ticket: yes` or `no`, and the recommended answer.
