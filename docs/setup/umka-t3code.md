# Umka with T3 Code: local setup

`scripts/setup-umka-t3code` configures an Umka instance for an existing T3 Code
installation. Umka's queue, phase registry and beads home remain independent of
T3. The script is a Node executable invoked from a shell; it has no npm dependencies.

The layers remain separate: bos, T3 Code, Umka with a runtime, channels, and UI.
This is the local Umka layer. It does not install a T3 service or configure Slack.
`apply` installs both CLI wrappers. Scheduling is installed and enabled explicitly
through `umka-t3`, so reapplying setup never changes an existing schedule's state.

## Prerequisites

- Node 22.3 or newer, Git, Claude Code with authentication, and **bd 1.3.1** on PATH.
  The script checks the exact bd version and never upgrades or migrates a database.
  Installing these binaries is currently a prerequisite, not automated by this script.
- A running T3 server or desktop app and its `t3` CLI. The script finds it on PATH,
  then tries `~/.t3/bin/t3`; `--t3` and `--t3-home` select another installation.
- This checkout and the published `umka@marketplace` plugin must agree. `apply`
  installs or refreshes the plugin when necessary, then compares its version and
  file digest with the checkout. Claude's `.in_use` cache marker is excluded.
  Unpublished edits to plugin source deliberately fail this check.
- Real delivery phases also need their named skills (including the mattpocock
  plugin and `addressing-pr-comments`), repo toolchains and tracker authentication.
  The small `answer` smoke test does not certify those dependencies.

Use the same Claude configuration/account that the T3 provider uses. The CLI
plugin check alone cannot establish that; the real T3 smoke test checks the load.

## Configure and verify

From this repository:

```sh
scripts/setup-umka-t3code check --repo app=/absolute/path/to/app
scripts/setup-umka-t3code apply --repo app=/absolute/path/to/app
scripts/setup-umka-t3code apply --repo app=/absolute/path/to/app
scripts/setup-umka-t3code verify
```

The second apply is intentional. It must preserve the database, sources, cursors
and existing repo mappings, and reuse the T3 project. A conflicting repo mapping
fails instead of silently changing the meaning of existing work items.

The default home is `$UMKA_HOME`, or `~/.umka`. To create a separate instance,
pass both `--instance example` and `--home /absolute/path/to/instance` on each call.
An instance name alone does not select a different home. Custom `--t3` and
`--t3-home` options must also be repeated when verifying that installation.

The script creates:

- The beads home and missing config files, through the existing queue initializer.
  An existing `.beads` directory is checked, never reinitialized.
- `bin/umka` inside the home: a shell wrapper that binds the queue to this home.
  It does not edit shell profiles or replace a global `umka` command.
- `bin/umka-t3`: the T3 runtime adapter, with ticks, inbox access and schedule controls.
- `t3code/setup.json`: versions, plugin digest, repo mappings and runtime options.
  The receipt is written only after health and the dry-run pick succeed.
- A T3 project for this checkout, if one is not already registered.

`check` plans without applying configuration. `verify` checks the receipt, plugin,
home files, wrapper, server connectivity, and a dry-run tick. The T3 and beads CLIs
can still update their own internal runtime/cache files during read operations.

An interrupted apply can be rerun. A broken existing database fails with its own
diagnostic; this script never invokes `bd migrate`, reinit, or force flags. Applies
are serialized per home. If a process crashes leaving a lock, its error identifies
the lock directory and recorded PID. Inspect the process and state before removing it.

## Observe a real T3 turn

```sh
scripts/setup-umka-t3code smoke
scripts/setup-umka-t3code smoke-status
```

`smoke` creates a separate beads home under `t3code/smoke/home`, with one epic and
one AFK `answer` item. It starts a fresh T3 thread that invokes `umka:run` through
the Skill tool. The phase replies in the CLI channel and closes its item and epic.
It has no remote tracker, repository changes, or worktree.

`smoke-status` exits 2 while the expected completion is not verified. Inspect
`t3code/smoke/thread.json` for progress or a failure. It passes only when the T3
thread is completed, both beads items are closed, the task has an assignee and
close reason, and the thread contains the `Unit done:` result line.

Retrying `smoke` reuses the recorded thread. A launch with an uncertain outcome
fails for inspection rather than risking a duplicate. After a completed cycle,
use a new name for another real test:

```sh
scripts/setup-umka-t3code smoke --smoke-run cycle-2
scripts/setup-umka-t3code smoke-status --smoke-run cycle-2
```

Named cycles live under `t3code/smoke/runs/NAME`. Fixture IDs, launch intent,
thread ID, original prompt and latest thread response remain there as evidence.
The prompt binds every beads command to the isolated home. This verifies the
agent's behavior; it is not an OS sandbox or a separate credential boundary.

## Schedule T3 turns

For the default home:

```sh
~/.umka/bin/umka-t3 tick --dry-run
~/.umka/bin/umka-t3 schedule-install
~/.umka/bin/umka-t3 schedule-status
~/.umka/bin/umka-t3 enable
```

