---
phase: questionnaire
mode: afk
skill: umka:mattpocock-to-questionnaire
from: [explore]
to:
  - phase: answers-in
artifact: the questionnaire file committed on the branch, its path posted to the channel
budget: 50k
---
# questionnaire

**Input:** the brief in this item's description: the question as asked, the source's facts, who asked, what a good answer looks like, and who holds the knowledge, named on its first line. The asker is the person who raised the request; the From line of the questionnaire names them.

**Run:** `/umka:mattpocock-to-questionnaire` on the brief. Its two questions about the send are answered from the brief, with no interview: the recipient is the knowledge holder the brief names, and what is needed back is what the brief says is missing. The brief names a person but not their expertise: infer it from the source and write the inference into the Context section as `Assumption:`, so the recipient can correct it. The brief names nobody: address the questionnaire to the asker, and say so the same way. Then commit the file on the branch and post its path to the channel.

**Done when:** the file is on the branch, every answer the brief says is missing has a question, and the path is posted.

**Reconcile:** the file exists on the branch: post the path when missing, then done.

**Close out:** `checkpoint: answers in` brief: the file path and the line `Paste the answers into the question item's description, then close this checkpoint`. Its `to:` item is `explore` titled `<question title> (with answers)`.
