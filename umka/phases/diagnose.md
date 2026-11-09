---
phase: diagnose
mode: afk
skill: umka:mattpocock-diagnosing-bugs
from: [source, intake, explore]
to:
  - phase: pr
    when: the fix is green
  - phase: grill
    when: the finding is a design question or a large fix
  - phase: answer
    when: the finding is not a bug or no loop
artifact: the ticket comment in the shape below is on the source ticket, with the fix commits pushed, or its first line is a finding
budget: 300k
---
# diagnose

**Input:** the bug report in this item's brief; the source ticket from the epic's `external_ref`.

**Run:** `/umka:mattpocock-diagnosing-bugs` on the bug report. Human absent: the run is **headless**, each point where the skill turns to the user becomes a line in the ticket comment and the run goes on with the skill's own ranking; the skill's option 10 needs a human's clicks, so it is `No loop`. Human present: the skill runs as written.

- **Size the fix** once the cause is named, before the regression test. `small`: one change in one place, the red test covers it. `medium`: several files, a data change or a migration; the suite covers the rest. `large`: the `Large fix` finding.
- **Commit the red test alone** before the fix, message `test: reproduce <ticket>: <symptom>`. No correct seam: commit the feedback loop under `scripts/debug/<ticket>/` as the red signal, with a `Seam: none; <why>` line in the comment.
- **Fix at the cause:** the callee for a callee bug, the race for a race, the smallest change that removes it.
- **Checks:** the project's checks, every one green. Another test red on the default branch already: an `Unrelated red: <test>, red on <default branch> at <sha>` line in the comment, the test untouched. Red only on the branch: the fix broke it, so the fix changes.

Four **findings** end the run early. Each is the first line of the ticket comment, with its evidence under it:

- `No loop: <what was tried, one line each; what a human must supply>`, from the skill's "cannot build a loop" stop.
- `Not a bug: <the pointer that asks for this behaviour>`: the spec, the docs, an ADR or an existing test asks for what the loop shows.
- `Design question: <the two behaviours and the evidence for each>`: the cause is a decision nobody took and the spec does not choose, or the fix contradicts an ADR, the ADR being one of the two.
- `Large fix: <the cause; the interface it changes; who depends on it>`: the fix changes a design or an interface other code depends on.

The ticket comment when the run reaches the fix:

```
Cause: <one sentence: the code and the condition; the hypothesis that held>
Reproduction: <test path>, run with `<command>`, red at <sha>
Fix size: small | medium. <reason, one sentence>
Commits: <sha> <subject>, one per line
Checks: <each check run, green>
Hypotheses: <the ranked list as it stood before testing, held or fell>
```

**Done when:** the comment in that shape is on the ticket with its commits pushed and every check green, or its first line is a finding with the evidence under it.

**Reconcile:** the comment exists: done. Fix commits exist and no comment: post the comment only. The red test exists and no fix commit: run the skill from its Phase 5 step 3 with the committed test as the red signal.

**Close out:** the close reason is the comment's first line. A `grill` brief: as the **Brief** in `grill.md` says, the finding as the question. An `answer` brief: the finding with its evidence; `No loop` names what the reporter must supply, so the reply asks for it.
