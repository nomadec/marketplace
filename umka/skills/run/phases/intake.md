---
phase: intake
mode: afk
skill: none (classes the epics the poll laid)
from: [source]
to:
  - phase: sort
    when: an epic got a topic with no open un-briefed sort item
  - phase: reproduce
    when: an epic has class bug, one per such epic
artifact: every epic the argument names has a topic label, a class note and, for a bug, a reproduce item, and a sort item lists it
budget: 50k
---

# intake

**Input:** the epic ids in the argument, which `umka intake` laid from the sources: title, the item's text ending `Sent by <who> (<source>).`, the external ref, the `channel:` note and, when the source names one, the `repo:` note. The `GLOSSARY.md` of that repo, through `repos.json`, for the topic vocabulary.

**Run:** for each epic: `bd label add $E topic:<term>`, the GLOSSARY term the item concerns, `topic:other` when none fits; `bd note $E "class: <class>"`. The **class**: `bug` (a failure is reported, or a `bug` label), `proposal` (numbered points to build), `spec` (a `ready-for-agent` label), `ticket` (one task against a spec), `question` (asks a fact or a design), else `idea`. A `bug` gets its pre-work: `reproduce` laid under its epic, brief the item's text, with the Budget line.

**Done when:** every epic of the argument has a topic, a class and, for a bug, its `reproduce` item.

**Reconcile:** an epic with a `class:` note is done; a bug without its `reproduce` item gets it.

**Close out:** per topic with new epics: an open `sort: <topic>` item without the `briefed` label gets the new epics appended to its brief; none: lay `sort: <topic>` under the standing `Intake` epic (`bd create "Intake" --type epic -l loop` with the note `channel: cli` when it is not there) with the brief in the shape `sort.md` gives, blocked by an open briefed `sort: <topic>` item when one exists (title `sort: <topic> #N` then). The sort item is briefed by the next tick, not by this turn. Result line: `intake closed: <n> epics classed, <m> sort items laid or extended`.
