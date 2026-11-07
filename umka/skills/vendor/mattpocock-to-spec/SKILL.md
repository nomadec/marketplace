---
name: mattpocock-to-spec
description: "Turn a proposal brief into a spec and publish it to the project issue tracker labelled ready-for-agent, with no interview: the brief is the conversation. Umka phase variant of mattpocock-skills:to-spec, called by name from umka:run; not for auto-triggering."
origin:
  skill: mattpocock-skills:to-spec
  path: skills/engineering/to-spec
  repo: https://github.com/mattpocock/skills
  version: 1.3.2
  commit: a496f5513d4a4cf889bc48e189e579f4b0bdf6aa
  license: MIT
  adapted: true
---

# To Spec

This skill takes a brief and codebase understanding and produces a spec. Do NOT interview anyone; the interview is already done, and the brief holds its result. Synthesize what the brief and the code tell you.

## Inputs

- **The brief.** The phase item's description: the proposal, the problem story, and pointers to the research and ADRs behind them. Read everything it points at. The brief is the scope: a story the proposal does not cover goes under Out of Scope, never into the solution.
- **The source.** The argument carries the source URL (the epic's `external_ref`): the ticket, page or request the unit started from. The spec references it, and the problem is told with the source's evidence.
- **The tracker.** The issue tracker and its triage label vocabulary come from the repo's `docs/agents/issue-tracker.md`. When the repo has none, do not publish: write the spec to `.scratch/<feature-slug>/spec.md`, and say so in the output.

## Process

1. Explore the repo to understand the current state of the codebase. Before writing, read in full every module and test the proposal changes, so the spec states the current behaviour of each path it changes, from the code, not from the proposal. Use the project's domain glossary vocabulary throughout the spec, and respect any ADRs in the area you're touching.

2. Sketch out the seams at which the feature will be tested. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can. The fewer seams across the codebase, the better - the ideal number is one.

   There is nobody to check the seams with: write them into Testing Decisions as decisions, each with one line on what it catches and what it misses, so the human reviews them with the spec.

3. Write the spec using the template below, then publish it to the project issue tracker as the tracker doc says, referencing the source. Apply the `ready-for-agent` triage label - no need for additional triage. End with the spec URL and a coverage table: one row per numbered point of the proposal with the spec section that carries it, then every place the spec widened or narrowed the proposal, one line each.

<spec-template>

## Problem Statement

The problem that the user is facing, from the user's perspective, told with the source's evidence.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature. Every numbered point of the proposal maps to at least one story.

## Current Behaviour

One entry per path the spec changes: what the code does today on that path, read from the modules and tests, so the reviewer and the implementer share the same starting point.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications the brief carries
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

A decision the brief leaves open is taken here, the engineering way, and marked `Assumption:` so the human can overturn it at the checkpoint.

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts, not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- The seams, each naming the existing test file that covers it, or marked `new`
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this spec, including every story the brief raised that the proposal does not cover.

## Further Notes

Any further notes about the feature.

</spec-template>
