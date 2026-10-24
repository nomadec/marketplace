---
phase: spec
mode: afk
skill: mattpocock-skills:to-spec
from: [source, sort, approve-proposal, explore]
to:
  - phase: approve-spec
artifact: the spec issue exists on the tracker labelled ready-for-agent and the epic's spec: note names it
budget: 150k
---
# spec

**Input:** the proposal and the problem story in this item's description; the research and ADRs it points at.

**Run:** `/mattpocock-skills:to-spec` on the brief. It synthesises; the interview is already done. The brief is the scope: a story the proposal does not cover goes under Out of scope. Before writing, read in full every module and test the proposal changes, so the spec states current behaviour per path. Publish it to the tracker as the repo's tracker doc says, labelled `ready-for-agent`, referencing the source from the epic's `external_ref`.

**Done when:** the spec issue is on the tracker labelled `ready-for-agent`, and in it: every numbered point of the proposal maps to a story; the problem is told with the source's evidence; every path the spec changes has its current behaviour stated from the code; every test seam names an existing test file, or is marked new.

**Reconcile:** the epic's `spec:` note names an issue that exists: done. The issue exists and the note is missing: add the note only.

**Close out:** `bd note $E "spec: <url>"`. `checkpoint: approve spec` brief: the spec URL, the coverage table (one row per proposal point with the spec section that carries it), then every place the spec widened or narrowed the proposal, one line each.
