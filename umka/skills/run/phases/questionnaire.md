---
phase: questionnaire
mode: afk
skill: mattpocock-skills:to-questionnaire
from: [explore]
to:
  - phase: answers-in
artifact: the questionnaire file committed on the branch, its path posted to the channel
budget: 50k
---
# questionnaire

**Input:** the question in this item's brief and who holds the knowledge.

**Run:** `/mattpocock-skills:to-questionnaire`; the file is committed on the branch and its path posted to the channel.

**Done when:** the file exists and its path is posted.

**Reconcile:** the file exists on the branch: post the path when missing, then done.

**Close out:** `checkpoint: answers in` brief: the file path and the line `Paste the answers into the question item's description, then close this checkpoint`. Its `to:` item is `explore` titled `<question title> (with answers)`.
