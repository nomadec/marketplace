---
name: mattpocock-prototype
description: "Build a throwaway prototype on a throwaway branch to answer the design question in the phase brief, with the human in the session reacting to it and giving the verdict. Umka phase variant of mattpocock-skills:prototype, called by name from umka:run; not for auto-triggering."
origin:
  skill: mattpocock-skills:prototype
  path: skills/engineering/prototype
  repo: https://github.com/mattpocock/skills
  version: 1.3.2
  commit: a496f5513d4a4cf889bc48e189e579f4b0bdf6aa
  license: MIT
  adapted: true
---

# Prototype

A prototype is **throwaway code that answers a question**. The question decides the shape.

The question is the design question in the phase item's brief; the source ticket is the epic's external ref. The human is in the session: they react to the prototype, and the verdict is theirs, not yours.

## Pick a branch

Identify which question is being answered, using the brief, the surrounding code, or by asking the human:

- **"Does this logic / state model feel right?"** → [LOGIC.md](LOGIC.md). Build a single shareable HTML file (free-play buttons plus tabbed guided walkthroughs) that pushes the state machine through cases that are hard to reason about on paper, and that a non-developer can drive.
- **"What should this look like?"** → [UI.md](UI.md). Generate several radically different UI variations on a single route, switchable via a URL search param and a floating bottom bar.

The two branches produce very different artifacts, so getting this wrong wastes the whole prototype. If the question is genuinely ambiguous and the human isn't reachable, default to whichever branch better matches the surrounding code (a backend module → logic; a page or component → UI) and state the assumption at the top of the prototype.

## Rules that apply to both

1. **Throwaway from day one, and clearly marked as such.** Locate the prototype code close to where it will actually be used (next to the module or page it's prototyping for) so context is obvious, but name it so a casual reader can see it's a prototype, not production. For throwaway UI routes, obey whatever routing convention the project already uses; don't invent a new top-level structure.
2. **Trivial to run.** A UI prototype starts from one command in the project's task runner: `pnpm <name>`, `python <path>`, `bun <path>`, etc. A logic demo is a single HTML file the user double-clicks. Either way, no thinking required to start it.
3. **No persistence by default.** State lives in memory. Persistence is the thing the prototype is _checking_, not something it should depend on. If the question explicitly involves a database, hit a scratch DB or a local file with a clear "PROTOTYPE, wipe me" name.
4. **Skip the polish.** No tests, no error handling beyond what makes the prototype _runnable_, no abstractions. The point is to learn something fast.
5. **Surface the state.** After every action (logic) or on every variant switch (UI), print or render the full relevant state so the user can see what changed.
6. **Capture it when done.** The prototype lives on a **throwaway branch** off the unit's branch, out of the default branch, from the first commit. When the human gives the verdict, capture it (the verdict and the question it settled) as a comment on the source ticket, or in the close reason when there is no ticket, with a pointer to the throwaway branch as the **primary source**. Fold any validated decision into the real code only when a later phase asks for it; the prototype itself stays on its branch.
