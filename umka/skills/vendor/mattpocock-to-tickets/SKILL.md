---
name: mattpocock-to-tickets
description: "Break a published spec into tracer-bullet tickets, each declaring its blocking edges, and publish them as children of the spec labelled ready-for-agent, with no review round mid-run. Umka phase variant of mattpocock-skills:to-tickets, called by name from umka:run; not for auto-triggering."
origin:
  skill: mattpocock-skills:to-tickets
  path: skills/engineering/to-tickets
  repo: https://github.com/mattpocock/skills
  version: 1.3.2
  commit: a496f5513d4a4cf889bc48e189e579f4b0bdf6aa
  license: MIT
  adapted: true
---

# To Tickets

Break a spec into a set of **tickets**: tracer-bullet vertical slices, each declaring the tickets that **block** it. The session is fresh and no human is in it: the spec and the brief are the whole input, and the human reviews the breakdown at the checkpoint that follows, not here.

## Inputs

- **The spec.** The argument is the spec's reference (URL or id). Fetch it and read its full body and comments. The spec's User Stories give the breakdown; its Implementation Decisions and Testing Decisions shape each ticket.
- **The brief.** The phase item's description; a granularity rule it carries wins over the default below.
- **The tracker.** The issue tracker and its triage label vocabulary come from the repo's `docs/agents/issue-tracker.md`. When the repo has none, publish as local files (step 5) and say so in the output.

## Process

### 1. Gather context

Work from the spec and the brief. Follow every reference the spec makes (ADRs, research, prototype notes) before drafting.

### 2. Explore the codebase

Explore the codebase to understand the current state of the code. Ticket titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

Look for opportunities to prefactor the code to make the implementation easier. "Make the change easy, then make the easy change."

### 3. Draft vertical slices

Break the work into **tracer bullet** tickets.

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests): vertical, NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh context window
- Any prefactoring should be done first

</vertical-slice-rules>

Give each ticket its **blocking edges**: the other tickets that must complete before it can start. A ticket with no blockers can start immediately.

**Wide refactors are the exception to vertical slicing.** A **wide refactor** is one mechanical change (rename a column, retype a shared symbol) whose **blast radius** fans across the whole codebase, so a single edit breaks thousands of call sites at once and no vertical slice can land green. Don't force it into a tracer bullet; sequence it as **expand–contract**. First expand: add the new form beside the old so nothing breaks. Then migrate the call sites over in batches sized by blast radius (per package, per directory), each batch its own ticket blocked by the expand, keeping CI green batch to batch because the old form still exists. Finally contract: delete the old form once no caller remains, in a ticket blocked by every migrate batch. When even the batches can't stay green alone, keep the sequence but let them share an integration branch that all block a final integrate-and-verify ticket; green is promised only there.

### 4. Settle the breakdown

There is nobody to quiz, so the granularity rule decides: one ticket per user story of the spec, unless a story needs two to stay demoable on its own; a prefactor is its own ticket ahead of the stories it eases. Check the result against the three questions a reviewer would ask, and fix what fails before publishing:

- Does the granularity feel right? (too coarse / too fine)
- Are the blocking edges correct: does each ticket only depend on tickets that genuinely gate it?
- Should any tickets be merged or split further?

Record the breakdown in the output as a numbered list; for each ticket, show:

- **Title**: short descriptive name
- **Blocked by**: which other tickets (if any) must complete first
- **What it delivers**: the end-to-end behaviour this ticket makes work

Where the spec left a split open and you chose, add one line `Assumption:` under that ticket, so the human can redraw it at the checkpoint.

### 5. Publish the tickets to the configured tracker

Publish the tickets. **How** depends on the tracker the repo's tracker doc names; the tickets are the same either way, only the shape of the blocking edges changes:

- **Local files** → write one file per ticket under `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in dependency order (blockers first). Each file's "Blocked by" lists the numbers/titles it depends on. Use the per-ticket file template below: one ticket per file, never a single combined file.
- **A real issue tracker (GitHub, Linear, …)** → publish one issue per ticket in dependency order (blockers first) so each ticket's blocking edges can reference real identifiers. Use the platform's native blocking relationship where it has one; otherwise set each ticket's "Blocked by" to the blocking issues. Make each ticket a sub-issue of the spec (tracker doc's operation). Apply the `ready-for-agent` triage label unless the brief says otherwise; the tickets are agent-grabbable by construction.

Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain that means top to bottom.

Do NOT close or modify the spec issue.

End with the list of published tickets: one line each with its URL and its blockers, and the spec URL.

<local-ticket-template>

# <NN>: <Ticket title>

**What to build:** the end-to-end behaviour this ticket makes work, from the user's perspective, not a layer-by-layer implementation list.

**Blocked by:** the numbers/titles of the tickets that gate this one, or "None (can start immediately)".

**Status:** ready-for-agent

- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2

</local-ticket-template>

<issue-template>

## Parent

A reference to the spec issue on the tracker.

## What to build

The end-to-end behaviour this ticket makes work, from the user's perspective, not layer-by-layer implementation.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- A reference to each blocking ticket, or "None (can start immediately)". Omit this section when blockers were set as native edges.

</issue-template>

In either form, avoid specific file paths or code snippets: they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it and note briefly that it came from a prototype. Trim to the decision-rich parts, not a working demo, just the important bits.
