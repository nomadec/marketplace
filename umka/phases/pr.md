---
phase: pr
mode: afk
skill: umka:mattpocock-pr
from: [slice, implement, fix]
to:
  - phase: review
artifact: a PR for the branch exists and the epic's pr: note names it
budget: 50k
---
# pr

**Input:** the unit's branch; the spec URL from the epic's `spec:` note (a fix: the source ticket).

**Run:** push the branch, write the body with `/umka:mattpocock-pr`, open the PR as the repo's tracker doc says under "Pull requests" (GitHub form: `gh pr create`), titled from the spec and linked to it. Evidence is what this session can run; when none can be produced, the Evidence section says so in one line. An assumption goes in the body where it bears on the reader. A repo PR template is the skeleton: fill it, then add Summary, Evidence and Merge Danger where it has no equivalent section.

**Done when:** the PR URL exists.

**Reconcile:** the tracker doc's "find the PR of a branch" returns one (GitHub form: `gh pr list --head <branch> --json url`): done; add the note when missing.

**Close out:** `bd note $E "pr: <url>"`. The `review` item is `review round 1`.
