---
phase: research
mode: afk
skill: umka:mattpocock-research
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

**Input:** the question in this item's brief, read in full before anything else. The file goes under `docs/research/` on the branch, named from the question's slug; Reconcile looks for it there.

**Run:** `/umka:mattpocock-research` on the question, and wait for the agent's report. A choice the question leaves open (library version, platform, a reading of an ambiguous term): take the one the brief and the repo make most likely, and record it in the file under **Assumptions**. Each further question the findings open goes under **Questions opened**, one line each.

**Done when:** the file is on the branch, every claim in it cites its source, and it answers the question or names what it could not find and what was tried for each gap.

**Reconcile:** the file exists on the branch: done.

**Close out:** close reason: what the file learned, one paragraph, and its path. Each question the file opened is one `explore` item with its own brief; two or more at once also lay `checkpoint: choose direction`, blocking every one, with the questions listed in its brief. No open child left under the epic: close the epic with the answer as the reason.
