# Umka with T3 Code: local setup

`scripts/setup-umka-t3code` configures an Umka instance for an existing T3 Code
installation. Umka's queue, phase registry and beads home remain independent of
T3. The script is a Node executable invoked from a shell; it has no npm dependencies.

The layers remain separate: bos, T3 Code, Umka with a runtime, channels, and UI.
This is the local Umka layer. It does not install a T3 service or configure Slack.
`apply` installs both CLI wrappers. Two timer jobs, launchd on macOS or systemd user
timers on Linux, are installed and enabled explicitly through `umka-t3`, so reapplying
setup never changes an existing schedule's state.

## Prerequisites

- macOS with a logged-in desktop session (user LaunchAgents), or Linux with a
  systemd user session. On a server, enable lingering for the user
  (`loginctl enable-linger USER`) so the timers and T3 survive logout.
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

## Schedule deterministic checks with launchd or systemd

For the default home:

```sh
~/.umka/bin/umka-t3 tick --dry-run
~/.umka/bin/umka-t3 schedule-install
~/.umka/bin/umka-t3 schedule-status
~/.umka/bin/umka-t3 enable
```

`schedule-install` picks the backend from the host OS. On macOS it writes two user
LaunchAgent plists under `~/Library/LaunchAgents`. On Linux it writes a oneshot
service and a timer per job under `~/.config/systemd/user` (or `$XDG_CONFIG_HOME`),
then runs `systemctl --user daemon-reload`. Labels are instance/home-specific. Both
jobs default to **10 seconds**:

- `tick`: selects and launches at most one autonomous phase in a fresh T3 thread.
- `inbox-open`: opens one conversation per ready, briefed human item that does not
  already have a conversation. A phase thread that posted the brief is reused.

Neither check invokes a model when there is nothing to dispatch. There is no
scheduler chat or shared inbox chat. Checks run directly as Node processes;
the service manager supplies the timer. A check may take longer than ten seconds;
neither launchd nor systemd overlaps invocations of the same job. The jobs share a
runtime lock, and briefly retry live lock contention so simultaneous timer firings
can both run.

First installation is disabled. `enable` loads both jobs and checks immediately;
they run again at the interval while you remain logged in, or while lingering is
enabled on Linux. Reinstalling preserves the enabled intent and does not reload
unchanged jobs. Use
`schedule-install --every-ms 10000` to select the interval explicitly. The value
must be a positive whole number of seconds, expressed in milliseconds.

`disable` persistently disables and unloads both jobs, including across login, without interrupting a T3 phase already launched.
On Linux, `enable` and `disable` map to `systemctl --user enable --now` and `disable` plus stop;
when run from a shell without a user bus, such as `sudo -iu`, the adapter points
`systemctl` at `/run/user/UID` itself.
`schedule-run` executes both checks once from the terminal, including while
disabled. `schedule-uninstall` disables and unloads both jobs and removes their
unit files and receipt. These commands affect only this instance's jobs.

The units use the absolute Node executable and bind the instance home and project.
Installation captures PATH because service managers do not load interactive shell profiles.
Reinstall after moving the checkout, changing Node installations, or changing the
PATH needed by beads/T3 and their dependencies.

A durable launch journal prevents overlapping managed phases and duplicate threads
after a crash. Unknown launch outcomes, failed phase threads, and autonomous phases
that finish without recorded progress stop dispatch for inspection. Existing
in-progress beads items also block autonomous execution. Do not co-run terminal
queue ticks against the same home.

Inspect the bounded status files (one latest result or error, overwritten each check):

```sh
cat ~/.umka/t3code/tick-status.json
cat ~/.umka/t3code/inbox-open-status.json
```

`schedule-status` reports whether each job is installed and loaded; `launchd.json`
on macOS, or `systemd.json` on Linux, records configuration and enabled intent. Quiet scheduled checks write no terminal
or chat messages. They do not grow an idle/error log.

### Migration from the native T3 timer

On an existing installation, `schedule-install` disables the native timer recorded
in `t3code/schedule.json` before writing the new jobs. If T3 is unavailable, that
operation fails, or the recorded task is not found in this T3 base dir, installation
stops; disable the task where it lives, then delete `t3code/schedule.json` to
continue. It leaves unrelated schedules alone. An
already-running native scheduler turn is not cancelled; shared dispatch locking
still prevents duplicate work. Old scheduler and shared inbox chats remain as
history; the new jobs never refresh or append to them.

