# Runtimes

A runtime is what starts a turn of `umka:run` when no human types `/umka:run` themselves.
It owns the clock, the session and the channel; it knows nothing of what a phase does.
Everything a runtime needs from the loop is in `../lib`: the registry loader
(`phases.mjs`) and the pick (`pick.mjs`). Everything it needs from the home is on disk
under `$UMKA_HOME`: the beads database, `repos.json`, `sources.json`, `cursors.json`.

## The contract

A runtime provides these four operations. Each starts a fresh session with the
plugin loaded and the skill `umka:run` invoked by name with one argument string;
nothing else is in the prompt but the home and the rules of the session.

| Operation | Argument to `umka:run` | Session | When |
| --- | --- | --- | --- |
| tick | `<item id> afk` | no human | the pick returns an `afk` item that is ready |
| intake | `intake <epic ids> afk` | no human | the sources poll laid new epics |
| brief | none; the runtime shows the item's brief | a human reads | the pick returns a `hitl` item or a checkpoint |
| answer | `<item id>` | the human is present | the human replies to a brief |

Rules every runtime keeps:

- **One turn, one phase.** The session is told to work one phase and stop. The runtime
  never chains phases; the next tick picks again.
- **The pick is shared.** A runtime calls `decide` from `lib/pick.mjs` on a full beads
  dump and the loaded registry; it does not choose on its own.
- **A human's word is data.** The runtime records the human's exact text as the close
  reason or the answer, through `bd`, and the next tick applies it. It never invents an
  answer and never closes a checkpoint itself.
- **Empty checks cost nothing.** A tick or inbox check with no work starts no session.
- **Locks and journals live in the home.** Two runtimes on one home do not run the same
  item at once.

## The runtimes

| Folder | Where the session runs | Entry |
| --- | --- | --- |
| `terminal/` | `claude` in a terminal, `--plugin-dir` pointing at this plugin | `umka init\|tick\|intake\|inbox` |
| `t3code/` | a T3 Code thread, through its API | `umka-t3 tick\|intake\|inbox-open\|inbox-resume\|answer\|schedule-install\|enable\|disable`, set up by `setup check\|apply\|verify\|smoke` |

The terminal runtime is the base: it has no dependency beyond `claude`, `bd` and `gh`,
and a timer can call it. The T3 Code runtime wraps the same operations in threads so a
human answers briefs where the work is shown; its README is the setup guide.

A new runtime is a folder here with the four operations, its own tests, and nothing
imported from a sibling runtime.
