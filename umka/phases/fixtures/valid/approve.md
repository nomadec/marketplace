---
phase: approve
mode: checkpoint
skill: human
from: [work]
to:
  - phase: ship
    when: approved
  - phase: work
    when: rejected
artifact: the checkpoint is closed
ask: the change
rounds: 2
---
# approve
