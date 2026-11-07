---
phase: implement
mode: afk
skill: umka:mattpocock-implement
from: [source, sort, approve-slicing]
to:
  - phase: pr
artifact: the ticket is closed with a report comment and every acceptance criterion ticked
budget: 150k
---
# implement

**Input:** the ticket URL in this item's `external_ref`; the unit's branch.

**Run:** record the `HEAD` sha, then `/umka:mattpocock-implement <ticket URL>` on the unit's branch. A reference that resolves to nothing or to more than one ticket: stop, and name which in the result line; no guess. The ticket's parent spec binds the work: its Implementation Decisions and Testing Decisions apply, its Out of Scope bounds it. Each green slice is its own commit, its message naming the ticket, so the branch tells which commits are this ticket's.

The seams are pre-agreed by the spec's Testing Decisions, or implied by the ticket's acceptance criteria; that is the confirmation `umka:mattpocock-tdd` asks the user for. When neither names one, take the highest existing seam that covers the ticket's behaviour and record the choice and what it misses in the report.

**Review:** the recorded sha is the argument of the `umka:mattpocock-code-review` call. Fix every finding, re-run the affected tests and the typecheck, and commit the fixes. A finding that needs a product decision stays as it is and goes in the report under open questions.

**Done when:** the full suite is green and every code-review finding is fixed or listed as an open question.

**Reconcile:** ticket closed: done. Commits for it on the branch but ticket open: run the ticket close-out only.

**Close out (ticket):** commit, push, then on the ticket: a report comment, every acceptance criterion ticked, ticket closed. The report: one line per acceptance criterion with the test that proves it; the commits (sha and subject); how it was verified (typecheck, test files, full suite); the seams chosen and the assumptions taken, when the inputs left any open; open questions from the review, when any. The `pr` item exists already when slicing laid it.
