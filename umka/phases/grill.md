---
phase: grill
mode: hitl
skill: umka:mattpocock-grilling
from: [source, sort, explore, prototype, reproduce]
to:
  - phase: slice
artifact: the spec issue meets this phase's Done when criteria, the epic's spec: note names it, and GLOSSARY or ADR commits are on the branch
---
# grill

**Input:** this item's brief when exploration wrote one; else the epic's source: its `external_ref`, or its description.

**Run:** `/umka:mattpocock-grilling` on the source, and `/umka:mattpocock-domain-modeling` beside it for the whole session, so glossary entries and ADRs land on the branch as the design settles.

Each round's frontier carries **product decisions** only, in the register `umka:run` sets, each question with its recommended answer. An **engineering decision** the round uncovers is not a question: take it, write it as an ADR on the branch, and list it under the round as one line each, below the questions.

When the human says proceed, run `/umka:mattpocock-to-spec` in the same session using the whole grilling conversation. Replace the skill's testing-seam confirmation with an agent decision: derive the testing approach from the settled discussion and the codebase, and record it in Testing Decisions. Record rejected design alternatives and their reasons beside the relevant decision; put excluded work under Out of Scope. Publish as the repo's tracker doc says, with the spec linking the source.

**Done when:** read **Done when** in `spec.md` and verify each requirement against the published issue. Replace its proposal-to-story coverage requirement with this: every settled decision from grilling is recorded in User Stories, Implementation Decisions, Testing Decisions, or Out of Scope, as appropriate.

**Reconcile:** read the existing spec issue and check it against **Done when**. Complete: add the epic's `spec:` note if missing, then finish. Incomplete: finish that issue from the settled discussion and recorded decisions, then check it again.

**Close out:** `bd note $E "spec: <url>"`. The `slice` brief: the spec URL.

**Brief** (when a session lays or posts this item for an absent human): the source in one paragraph, the question the grill settles, and the line `Run /umka:run <this id> in a session with you present`.
