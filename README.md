# nomadec/marketplace

A Claude Code plugin marketplace. One plugin today: `umka`, the delivery loop.

## Install

```
/plugin marketplace add nomadec/marketplace
/plugin install umka@marketplace
```

Or from a terminal:

```sh
claude plugin marketplace add nomadec/marketplace
claude plugin install umka@marketplace --scope user
```

Then `/umka:run` works in any new session. See `umka/README.md` for the loop, its home, and the `queue` script a timer calls.

## Plugins

| Plugin | What it is |
| --- | --- |
| [`umka`](umka/README.md) | The delivery loop: a unit of work is a beads epic, one child per phase; a turn is one phase in one fresh session; checkpoints are closed by a human. Skills `run` and `findings`, a `Stop` hook that keeps a turn alive while its background work runs, and `queue`, the `umka tick` / `umka intake` / `umka inbox` script for a timer or a terminal. |

## Local T3 Code setup

Use `scripts/setup-umka-t3code check`, then `apply` and `verify`, to configure an
Umka instance for an existing local T3 installation. `smoke` runs one isolated
AFK phase in a real T3 thread. The generated `~/.umka/bin/umka-t3` command provides
`schedule-install`, `enable`, `disable`, `tick`, and `inbox-open`. Two timer jobs,
launchd on macOS or systemd user timers on Linux, check work and the per-item inbox
every 10 seconds; empty checks do not invoke an agent. Run `~/.umka/bin/umka-t3 intake [--dry-run]` manually to
import source items and classify them in a fresh T3 thread. The terminal
`~/.umka/bin/umka inbox` also remains available. See [the setup guide](docs/setup/umka-t3code.md)
for prerequisites, repeated runs and current limits, and
[the observation log](docs/setup/T3-LOCAL.md) for test results.

## Develop

```sh
npm test
claude plugin validate umka
```
