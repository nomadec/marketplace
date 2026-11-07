---
phase: qa-failed
mode: checkpoint
skill: human
from: [qa-run]
to:
  - phase: address
artifact: the checkpoint is closed
ask: the failed steps one line each, the PR comments that carry them, and how to change the scope of the next address round
---
# QA wave failed

Laid only when a wave fails. The human confirms the failed steps as `Blocks merge` comments on the PR; `address round N+1` follows, then a new `qa plan` wave.
