---
phase: merge
mode: afk
skill: gh pr merge
from: [approve-merge]
to: []
artifact: the PR is merged
budget: 30k
---
# merge

**Input:** the PR URL from the epic's `pr:` note.

**Run:** merge as the repo's tracker doc says under "Pull requests" (GitHub form: `gh pr merge` with the repo's merge method), delete the branch, confirm the spec issue closed and close it when the tracker left it open.

**Done when:** the PR is merged.

**Reconcile:** the PR's state is merged (GitHub form: `gh pr view <url> --json state`): done.

**Close out:** `bd close $E --reason "<PR URL>"`; `git worktree remove <path>` for each `worktree:` note of the epic. Result line: `Unit done: <PR URL>. Announce with /release-note or /eod-update when wanted.`
