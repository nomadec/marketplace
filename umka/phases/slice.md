---
phase: slice
mode: afk
skill: umka:mattpocock-to-tickets
from: [source, sort, approve-spec]
to:
  - phase: approve-slicing
artifact: every ticket of the spec exists on the tracker with its blocking edges and the ready-for-agent label
budget: 100k
---
# slice

**Input:** the spec URL from the epic's `spec:` note; the spec's User Stories, Implementation Decisions and Testing Decisions, and what it points at (ADRs, research, prototype notes).

**Run:** `/umka:mattpocock-to-tickets <spec URL>` in the unit's checkout, with the repo's tracker doc read first. The grain is one ticket per user story; a story splits only when one ticket would not fit a fresh context window, each part demoable alone. The three questions the skill puts to the user (granularity, blocking edges, merge or split) are the self-check before publishing; the `approve slicing` checkpoint is the approval it iterates toward. Where the spec left a split open, the ticket carries one `Assumption:` line, so the human can redraw it at the checkpoint.

**Done when:** every user story of the spec is carried by a ticket under the spec issue, each with its blocking edges and the `ready-for-agent` label.

**Reconcile:** child tickets exist under the spec. Some missing: publish only those.

**Close out:** `checkpoint: approve slicing` brief: the tickets, one line each with the story it delivers, its blockers and its assumption when it has one; and the spec URL. Behind it, one `implement: <ticket title>` per ticket, `--external-ref <ticket URL>`, blocked by the implement item of each ticket its `blocked_by` names; then `pr`.
