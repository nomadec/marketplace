---
phase: approve-merge
mode: checkpoint
skill: human
from: [qa-run, address]
to:
  - phase: merge
  - phase: address
    when: the PR has open threads before the brief
artifact: the checkpoint is closed
ask: the PR URL, the review rounds run, every push-back, the QA waves passed
---
# approve merge

The human approves the merge. A no: close this checkpoint with the reason and lay `address round N+1` by hand.

**Before the brief:** count the PR's open threads (`address.md`). Any: the human has nothing to approve yet. Lay `address round N+1` with `bd dep add <this id> <new id>` so this checkpoint waits behind it, and stop with the `waits` result line: `<this id> waits: address round N+1 laid for <count> open threads`.
