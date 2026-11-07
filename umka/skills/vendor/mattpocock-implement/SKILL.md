---
name: mattpocock-implement
description: "Implement one ticket on the unit's branch test-first, run the review, and commit, with every input taken from the ticket and the spec and nothing asked mid-run. Umka phase variant of mattpocock-skills:implement, called by name from umka:run; not for auto-triggering."
origin:
  skill: mattpocock-skills:implement
  path: skills/engineering/implement
  repo: https://github.com/mattpocock/skills
  version: 1.3.2
  commit: a496f5513d4a4cf889bc48e189e579f4b0bdf6aa
  license: MIT
  adapted: true
---

# Implement

Implement the work described in the ticket the argument names. The session is fresh and no human is in it: the ticket, the spec it belongs to, and the brief of the phase item are the whole input. Nothing is asked mid-run; every choice the inputs leave open is taken and recorded in the output.

## Inputs

- **The ticket.** The argument is a ticket reference (URL or id). Fetch it from the issue tracker as the repo's `docs/agents/issue-tracker.md` says, read its full body and comments, and state its title before starting. A reference that resolves to nothing or to more than one ticket: stop, and say which in the output; do not guess.
- **The spec.** The ticket's parent issue, when it has one. Its Implementation Decisions and Testing Decisions bind this work; its Out of Scope bounds it.
- **The branch.** The current branch of the worktree is the unit's branch. Record the `HEAD` sha before the first change: the review at the end runs from it.
- **Vocabulary.** Read `GLOSSARY.md` when the repo has one, so names in code and tests match the project's domain language, and respect ADRs in the area you touch.

## Seams

Tests go at **seams**: the public boundaries where behaviour is observed without reaching inside. Test only at pre-agreed seams. They are pre-agreed here when:

1. the spec's Testing Decisions name them, or
2. the ticket's acceptance criteria imply them.

When neither does, choose the highest existing seam that covers the ticket's behaviour (prefer existing seams to new ones, and the fewest), and record the choice and what it misses in the output, so the review and the human see it.

## The loop

Work test-first, one tracer bullet at a time:

1. **Red.** Write one failing test at a pre-agreed seam, for one acceptance criterion or one slice of it. Run that single test file and watch it fail for the right reason.
2. **Green.** Write only enough code to pass it. No speculative features, no anticipation of the next test.
3. Run the typecheck and the test file again. Both pass: commit to the current branch with a message that names the ticket.
4. Next slice. Repeat until every acceptance criterion has a test that proves it.

A good test reads like a specification of behaviour through the public interface and survives a refactor. Avoid:

- **Implementation-coupled** tests: mocks of internal collaborators, private methods, assertions through a side channel. The tell: the test breaks on a refactor that changed no behaviour.
- **Tautological** tests: an expected value computed the way the code computes it. Expected values come from an independent source: a known-good literal, a worked example, the spec.
- **Horizontal slicing**: all tests first, then all code. One test, one implementation, repeat.

Refactoring is not part of the loop; it belongs to the review step below.

## Verification

Run typechecking regularly and single test files regularly during the loop. Run the full test suite once at the end; it is green before the review starts.

## Review

Call the Skill tool with `umka:mattpocock-code-review`, with the sha recorded under Inputs as the fixed point. Fix every finding it reports, re-run the affected tests and the typecheck, and commit the fixes to the current branch. A finding that needs a product decision cannot be taken here: leave the code as it is and list the finding in the output under open questions.

## Output

Commit all work to the current branch. End with a short report the phase posts on the ticket:

- what was built, one line per acceptance criterion with the test that proves it,
- the commits (sha and subject),
- how it was verified (typecheck, test files, full suite),
- the seams chosen and the assumptions taken, when the inputs left any open,
- open questions from the review, when any.
