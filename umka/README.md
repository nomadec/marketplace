# Umka plugin

Install: `/plugin install umka@marketplace` after `/plugin marketplace add nomadec/marketplace`.

Umka is a delivery loop. A **unit** of work is a beads epic with one child per **phase**.
A **turn** works one phase of one unit in one fresh session, closes out, lays the next
phases and stops. Checkpoints are closed by a human. The plugin holds three layers:

| Layer | Folder | What it is |
| --- | --- | --- |
| Skills | `skills/` | The library. Every skill is callable as `umka:<name>`. Unprefixed names are Umka's own; `vendor/<author>-<name>` are forks of third-party skills, adapted to run inside a phase, with their origin in the frontmatter and `NOTICE.md`. |
| Phases | `phases/` | The assembly. One file per phase: its mode, the skill it runs, where it comes from, where it goes, the artifact it must leave. `phases/registry` lints it, draws it and lists every journey. |
| Runtimes | `runtimes/` | What starts a turn without a human typing. `terminal/` runs `claude` from a timer; `t3code/` runs T3 Code threads. Both share `lib/`. |

`skills/run` is the loop's entry: `/umka:run <item id>`, `/umka:run <source>`, or the
`afk` forms a runtime sends. `skills/findings` shapes the links and facts a conversation
hands over with a request. `hooks/stop-guard.mjs` keeps a turn alive while a background
task it started still runs.

## Skills

Prefix means provenance. `umka:explore` is Umka's own. `umka:mattpocock-to-spec` is a
fork of `mattpocock-skills:to-spec`. A fork keeps the upstream voice and records
`origin:` (upstream id, repo, version, commit, license, whether it was adapted). The
forks exist so that an unattended phase can invoke them through the Skill tool and so
that an install of this plugin depends on nothing outside it. Each fork's description
says it is the Umka phase variant and is called by name, so it does not auto-trigger
beside the upstream skill when both are installed.

The boundary between a skill and a phase: the skill owns how to do the job given its
inputs; the phase owns where the inputs come from, the artifact, and what comes next.

## Phases

A phase file's frontmatter:

| Key | Value |
| --- | --- |
| `phase` | the slug, equal to the file name |
| `mode` | `afk` (no human), `hitl` (a human in the session), `checkpoint` (a human closes it, or its `auto-close when` rule does) |
| `skill` | `umka:<name>`, `human`, or `tool: <command>` |
| `from`, `to` | the edges, with a `when:` on each conditional edge |
| `artifact` | what must exist when the phase is done |
| `budget` | the token budget of an `afk` phase |
| `ask` | what a checkpoint's brief must show |
| `rounds` | the most times a unit may re-enter this phase, required on one phase of every cycle |

```sh
node umka/phases/registry lint    # every error, exit 1 on any
node umka/phases/registry graph   # Mermaid flowchart
node umka/phases/registry paths   # entries, terminals, every journey, every cycle
```

## Runtimes

See `runtimes/README.md` for the contract a runtime keeps and the two runtimes that
ship. The home of an instance is `$UMKA_HOME`, `~/.umka` by default: the beads
database, `repos.json`, `sources.json`, `cursors.json`.

## Requirements

- Node 22.3 or later.
- `bd` (beads) and `gh`, signed in to an account that reads and writes the issues and
  pull requests of the repositories in `repos.json`.
- `claude`, for the terminal runtime; a local T3 Code, for the T3 runtime.

## Layout

```
umka/
├── .claude-plugin/plugin.json
├── NOTICE.md                 upstream attribution of every fork
├── skills/
│   ├── run/                  the loop entry
│   ├── findings/
│   ├── explore/ intake/ answer/ qa-plan/ reproduce/ fix/ addressing-pr-comments/
│   └── vendor/mattpocock-*/  forks of mattpocock-skills
├── phases/                   one file per phase, registry, tests and fixtures
├── lib/                      phases.mjs (the loader), pick.mjs (the pick)
├── runtimes/
│   ├── README.md             the runtime contract
│   ├── terminal/umka         init, tick, intake, inbox
│   └── t3code/               setup, umka-t3, the T3 API client, timers, smoke test
└── hooks/                    the Stop hook
```

`npm test` at the repository root runs every test. `claude plugin validate umka`
checks the manifest.
