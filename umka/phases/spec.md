---
phase: spec
mode: afk
skill: umka:mattpocock-to-spec
from: [source, sort, explore]
to:
  - phase: slice
artifact: the spec issue meets this phase's Done when criteria and the epic's spec: note names it
budget: 150k
---
# spec

**Input:** the brief in this item's description: the proposal, the problem story, and the research and ADRs it points at, read in full. The brief is the conversation the skill synthesizes, and it is the scope: a story the proposal does not cover goes under Out of Scope. The source is the epic's `external_ref`, or its description.

**Run:** `/umka:mattpocock-to-spec` on the brief; publish as the repo's tracker doc says, with the spec linking the source. Nobody is in the session to check the seams with: write them into Testing Decisions as decisions, each with one line on what it catches and what it misses. A decision the brief leaves open is taken the engineering way and recorded as `Assumption:` with its rationale.

**Done when:** the spec issue is on the tracker labelled `ready-for-agent`, and in it: every numbered point of the proposal maps to a story; the problem is told with the source's evidence; a **Current Behaviour** section before Implementation Decisions states, for every path the spec changes, what the code does there today, read from the modules and tests; every test seam names an existing test file, or is marked `new`.

**Reconcile:** read the existing spec issue and check it against **Done when**. Complete: add the epic's `spec:` note if missing, then finish. Incomplete: finish that issue from the brief and its references, then check it again.

**Close out:** `bd note $E "spec: <url>"`. The `slice` brief: the spec URL.
