---
name: run
description: "One turn of the delivery loop on a beads unit, in a fresh session: health, pick, reconcile, work one phase, close out, lay the next phases, print the result line, stop."
argument-hint: "an item id (you present), `<item id> afk` (the tick), `intake <epic ids> afk` (the poll), or a source that starts a unit: tracker URL, file path, or free text; optionally `channel: <ref>` after it"
---

# Run

One **turn** is one **phase** of one **unit**, in one fresh session. The unit's **map** is its beads epic: one child per phase, blocking edges, **checkpoint** items a human closes. Knowledge travels through durable artifacts only: the tracker and the repo hold deliverables; beads holds each item's **brief** (its description) and pointers, never a copy.

The **home** is `$UMKA_HOME` (`~/.umka`): one beads database for every repo, reached as `bd -C "$UMKA_HOME"` in every `bd` call of this skill, beside `repos.json` (repo name to local path), `sources.json` and `cursors.json`. The shell command `umka` (`queue` beside this file) starts a turn with no human in it: `umka tick` picks one item and runs `/umka:run <id> afk`; `umka intake` polls the sources, lays an epic per new item and runs `/umka:run intake <ids> afk`; `umka inbox` shows the human each briefed item and records their word as its close reason, for the next tick to apply. A human types `/umka:run <id>` or `/umka:run <source>` themselves.

The **registry** is the `phases/` folder beside this file: one file per phase, its frontmatter the data (`mode`: `afk` runs without a human, `hitl` needs one in the session, `checkpoint` is closed by a human or by its `auto-close when` rule; `from`, `to`, `artifact`, `budget`, `ask`). `registry lint` checks it; `registry graph` draws it. A phase's slug is its file name; an item carries `phase:<slug>`, a checkpoint also `checkpoint`, the epic `loop`.

Which repo a unit lands in is prose in its brief and the epic's `repo:` note; a unit may span repos. The tracker of an item is the one its external ref is in; tracker operations follow `docs/agents/issue-tracker.md` of the repo once the turn has a checkout.

## Register

Everything a human reads (a brief, a result line, a question) is ASD-STE100 Simplified Technical English, in the vocabulary of the repo's `GLOSSARY.md` once the turn has a checkout. Short sentences, one instruction each, active voice. The reader may be Product or the person who raised the request: they act on it without opening the repo. Evidence sits under a one-line pointer, below the text that needs it. A **product decision** goes to the human with a recommended answer. An **engineering decision** the agent takes, records as an ADR, and surfaces as one line.

## 1. Health

`bd -C "$UMKA_HOME" ready --json --brief -n 0 >/dev/null` exits 0, else print the fix its stderr names (no database: `umka init`) and stop. `node <this folder>/registry lint` exits 0, else print its lines and stop.

## 2. Pick

The argument names the item and the **presence**:

- An item id: that item. `afk` after it: the human is absent, the tick started this turn. No `afk`: the human is present, they typed it, `hitl` included.
- `intake <epic ids> afk`: run `phases/intake.md` on those epics, which the poll laid. No item is picked or closed; its **Close out** lays the `sort` items; then the result line.
- Anything else is a **source** that starts a unit. Duplicate check first: `bd list -t epic -l loop --external-ref <source>`, then `--external-contains <ticket key or path stem>`, then `bd search "<three title words>"`. A hit: print each epic with its status and the `/umka:run <epic>` line, and stop. None: lay the epic (`bd create "<title>" --type epic -l loop --external-ref <URL>` or `-d "<text>"`, `bd note $E "channel: <ref or cli>"`, `bd note $E "repo: <name>"` when the source says), then lay the first phase from the rung that fits (a question: `explore`; an idea or handoff: `grill`; a proposal: `spec`; a `ready-for-agent` spec: `slice`; a ticket: `implement`; a bug ticket: `reproduce`) with the source's facts in full as its brief, and pick it.

Read the item with its epic (`bd show <id> $E --json`), then by its state:

- Open, `afk`: claim it (`bd update <id> --claim`; a claim another session holds is theirs: stop with the `busy` result line) and go on to step 3.
- Open, `checkpoint`, with an `auto-close when` rule that holds on the facts in its brief: `bd close <id> --reason "auto: <rule>"`, `bd label add <id> applied`, lay its `to:` per 5.3 and 5.4 when not there yet, the `closed` result line, stop.
- Open, `hitl` or `checkpoint`, human absent: a phase file with a **Before the brief** section runs it first, and it may lay a phase ahead and stop; else brief it (step 6) and stop.
- Open, `hitl`, human present: claim it and go on to step 3. Open, `checkpoint`, human present: show the brief; on their word close it with the word as the reason, `bd label add <id> applied`, lay its `to:` per 5.3 and 5.4 when not there yet, the `closed` result line, stop.
- Closed, `hitl` or `checkpoint`, without the `applied` label: the close reason is the human's word. A `checkpoint`: lay its `to:` per 5.3 and 5.4 when not there yet. A `hitl` item: run the **Apply** section of its phase file with the close reason. Then `bd label add <id> applied`, the `closed` result line, stop.

