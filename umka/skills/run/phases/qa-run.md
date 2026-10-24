---
phase: qa-run
mode: afk
skill: the repo's e2e tooling
from: [qa-plan]
to:
  - phase: qa-failed
    when: a step failed
  - phase: approve-merge
    when: every step passed
artifact: the wave's result is on the QA issue, and each failed step is a Blocks merge inline comment on the PR
budget: 150k
---
# qa run

**Input:** the QA issue URL from the epic's `qa:` note, the wave number in this item's brief, the PR URL from the `pr:` note.

**Run:** run every step of the wave with the repo's e2e tooling (the repo's docs name it; none: run the steps by hand with the suite and the REPL). Tick each step on the QA issue as it passes. Each failed step: an inline comment on the PR starting `**Blocks merge**` (a thread, in the tracker doc's PR form), with the step and what was observed.

**Done when:** every step is ticked or commented, and the wave's result (`passed` or `failed: <count>`) is on the QA issue.

**Reconcile:** the wave's result is on the QA issue: done.

**Close out:** failed: `checkpoint: QA wave M failed` brief: the failed steps one line each, the PR comments, and the line `Edit or remove a Blocks merge comment on the PR to change the scope of the next address round`. Passed: `checkpoint: approve merge` brief: the PR URL, the review rounds run, every push-back, the QA waves passed.
