---
phase: fix
mode: afk
skill: mattpocock-skills:diagnosing-bugs
from: [decide-fix]
to:
  - phase: pr
artifact: the red test is green and the fix commits are on the branch
budget: 150k
---
# fix

**Input:** the cause and the red test from the `reproduce` item (its close reason and the source ticket); the human's words from the `decide fix` checkpoint.

**Run:** `/mattpocock-skills:diagnosing-bugs`, the second half: fix, regression-test, until the suite is green.

**Done when:** the red test is green, the full suite is green, the commits are pushed.

**Reconcile:** the test passes on the branch: done.

**Close out:** comment on the source ticket: what was fixed and the commits.
