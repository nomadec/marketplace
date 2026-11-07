---
phase: answer
mode: afk
skill: umka:answer
from: [explore, reproduce]
to: []
artifact: the reply posted to the channel, and as a comment on the source ticket when there is one
budget: 30k
---
# answer

**Input:** what the unit learned: the briefs and close reasons of its items.

**Run:** `/umka:answer` with what the unit learned; it returns the reply, which this turn posts to the channel (`cli`: print it) and comments on the source ticket when there is one.

**Done when:** the reply is posted.

**Reconcile:** the reply exists: done.

**Close out:** no open child left under the epic: close the epic with the reply as the reason and `git worktree remove <path>` for each `worktree:` note of the epic. Result line: `Unit done: <reply, first sentence>`.
