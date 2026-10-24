---
phase: implement
mode: afk
skill: mattpocock-skills:implement
from: [source, sort, approve-slicing]
to:
  - phase: pr
artifact: the ticket is closed with a report comment and every acceptance criterion ticked
budget: 150k
---
# implement

**Input:** the ticket URL in this item's `external_ref`; the unit's branch.

**Run:** `/mattpocock-skills:implement <ticket URL>`. It runs tdd and code-review.

**Done when:** the full suite is green and every code-review finding is fixed.

**Reconcile:** ticket closed: done. Commits for it on the branch but ticket open: run the ticket close-out only.

**Close out (ticket):** commit, push, then on the ticket: a report comment (what was built, the commits, how it was verified), every acceptance criterion ticked, ticket closed. The `pr` item exists already when slicing laid it.
