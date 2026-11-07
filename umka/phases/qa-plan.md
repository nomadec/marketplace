---
phase: qa-plan
mode: afk
skill: umka:qa-plan
from: [decide-blocking, address]
to:
  - phase: qa-run
artifact: the companion QA issue carries "## Wave M" for this item and the epic's qa: note names the issue
budget: 80k
---
# qa plan

**Input:** the PR URL from the epic's `pr:` note; the diff since the previous wave (`Wave at <sha>` in the QA issue), or the whole PR diff for wave 1.

**Run:** `/umka:qa-plan` with the PR URL and the diff; it returns the `## Wave M` section, which this turn appends to the companion issue.

Companion issue: the open `ready-for-human` issue whose body carries `<!-- qa:<PR URL> -->`. Append the wave to it, keeping every earlier wave and tick intact. None yet: create it, titled `QA: <spec title>`, labelled `ready-for-human` only, body starting with the marker, the PR URL, then `## Wave 1`.

**Done when:** the wave is on the companion issue.

**Reconcile:** the companion issue carries `## Wave M` for this item: done.

**Close out:** `bd note $E "qa: <issue URL>"`. The `qa run wave M` brief: the QA issue URL and the wave number.
