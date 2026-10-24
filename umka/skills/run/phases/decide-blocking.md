---
phase: decide-blocking
mode: checkpoint
skill: human
from: [review]
to:
  - phase: address
    when: the PR has open threads
  - phase: qa-plan
    when: the PR has no open thread
artifact: the checkpoint is closed
ask: the blocking count, the open thread count, the blocking bucket one line each, and how to move a finding between buckets
auto-close when: the brief says Blocking none
---
# decide blocking

The human confirms the blocking bucket of review round N before it is addressed. An empty bucket needs no human: the checkpoint auto-closes. `address` is next when the PR has open threads (`address.md`), else `qa plan`.
