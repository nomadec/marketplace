---
name: explore
description: "Pick the one move that gets a question its missing piece (research, prototype, diagnose, questionnaire, grill, answer or spec) and give the reason in one line. Used by the umka:run phase explore; called by name, not for auto-triggering."
---

# Explore

The input is a brief: the question as asked, the source's facts, who asked, and what a good answer looks like. The output is one move and the reason for it, in one line, with what the pick learned.

## Read

Read the brief, then the source behind it as far as its pointers go: the ticket, the thread, the file. Read the repo's `GLOSSARY.md` when the turn has a checkout, so the reason uses its terms. Do not search for the answer. Name what is missing before an answer can be given.

## Pick

One move, by what is missing:

| Missing | Move |
|---|---|
| A fact the docs, the source, or primary sources hold | `research` |
| A feel for whether a state model or UI works | `prototype` |
| The cause of a reported failure | `diagnose` |
| Knowledge a colleague or client holds | `questionnaire` |
| A design decision only the human can settle | `grill` |
| Nothing: the reporter needs a reply, no code | `answer` |
| Nothing: the design is settled, build it | `spec` |

More than one row holds: pick the one the others wait on. A fact comes before a feel, a cause before a decision, and the human's decision last. `answer` and `spec` are for a brief that misses nothing.

The reason is one sentence: what is missing and where the move finds it.

## Presence

Human present: say the move and the reason in one line and take their word. Their word is the move. Absent: pick, and the reason goes first in what you return.

## Return

One line, `move: <move>. <reason>.`, then what the pick learned: the facts and pointers the move needs, one per line. Nothing else.
