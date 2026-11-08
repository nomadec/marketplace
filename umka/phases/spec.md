---
phase: spec
mode: afk
skill: umka:mattpocock-to-spec
from: [source, sort, approve-proposal, explore]
to:
  - phase: approve-spec
artifact: the spec issue exists on the tracker labelled ready-for-agent and the epic's spec: note names it
budget: 150k
---
# spec

**Input:** the brief in this item's description: the proposal, the problem story, and the research and ADRs it points at, read in full. The brief is the conversation the skill synthesizes, and it is the scope: a story the proposal does not cover goes under Out of Scope. The source is the epic's `external_ref`, or its description.

**Run:** `/umka:mattpocock-to-spec` on the brief; publish as the repo's tracker doc says, with the spec linking the source. Nobody is in the session to check the seams with: write them into Testing Decisions as decisions, each with one line on what it catches and what it misses; the human checks them at `approve spec`. A decision the brief leaves open is taken the engineering way and marked `Assumption:`, so the human can overturn it there too.

**Done when:** the spec issue is on the tracker labelled `ready-for-agent`, and in it: every numbered point of the proposal maps to a story; the problem is told with the source's evidence; a **Current Behaviour** section before Implementation Decisions states, for every path the spec changes, what the code does there today, read from the modules and tests; every test seam names an existing test file, or is marked `new`.

**Reconcile:** the epic's `spec:` note names an issue that exists: done. The issue exists and the note is missing: add the note only.

**Close out:** `bd note $E "spec: <url>"`. `checkpoint: approve spec` brief: the spec URL, the coverage table (one row per proposal point with the spec section that carries it), then every place the spec widened or narrowed the proposal, one line each.
