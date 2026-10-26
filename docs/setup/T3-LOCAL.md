# Local T3 verification

The native-scheduler results below describe the original implementation. The
current adapter uses two launchd jobs and per-item inbox conversations; see the
setup guide. Updated launchd verification is recorded at the end.

Verified on October 25–26, 2026 with T3 0.1.2, bd 1.3.1, and the unchanged
Umka 0.1.0 plugin. Instance-specific logs and thread IDs remain in the local
test fixtures rather than this public repository.

## Setup and runtime checks

- The installed plugin was refreshed after the marketplace rollback. Its source
  digest matches this checkout; Claude's runtime `.in_use` marker is excluded.
- Two applies and verification preserved the existing beads home and mappings.
  A fresh, independent home also passed apply, repeat apply, and verify.
- Two isolated AFK answer smoke cycles completed through the actual T3 Skill
  tool. Each claimed and closed its task, closed its epic, and reported its result.
- All 32 automated tests pass. Coverage includes interrupted setup, version and
  configuration conflicts, wrapper repair, uncertain launches, managed-turn
  serialization, inbox answers, and idempotent schedule installation.
- Claude's default plugin validation passes. Its separate public-directory checks
  still flag the existing missing license, missing icon, and example listing URL;
  this change does not select a license or change plugin metadata.

## Repository work

The disposable repository fixture used its own beads home, two failing addition
tests, and a local bare Git remote. A native scheduled check launched one fix
phase. It claimed the task, created the unit worktree, corrected subtraction to
addition, passed both tests, appended a tracker note, and pushed to the local
remote. An independent test run passed 2/2. The successor PR phase was created
but never executed.

## Human checkpoint roundtrip

The inbox fixture posted a checkpoint brief and stopped. Its test inbox chat
received the explicit synthetic answer `Approved for the synthetic inbox test
only.` It recorded that exact close reason through the answer helper without
running a tick. A native scheduled check then launched the apply turn, marked
the checkpoint applied, and created one successor. The successor was not run.

## Native scheduling

The CLI has no schedule subcommand. The adapter uses T3's native protocol-2
WebSocket API with short-lived orchestration sessions issued and revoked through
the auth CLI. No database edits or copied credentials are used.

An empty test instance exercised the actual one-minute timer twice. Both runs
succeeded. All setup-test schedules were removed afterward; fixtures and chats
remain available locally as evidence.

At the time of the original test, the live instance's five-minute native schedule
was enabled and its shared T3 inbox chat was available. A final verification found no ready work. The scheduler may leave idle
messages and uses an agent turn on each check. The inbox refreshes on request.

## Remaining rollout checks

The desktop app was not restarted during these tests. Verify restart behavior on
a test machine and repeat installation on a colleague's machine. Binary and
phase-skill provisioning, authentication, and repository toolchains remain
prerequisites. The Mac must stay awake with T3 running; always-on hosting belongs
to the later bos layer.

## Launchd replacement verification (October 26)

- All 43 automated tests pass. New coverage includes empty inbox checks, per-item
  thread deduplication across restarts, existing brief-thread reuse, uncertain
  inbox launches, live lock contention, interactive reservations, and launchd
  installation, persistent enable/disable, migration failures, and uninstallation.
- Both live LaunchAgents pass `plutil -lint`, are loaded with a 10-second interval,
  and have repeatedly exited zero with idle/empty results. Their latest statuses
  are bounded JSON files. The old native T3 timer is confirmed disabled.
- An isolated already-briefed checkpoint opened one per-item T3 conversation.
  Another inbox check returned the same thread without adding a refresh turn.
  A synthetic reply was recorded exactly as its close reason, and a separate
  apply-phase thread completed, marked the checkpoint applied, and laid one successor.
  No test jobs were enabled for this fixture,
  so its successor cannot run automatically.
- Setup verification and default Claude plugin validation still pass. The existing
  public-directory metadata findings above remain unchanged.
