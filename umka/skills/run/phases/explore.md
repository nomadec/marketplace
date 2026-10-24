---
phase: explore
mode: afk
skill: none (picks a move)
from: [source, sort, choose-direction, answers-in, research]
to:
  - phase: research
    when: the move is research
  - phase: prototype
    when: the move is prototype
  - phase: reproduce
    when: the move is reproduce
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

**Run:** read the brief and the source behind it. Pick one move by what is missing:

| Missing | Move |
|---|---|
| A fact the docs, the source, or primary sources hold | `research` |
| A feel for whether a state model or UI works | `prototype` |
| The cause of a reported failure | `reproduce` |
| Knowledge a colleague or client holds | `questionnaire` |
| A design decision only the human can settle | `grill` |
| Nothing: the reporter needs a reply, no code | `answer` |
| Nothing: the design is settled, build it | `spec` |

Human present: name the move and the reason in one line and take their word. Absent: pick, and write the reason as the first line of the move item's brief.

**Done when:** the move is named.

**Reconcile:** a move item exists with this brief: done.

**Close out:** the move item's brief is this brief plus the reason line and what the pick learned. Close reason: `move: <move> → <id>`.
