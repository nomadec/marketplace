---
phase: pr
mode: afk
skill: mattpocock-skills:pr
from: [approve-slicing, implement, fix]
to:
  - phase: review
artifact: a PR for the branch exists and the epic's pr: note names it
budget: 50k
---
# pr

**Input:** the unit's branch; the spec URL from the epic's `spec:` note (a fix: the source ticket).

**Run:** push the branch, write the body with `/mattpocock-skills:pr`, open the PR as the repo's tracker doc says under "Pull requests" (GitHub form: `gh pr create`), titled from the spec and referencing it the way the tracker links PRs.

**Done when:** the PR URL exists.

**Reconcile:** the tracker doc's "find the PR of a branch" returns one (GitHub form: `gh pr list --head <branch> --json url`): done; add the note when missing.

**Close out:** `bd note $E "pr: <url>"`. The `review` item is `review round 1`.
