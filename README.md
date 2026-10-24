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

## Develop

```sh
npm test
claude plugin validate umka
```
