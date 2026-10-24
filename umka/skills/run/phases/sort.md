---
phase: sort
mode: hitl
skill: none (the human answers in a word per item)
from: [intake]
to:
  - phase: explore
    when: the answer is now and the class is question, or the answer is ask
  - phase: grill
    when: the answer is now and the class is idea
  - phase: spec
    when: the answer is now and the class is proposal
  - phase: slice
    when: the answer is now and the class is spec
  - phase: implement
    when: the answer is now and the class is ticket
  - phase: reproduce
    when: the answer is now and the class is bug with no closed reproduce item
  - phase: decide-fix
    when: the answer is now and the class is bug with a closed reproduce item
artifact: every epic the brief lists has its answer applied and the sort item is closed with the answers as reason
---
# sort

**Input:** this item's brief: the epics of one topic, numbered.

**Brief** (written by intake, rewritten by the session that posts it, in the Register):

```
<id>: sort <topic>
<n> items wait for your word.
1. <epic title> (<link>). Evidence: <the close reason of a closed pre-work item under the epic, or "none yet">. Recommended answer: <now | later | never | ask>.
2. ...
To answer: umka inbox, then: 1 now, 2 later, 3 never, 4 ask: <words>. A date after later sets the return day.
```

The evidence line comes from `bd list --parent <epic> --all --json`: the `close_reason` of a closed `reproduce`, `research` or `prototype` item, with its id. The recommended answer: `now` for a bug with a reproduced cause, a proposal, a spec or a ticket; `later` for an idea with no evidence; `never` when the item repeats a `.out-of-scope/` entry or the GLOSSARY rules it out; `ask` when the brief cannot say what the item wants.

**Human present** (`/umka:run <this id>`): show the brief, take the answers in the session, apply them.

**Apply** (the answers, from the session or from the close reason the human wrote): per numbered item,

- `now`: lay the first ladder phase under that epic by its `class:` note (the `to:` list above), brief the epic's description, with the Budget line for an afk phase. A bug with a closed `reproduce` item gets `checkpoint: decide fix` with that item's close reason as the brief.
- `later [<date>]`: `bd defer <epic> <date>` (default seven days from now); note `sort: later <date>` on the epic.
- `never`: `bd close <epic> --reason "wontfix: <the human's words, or the recommended reason>"` and write `.out-of-scope/<concept>.md` (the concept in one line, the reason, the link), committed on the default branch.
- `ask: <words>`: lay `explore` under the epic with the words as the question and the epic's description as the facts.

**Done when:** every item has its answer applied.

**Reconcile:** every listed epic has a ladder item, a defer, a wontfix close or an explore item: done.

**Close out:** in a session: `bd close <id> --reason "<the answers, one line>"`. Closed by the human already: nothing to close. Result line: `<id> closed: <the answers, one line>`.
