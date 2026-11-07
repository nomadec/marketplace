---
name: answer
description: "Write the reply to the person who asked, from what the unit learned: the answer first, then the evidence, in the Register, with no code. Used by the umka:run phase answer; called by name, not for auto-triggering."
---

# Answer

The input is what the unit learned: the briefs and close reasons of its items, the comments it posted, and the question as asked. The output is the reply text, ready to post as it is.

## Read

Collect the facts: each item's close reason, each comment the unit posted on the source, the source itself. Find the question as the reporter asked it. The reply answers that question, not the one the unit found interesting on the way.

## Write

The shape:

1. The answer, in the first sentence: a yes, a no, a number, a name, a cause.
2. What it rests on: one line per fact, each with its pointer (a path, a commit, a ticket, a doc section).
3. What the reader can do next, when there is something: one sentence. A product decision the facts raise goes here, with a recommended answer.

Nothing else: no story of the search, no code, no plan. Under ten lines.

Every sentence follows the Register of `umka:run`: ASD-STE100, the GLOSSARY term and none of the words its `_Avoid_` line lists, active voice, one fact per sentence, under 20 words. The reader may be Product or the person who raised the request; they act on the reply without opening the repo.

## Return

The reply text and nothing else.
