---
name: mattpocock_grilling
description: "Grill the human relentlessly about a plan, decision, or idea, one round of numbered questions at a time, with umka:mattpocock_domain-modeling as its companion so GLOSSARY entries and ADRs land on the branch as the design settles. Umka phase variant of mattpocock-skills:grilling, called by name from umka:run; not for auto-triggering."
origin:
  skill: mattpocock-skills:grilling
  path: skills/productivity/grilling
  repo: https://github.com/mattpocock/skills
  version: 1.3.2
  commit: a496f5513d4a4cf889bc48e189e579f4b0bdf6aa
  license: MIT
  adapted: true
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

The source is the item's brief when exploration wrote one, else the epic's source: its external ref, or its description. Run `umka:mattpocock_domain-modeling` alongside this skill for the whole session: challenge terms against `GLOSSARY.md`, sharpen fuzzy language, and write glossary entries and ADRs on the branch the moment they crystallise, not at the end.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Word each question so "yes" accepts your recommended answer.

Each round's frontier carries **product decisions** only, in the register `umka:run` sets: ASD-STE100 Simplified Technical English, in the vocabulary of the repo's `GLOSSARY.md`, short sentences, active voice, each question with its recommended answer. An **engineering decision** the round uncovers is not a question: take it, write it as an ADR on the branch, and list it under the round as one line each, below the questions.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent with a fresh context window to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding; their word to proceed on a proposal is the signal the phase waits for.
