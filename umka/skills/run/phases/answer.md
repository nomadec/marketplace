---
phase: answer
mode: afk
skill: none
from: [explore, reproduce]
to: []
artifact: the reply posted to the channel, and as a comment on the source ticket when there is one
budget: 30k
---
# answer

**Input:** what the unit learned: the briefs and close reasons of its items.

**Run:** write the reply in the register of `SKILL.md`, post it to the channel (`cli`: print it) and comment it on the source ticket when there is one. No code.

**Done when:** the reply is posted.

**Reconcile:** the reply exists: done.

**Close out:** no open child left under the epic: close the epic with the reply as the reason and `git worktree remove <path>` for each `worktree:` note of the epic. Result line: `Unit done: <reply, first sentence>`.
