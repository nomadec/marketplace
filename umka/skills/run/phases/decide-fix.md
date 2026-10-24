---
phase: decide-fix
mode: checkpoint
skill: human
from: [reproduce, sort]
to:
  - phase: fix
artifact: the checkpoint is closed
ask: the cause, the reproduction, the fix size, whether the source ticket is the fix's ticket, the recommended answer
auto-close when: the brief says the source ticket is the fix's ticket
---
# decide fix

The human decides that the fix goes ahead as the reproduction frames it. Their answer may change the fix's scope: the `fix` item's brief takes their words.