The migration alone uses T3's protocol-2 schedule API with a short-lived,
revoked-after-use local orchestration session. Normal launchd checks use the
existing T3 CLI, never T3's database or an agent-backed scheduler.

The host must be awake and T3 must be running to launch/read threads. While T3 is
unavailable, checks report failures in their status files. Read failures retry
on later intervals; a failed launch has an uncertain outcome and requires inspection
before dispatch resumes.
This setup does not keep a Mac awake; a Linux host with lingering and the T3
service provides always-on dispatch.

## Use the per-item inbox

The launchd inbox job discovers waiting items automatically every ten seconds.
Open the individual `Umka local: ITEM_ID TITLE` threads in T3 and reply to each
question there. You no longer need to say “refresh my inbox” in a shared chat.
To dispatch immediately, run `~/.umka/bin/umka-t3 inbox-open` from a terminal.
An empty inbox creates no threads. Repeated checks reuse the persisted item/thread
mapping in `t3code/inbox-items.json`, without sending refresh messages.

For a checkpoint or a reply-form decision, the thread records your explicit answer
through `umka-t3 answer ITEM_ID --file PATH`. The next tick applies it in a fresh
phase thread. Interactive phases, such as grill, continue in that item's thread;
before doing phase work, the agent reserves the runner through `inbox-resume ID`.
If another managed phase is active, it asks you to retry when that phase finishes.
Simply waiting for your first reply does not occupy the autonomous worker slot.

`umka-t3 inbox` prints waiting items and known phase thread IDs without prompting.
`umka-t3 work ITEM_ID` remains a manual way to start an attended phase. Prefer the
already-open item thread to keep its human conversation together. Some checkpoints
also require edits to proposals, questionnaires, or downstream briefs; follow the
item-specific instructions before answering. Stale or no-longer-ready answers are
rejected. Uncertain launches require inspection, never automatic duplication.

The terminal `~/.umka/bin/umka inbox` is still available on demand. It uses readline
and terminal Claude for conversational phases; launchd never runs it.

## Run intake manually

```sh
# Preview new source items without importing or advancing cursors.
~/.umka/bin/umka-t3 intake --dry-run

# Import new items and start one fresh T3 classification thread.
~/.umka/bin/umka-t3 intake
```

Intake reads this instance's `sources.json` and `cursors.json`. It supports GitHub
issue sources (`kind: github`, `repo: owner/repo`) and JSON Lines file sources
(`kind: file`, absolute `path`). Each source needs a unique `name`; optional
`repo_key` names its checkout in `repos.json`. GitHub polling requires authenticated
`gh` and reads up to 200 issues per invocation in creation order. File entries
need `id` and `title`; `text`, `who`, and `created` provide the brief's details.
With no cursor, intake considers existing source history as well as recent items;
use the dry run to inspect the initial import.

When new items exist, intake creates one beads epic per external reference and
starts one fresh T3 thread for the batch, invoking `umka:run intake IDS afk`.
The classification phase creates or extends sort items and lays bug pre-work.
The existing tick and inbox jobs handle later phases and human conversations.
No new items means no model invocation and no thread. **Intake is manual only**;
no launchd job is installed for it.

Intake uses the same runtime lock and active-turn journal as tick. If a managed
phase or a manually claimed item is active, it reports `busy` without importing;
run it again after the phase completes. A dry run can preview sources while busy.
The dispatcher checks classification artifacts before releasing a completed intake
turn; incomplete or failed classification stops further work for inspection.

`t3code/intake.json` preserves a pending import batch across interruptions. Imported
epics are reconciled by external reference before retrying, and cursors advance
only after the batch's imports and notes are saved. Lost T3 launch responses stop
for inspection through `t3code/runner.json`, rather than launching duplicates.
Do not run the terminal `umka intake` concurrently against this home: that command
still starts terminal Claude and does not share the T3 runtime lock.

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

The fixture creates one already-briefed checkpoint and opens its per-item thread.
Answer that synthetic checkpoint there. Run a T3 tick and verify the exact answer, the `applied` label, and one successor phase. Do not execute the successor.

## Remaining rollout checks

Test a colleague's installation, including binary installation, phase skills,
credentials and repo toolchains. Exercise a real T3 restart on a test machine,
then add the bos deployment layer. The installed plugin's original `umka tick`
continues to launch terminal Claude; use `umka-t3 tick` for T3 execution.
Source polling is available through manual `umka-t3 intake`; it is not scheduled. A new request can be started directly with `/umka:run <source>`.
