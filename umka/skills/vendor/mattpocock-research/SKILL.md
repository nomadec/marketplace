---
name: mattpocock-research
description: "Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Verbatim copy of mattpocock-skills:research, called by name from umka:run; not for auto-triggering."
origin:
  skill: mattpocock-skills:research
  path: skills/engineering/research
  repo: https://github.com/mattpocock/skills
  version: 1.3.2
  commit: a496f5513d4a4cf889bc48e189e579f4b0bdf6aa
  license: MIT
  adapted: false
---

Spin up a **background agent** to do the research, so you keep working while it reads. Start it with a fresh context window.

Its job:

1. Investigate the question against **primary sources** (official docs, source code, specs, first-party APIs), not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source.
3. Save it where the repo already keeps such notes; match the existing convention, and if there is none, put it somewhere sensible and say where.
