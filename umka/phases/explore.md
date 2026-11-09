---
phase: explore
mode: afk
rounds: 3
skill: umka:explore
from: [source, sort, choose-direction, answers-in, research]
to:
  - phase: research
    when: the move is research
  - phase: prototype
    when: the move is prototype
  - phase: diagnose
    when: the move is diagnose
  - phase: questionnaire
    when: the move is questionnaire
  - phase: answer
    when: the move is answer
  - phase: grill
    when: the move is grill
  - phase: spec
    when: the move is spec
artifact: one move item exists under the epic with this item's brief and the reason for the pick as its first line
budget: 30k
---
# explore

**Input:** the brief in this item's description: the question as asked, the source's facts, who asked, what a good answer looks like.

**Run:** `/umka:explore` with the brief; it returns the move and the reason for the pick in one line, then what the pick learned.

**Done when:** the move is named.

**Reconcile:** a move item exists with this brief: done.

**Close out:** the move item's brief is this brief plus the reason line and what the pick learned. Close reason: `move: <move> → <id>`.
