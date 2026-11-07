---
name: mattpocock-to-questionnaire
description: "Turn a question the agent cannot answer alone into a Markdown questionnaire for the person who holds the knowledge, with the recipient and the needed answers taken from the brief. Umka phase variant of mattpocock-skills:to-questionnaire, called by name from umka:run; not for auto-triggering."
origin:
  skill: mattpocock-skills:to-questionnaire
  path: skills/productivity/to-questionnaire
  repo: https://github.com/mattpocock/skills
  version: 1.3.2
  commit: a496f5513d4a4cf889bc48e189e579f4b0bdf6aa
  license: MIT
  adapted: true
---

# To Questionnaire

Turn something the unit cannot answer alone into a **questionnaire**: a Markdown document one person fills in async, or fills out together over a meeting. The recipient holds knowledge the unit lacks; the questionnaire pulls it out of them.

**Grill the send, not the subject.** The two facts about the _send_ (who it goes to, and what is needed back) normally come from an interview. The session is fresh and no human is in it, so they come from the brief instead. The questions in the document then target the **gap** between what the recipient knows and what the unit needs.

## Inputs

The phase item's description: the question as asked, the source's facts, who asked, what a good answer looks like, and who holds the knowledge (the explore phase names them on its first line).

1. **Who is it going to?** Take the recipient's role, expertise, and relationship to the asker from the brief. This fixes the questionnaire's tone and how much context it must carry. The brief names a person but not their expertise: infer it from the source, and write the inference into the Context section as `Assumption:` so the recipient can correct it. The brief names nobody: address it to the person who asked, and say so the same way.

2. **What do you need back?** List the specific decisions or facts the unit cannot resolve alone and needs from this person: what the brief says is missing, and what the unit must be able to do or decide once the answers are in. Done when the list is concrete.

3. **Write the questionnaire.** Draft questions aimed at the gap from steps 1–2, following the Document structure below. Write it to `to-questionnaire-<slug>.md` in the worktree root (slug from the topic) and report the path. Done when the file exists and every item listed in step 2 is covered by a question.

## Document structure

Frame the document as a **discovery questionnaire**: the asker lacks context, the recipient holds it. Order questions most-important-first, since async means you may only get one pass, and group them under `##` headings by theme once there are more than a handful. Write it using the template below.

<questionnaire-template>

# <Questionnaire title>

**Purpose:** why this questionnaire exists and the decision riding on it.

**From:** <the asker>, **To:** <the recipient>, **How your answers will be used:** <where they go>

## Context

One paragraph orienting a recipient who wasn't in the asker's head. Enough to answer well, not a page. Any `Assumption:` about the recipient or the gap goes here.

## How to answer

Deadline and rough effort. Partial answers and "I don't know" are useful: flag anything you're unsure of rather than skipping it.

## <Theme heading>

One `##` section per theme. Under each, its questions, most-important-first. Every question is one idea, never compound, with an answer stub directly beneath, and a one-line _why this matters_ only where the question could be misread or invite a throwaway answer.

<question-example>
### What load is the system expected to handle at launch?

_Why this matters: it decides whether we provision for burst traffic now or defer it._

>
</question-example>

## Anything else?

A closing catch-all: anything we didn't ask that we should know?

</questionnaire-template>

## Output

The file path, and the list from step 2 with the question that covers each item.