The interval defaults to five minutes. `schedule-install --every-ms 60000` selects
one minute, the minimum T3 supports. First installation is disabled; reinstalling
preserves the enabled state and reuses the same schedule and scheduler chat.

`disable` pauses future triggers; it does not interrupt a phase already running.
`schedule-run` triggers one check immediately, including while the schedule is
disabled. `tick` also dispatches one check directly from the terminal, with the
work itself still running in a visible T3 thread.

The scheduler chat runs the deterministic dispatcher and stops. When work is
ready, the dispatcher starts one fresh phase thread. A durable launch record
prevents another managed tick from launching during startup or execution. An
unknown launch outcome, failed thread, or completed turn with no recorded progress
stops further launches for inspection. Existing in-progress beads items also block
the dispatcher. This is one managed turn per instance, not a general multi-runner
claim protocol. Do not co-run terminal ticks against the same home.

T3's native timer wakes an agent even for an empty queue. It may leave idle-check
messages in the separate scheduler chat. The inbox chat is refreshed on demand.

Runtime evidence is under `t3code/runner.json`, `schedule.json`, and `inbox.json`.
On an uncertain launch, inspect the named T3 thread and bead before repairing the
journal; never clear it while work might still be running. Setup and schedule
commands use separate locks and report the lock path after an interrupted operation.

The adapter uses T3's native protocol-2 API, verified with T3 0.1.2. Each management
call obtains a five-minute token through `t3 auth session issue`, restricted to
orchestration read/operate, and revokes it afterward. Tokens stay in memory. It
reads the local server's runtime address, requests a WebSocket ticket, and uses
the same schedule RPCs as T3. It never edits T3's database. A protocol/API change
may require updating this adapter. The server is rediscovered on each call.

The Mac must be awake and T3 must be running. This setup does not keep a laptop
awake or provide a 24/7 host. Schedules live in T3; this test did not restart the
user's desktop application. The later bos layer supplies the always-on host.

## Use the inbox

There are two interfaces to the same beads home:

| Interface | Where it runs | How to use it |
| --- | --- | --- |
| Terminal inbox | Your Mac terminal, on demand | `~/.umka/bin/umka inbox` |
| T3 inbox | The `Umka local: inbox` chat | Run `~/.umka/bin/umka-t3 inbox-open` once, then select that chat in T3 |

In the T3 inbox, say **“refresh my inbox”**. It lists waiting items and their
briefs. Reply with an item ID and your decision, for example **“For u-123.2:
approved, keep the proposed scope.”** It records your exact answer in beads.
The next tick applies that answer in a fresh phase thread. No terminal needs to
stay open. The inbox refreshes on request; it is not a Slack notification service.

You can also reply directly in the T3 phase thread that posted a brief. Phases
that need a conversation, such as grill, are opened with `umka-t3 work ITEM_ID`;
the adapter refuses to treat them as simple yes/no approvals. Read any item-specific
instructions before answering: some checkpoints also require edits to a proposal,
questionnaire or downstream brief.

`umka-t3 inbox` prints the waiting items and known thread IDs without prompting.
`umka-t3 answer ITEM_ID --file PATH` records a simple decision from a UTF-8 file;
the inbox chat uses this noninteractive interface. It rejects an item that is no
longer ready or a decision that requires a conversation.

The terminal inbox remains available: it uses readline, closes simple decisions
with their answer, and starts terminal Claude for conversational phases. It exits
when done. It is never run inside a scheduled T3 task.

## Repeat the integration tests

The fixture generators refuse existing directories. Use a new scratch directory
for each cycle; neither fixture refers to production work.

```sh
node scripts/create-t3-repo-test.mjs /absolute/scratch/repo-cycle
/absolute/scratch/repo-cycle/home/bin/umka-t3 schedule-install
/absolute/scratch/repo-cycle/home/bin/umka-t3 schedule-run
```

The fix phase starts with two red Node tests and a local bare Git remote. Verify
the tests pass in the unit worktree and the fix is pushed to that local remote.
Stop after the fix. Its next PR phase is deliberately not executed. Keep its
schedule disabled; `schedule-run` exercises one scheduled check without recurring.

```sh
node scripts/create-t3-inbox-test.mjs /absolute/scratch/inbox-cycle
/absolute/scratch/inbox-cycle/home/bin/umka-t3 inbox-open
```

The fixture starts a checkpoint-brief turn. Once it completes, answer that
synthetic checkpoint in its test inbox chat. Run a T3 tick and verify the exact
answer, the `applied` label, and one successor phase. Do not execute the successor.

## Remaining rollout checks

Test a colleague's installation, including binary installation, phase skills,
credentials and repo toolchains. Exercise a real T3 restart on a test machine,
then add the bos deployment layer. The installed plugin's original `umka tick`
continues to launch terminal Claude; use `umka-t3 tick` for T3 execution.
Source polling is still the separate `umka intake` command and is not scheduled
by this adapter. A new request can be started directly with `/umka:run <source>`.
