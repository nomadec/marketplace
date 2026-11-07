---
name: mattpocock-implement
description: "Implement a piece of work based on a spec or set of tickets, test-first through umka:mattpocock-tdd, then reviewed through umka:mattpocock-code-review. Umka phase variant of mattpocock-skills:implement, called by name from umka:run; only the two skill names changed. Not for auto-triggering."
origin:
  skill: mattpocock-skills:implement
  path: skills/engineering/implement
  repo: https://github.com/mattpocock/skills
  version: 1.3.2
  commit: a496f5513d4a4cf889bc48e189e579f4b0bdf6aa
  license: MIT
  adapted: true
---

Implement the work described by the user in the spec or tickets.

If the user passes a ticket reference, fetch it from the issue tracker and state its title before starting. If the reference is ambiguous, ask.

Call the Skill tool with "umka:mattpocock-tdd" where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, call the Skill tool with "umka:mattpocock-code-review" to review the work.

Commit your work to the current branch.
