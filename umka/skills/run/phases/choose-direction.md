---
phase: choose-direction
mode: checkpoint
skill: human
from: [research]
to:
  - phase: explore
artifact: the checkpoint is closed and the directions not taken are closed
ask: the questions opened, one line each, and the instruction to close the ones not taken before closing this checkpoint
---
# choose direction

Laid when a move opens two or more questions at once; it blocks every one. The human closes the questions not taken, then the checkpoint.
