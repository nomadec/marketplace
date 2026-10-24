---
phase: slice
mode: afk
skill: mattpocock-skills:to-tickets
from: [source, sort, approve-spec]
to:
  - phase: approve-slicing
artifact: every ticket of the spec exists on the tracker with its blocking edges and the ready-for-agent label
budget: 100k
---
# slice

**Input:** the spec URL from the epic's `spec:` note.

**Run:** `/mattpocock-skills:to-tickets <spec URL>`, headless: take the breakdown the spec's stories give, one ticket per story unless a story needs two, with blocking edges where one ticket needs another. Publish each ticket as the repo's tracker doc says, a child of the spec, labelled `ready-for-agent`.

**Done when:** every ticket is published with its blocking edges and the `ready-for-agent` label.

**Reconcile:** child tickets exist under the spec. Some missing: publish only those.

**Close out:** `checkpoint: approve slicing` brief: the tickets, one line each with their blockers, and the spec URL. Behind it, one `implement: <ticket title>` per ticket, `--external-ref <ticket URL>`, blocked by the implement item of each ticket its `blocked_by` names; then `pr`.
