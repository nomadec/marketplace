---
phase: approve-slicing
mode: checkpoint
skill: human
from: [slice]
to:
  - phase: implement
    per: ticket
  - phase: pr
artifact: the checkpoint is closed
ask: the tickets, one line each with the story it delivers, its blockers and its assumption when it has one, and the spec URL
---
# approve slicing

The human approves the breakdown. A ticket they drop: close its implement item; a ticket they add: lay its implement item behind this checkpoint and in front of `pr`.
