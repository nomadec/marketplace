---
phase: prototype
mode: hitl
skill: umka:mattpocock-prototype
from: [explore]
to:
  - phase: grill
    when: the verdict asks for a design
artifact: the verdict posted on the source ticket, or in the close reason, with a pointer to the throwaway branch
---
# prototype

**Input:** the design question in this item's brief; the source ticket from the epic's `external_ref`.

**Run:** `/umka:mattpocock-prototype` on a throwaway git branch off the unit's branch, from the first commit.

**Done when:** the human gives the verdict.

**Reconcile:** the verdict comment exists: done.

**Close out:** post the verdict on the source ticket (none: the close reason) with the branch pointer. The decision travels in the verdict to the next item.
