---
name: mattpocock_research
description: "Investigate the question in the phase brief against high-trust primary sources and capture the findings as a Markdown file under docs/research/ on the branch, every claim cited, with what could not be found named. Umka phase variant of mattpocock-skills:research, called by name from umka:run; not for auto-triggering."
origin:
  skill: mattpocock-skills:research
  path: skills/engineering/research
  repo: https://github.com/mattpocock/skills
  version: 1.3.2
  commit: a496f5513d4a4cf889bc48e189e579f4b0bdf6aa
  license: MIT
  adapted: true
---

The question is the one in the phase item's brief, read in full before anything else. No human is in the session: nothing is asked mid-run. Where the question leaves a choice open (which library version, which platform, which reading of an ambiguous term), take the reading the brief and the repo make most likely, and record it in the file under an **Assumptions** heading.

Spin up a **sub-agent** to do the research, with a fresh context window, in the foreground; this turn has nothing else to do while it reads, so wait for its report.

Its job:

1. Investigate the question against **primary sources** (official docs, source code, specs, first-party APIs), not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source. A claim without a source is not a finding: drop it or mark it as a guess.
3. Save it where the repo already keeps such notes; match the existing convention, and if there is none, put it under `docs/research/`, named from the question's slug.

The file answers the question or names what it could not find, with what was tried for each gap. When the findings open a further question, list each one under a **Questions opened** heading, one line each, so the phase can lay an `explore` item per question. Commit the file on the branch; the turn ends with its path.
