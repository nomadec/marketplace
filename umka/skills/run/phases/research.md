---
phase: research
mode: afk
skill: mattpocock-skills:research
from: [explore]
to:
  - phase: explore
    when: the file opens a question, one item per question
  - phase: choose-direction
    when: the file opens two or more questions
artifact: a file under docs/research/ on the branch that answers the question or names what it could not find
budget: 80k
---
# research

**Input:** the question in this item's brief.

**Run:** `/mattpocock-skills:research` on the question; the file lands under `docs/research/` (or the repo's existing convention), committed on the branch.

**Done when:** every claim in the file cites its source, and the file answers the question or names what it could not find.

**Reconcile:** the file exists on the branch: done.

**Close out:** close reason: what the file learned, one paragraph, and its path. Each question the file opened is one `explore` item with its own brief; two or more at once also lay `checkpoint: choose direction`, blocking every one, with the questions listed in its brief. No open child left under the epic: close the epic with the answer as the reason.
