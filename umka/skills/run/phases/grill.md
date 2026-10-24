---
phase: grill
mode: hitl
skill: mattpocock-skills:grilling with mattpocock-skills:domain-modeling
from: [source, sort, explore, prototype, reproduce]
to:
  - phase: approve-proposal
artifact: the spec item under the epic holds the proposal in full, and GLOSSARY or ADR commits are on the branch
---
# grill

**Input:** this item's brief when exploration wrote one; else the epic's source: its `external_ref`, or its description.

**Run:** `/mattpocock-skills:grilling` with `/mattpocock-skills:domain-modeling` on the source, with the human in the session. GLOSSARY entries and ADRs land on the branch as the design settles. Each round's frontier carries product decisions only, in the register `SKILL.md` sets; engineering decisions the round uncovers are taken, written as ADRs, and listed under the round as one line each.

**Done when:** the human says proceed on a proposal.

**Reconcile:** the `spec` item exists with a proposal in its description: done.

**Close out:** write the proposal in full as the `spec` item's description, with the problem as the source told it (incidents, figures, who is hurt) above it. `checkpoint: approve proposal` brief: the proposal in five lines, then each ADR and glossary term recorded, one line each.

**Brief** (when a session lays or posts this item for an absent human): the source in one paragraph, the question the grill settles, and the line `Run /umka:run <this id> in a session with you present`.