**Checkout.** A phase that touches a repo works in the unit's worktree for that repo: `<repo path>/.claude/worktrees/<epic id>` on branch `umka/<epic id>`. The repo: the brief and the epic's `repo:` note name it, `repos.json` gives its path. No `worktree:` note for that repo yet: pull the default branch, `git worktree add <path> -b umka/<epic id>`, then `bd note $E "worktree: <repo> <path>"` and `bd note $E "branch: umka/<epic id>"`. A unit across repos gets one worktree per repo. A phase that only reads and writes the tracker needs none.

## 3. Reconcile

Before any work, with the registry's `artifact` line of each phase:

- Each **closed** item this one is blocked by: artifact missing, so `bd update <that id> --status open` and stop with the `reopened` result line (step 6). Nothing is laid on a missing artifact.
- This item: artifact complete, so `bd close <id> --reason "<artifact URL>"`, lay its `to:` per 5.3 and 5.4, and stop with the `closed` result line. Partial: continue from where it stops, as the phase file's **Reconcile** says.

## 4. Work the phase

Read `phases/<slug>.md` and run it to its **Done when**. One phase per turn.

## 5. Close out

In this order:

1. Commit and push the branch when it changed.
2. The tracker update and the epic notes the phase file's **Close out** names.
3. **Lay next.** Read the phase's `to:`. For each entry whose `when` holds (none: always; `per: ticket`: one item per ticket), when no open or closed child of `$E` has that title (an open one already there: `bd dep add <it> <this id>`, so it waits for this item): `bd create "<title>" --parent $E -l phase:<slug>[,checkpoint] -d "<brief>" --deps blocked-by:<this id>`, then `bd dep add <new> <sibling>` for every open sibling whose phase is in the new item's `from:`. The title is the slug with spaces, `checkpoint: ` before it for a checkpoint, a qualifier after it when the phase file names one (`implement: <ticket title>`, `review round N`). The brief: for a checkpoint, what its `ask:` lists, with the facts the auto-close rule reads, in the shape step 6 gives; for a phase, what its **Input** needs, pointers for the rest, ending with `Budget: <budget>. Resume from: <artifact>` for `afk`.
4. **Lay behind each checkpoint.** For each checkpoint laid in 5.3, lay its own `to:` behind it the same way, so a human who closes it by hand needs no agent.
5. `bd close <id> --reason "<artifact URL or what was learned, one paragraph>"`; a `hitl` item also gets `bd label add <id> applied`.
6. The result line (step 6).

## 6. Briefs and result lines

Post to the channel: `cli` prints; another channel gets the same text as a reply. A turn prints two things for the human, the brief when it posts one and the result line, and nothing else; the work's own output stays in tool calls.

A **brief** for a `hitl` or `checkpoint` item is its description, posted once, then `bd label add <id> briefed`. A description that lacks the shape below is rewritten into it first (`bd update <id> -d`), so the item holds what the human read. The shape:

```
<id>: <title>
<What this item is, in one or two sentences.>
<The question for the human, in one sentence.> Recommended answer: <one sentence>.
Evidence: <one line: a path, an id, or a count; the facts the question rests on, after the question, never above it>.
To answer: umka inbox.
```

A `hitl` item ends with the reply form its phase file gives, else with `To work it: umka inbox, or /umka:run <id> with you present.`, instead of the `To answer` line.

Before posting, check each sentence of the brief and of the result line, and rewrite the ones that fail: active voice (the doer is the subject; a sentence with `by <doer>` or with no doer is rewritten); one instruction or one fact; under 20 words; the GLOSSARY term, and none of the words its `_Avoid_` line lists; a question carries its `Recommended answer:`; evidence sits on the `Evidence:` line and nowhere above the question.

The **result line** closes every turn, the same line for the human and for the tick's log, one of:

- `<id> closed: <artifact URL, or what was learned, one sentence>`
- `<id> briefed: <the question, one sentence>`
- `<id> reopened: artifact missing`
- `<id> busy: claimed by <assignee>`
- `<id> waits: <the item laid ahead of it, one sentence>`
- `Unit done: <URL or close reason>`
