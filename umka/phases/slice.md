---
phase: slice
mode: afk
skill: umka:mattpocock-to-tickets
from: [source, sort, grill, spec]
to:
  - phase: implement
    per: ticket
  - phase: pr
artifact: every ticket of the spec exists on the tracker with its blocking edges and the ready-for-agent label
budget: 100k
---
# slice

**Input:** the spec URL from the epic's `spec:` note; the spec's User Stories, Implementation Decisions and Testing Decisions, and what it points at (ADRs, research, prototype notes).

**Run:** `/umka:mattpocock-to-tickets <spec URL>` in the unit's checkout, with the repo's tracker doc read first. The grain is one ticket per user story; a story splits only when one ticket would not fit a fresh context window, each part demoable alone. Replace the skill's user approval step with a self-check of granularity, blocking edges, and whether to merge or split tickets, then publish. Where the spec left a split open, record the choice and its rationale in an `Assumption:` line on the ticket.

**Done when:** every user story of the spec is carried by a ticket under the spec issue, each with its blocking edges and the `ready-for-agent` label.

**Reconcile:** child tickets exist under the spec. Some missing: publish only those.

**Close out:** one `implement: <ticket title>` per ticket, `--external-ref <ticket URL>`, blocked by the implement item of each ticket its `blocked_by` names; then `pr`.
