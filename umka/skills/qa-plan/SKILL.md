---
name: qa-plan
description: "Write one QA wave from a diff: a step-by-step verification guide of every behaviour and edge case the diff introduces, grouped by feature area, with concrete inputs and observable expected results. Used by the umka:run phase qa-plan; called by name, not for auto-triggering."
---

# QA plan

The input is the PR URL and the diff to cover: the whole PR for wave 1, the diff since the previous wave's sha for a later wave. The output is one `## Wave M` section in Markdown. No code, no commits: the wave is prose for a human tester.

## Read the diff

`gh pr diff <n>` for the whole PR; `git diff <sha>..HEAD` on the PR branch for the diff since a wave. List each behaviour the diff adds or changes: a route, a control, a validation, a message, a default, a migration, a permission. For each one, write down what a user or a caller can observe, and its edges: empty, maximum, wrong type, no permission, two at once, the path that fails.

The spec says what the change must do; the diff says what it does. The wave covers both: one step per spec requirement the diff claims, one step per edge the code handles. A behaviour the spec asks for and the diff does not touch gets a step too, marked as such, so the tester finds the gap.

## Frame the steps

Frame each step the way the repo is exercised: UI clicks for an app (the screen, the control, the value); test or REPL calls for a library (the function, its arguments); HTTP requests for a service (the method, the path, the body). One action per step. Inputs are concrete: a value, not "a valid value". Expected results are observable: the text on screen, the status code, the row in the table, not "it works".

Group the steps by feature area, in the order a tester walks the product. The setup an area needs (an account, seed data, a flag) is its first step.

## Shape

```markdown
## Wave M

Wave at <sha>. _Changed in this wave: <one line>._

### <Feature area>
1. **Step**: <action with concrete input>
   - **Expected:** <observable result>
```

`<sha>` is the head of the PR branch when the wave is written. Wave 2 and later cover the diff since the previous wave only; a step from an earlier wave returns when this diff changes its behaviour.

## Return

The wave section and nothing else.
