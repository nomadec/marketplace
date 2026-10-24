---
phase: address
mode: afk
skill: addressing-pr-comments
from: [decide-blocking, qa-failed, approve-merge]
to:
  - phase: review
    when: commits were pushed and the round is below 3
  - phase: qa-plan
    when: commits were pushed, or no QA wave has passed yet
  - phase: approve-merge
    when: nothing was pushed after a passed wave (the checkpoint is already there and waits)
artifact: the PR has no open thread without a reply, and no Blocks merge thread stays open without a push-back
budget: 100k
---
# address

An **open thread** is an unresolved review thread on the PR, whoever opened it: a human, this loop's `review`, or another review bot. The opener never changes the handling; the thread's words do. Count them with `gh api graphql` on `reviewThreads(first: 100) { nodes { isResolved } }`.

**Input:** the PR URL from the epic's `pr:` note; its open threads.

**Run:** `/addressing-pr-comments <PR URL>` (a PR that is not on GitHub: read and answer the threads as the repo's tracker doc says under "Pull requests") with this scope, every open thread: one marked **Blocks merge**, or asking for a change the spec or a documented standard backs, gets the fix, or a push-back with evidence; any other gets the fix when it is trivial, else a one-line reply. Resolve each thread you fixed or replied to; a push-back stays open for its opener.

**Done when:** every open thread has a reply, and no **Blocks merge** thread stays open without a push-back.

**Reconcile:** no open thread without a reply: done.

**Close out:** commits pushed and this is round 1 or 2: `review round N+1` is laid and `qa plan wave M` is blocked by it too. Round 3 with commits pushed: `qa plan wave M` only. Nothing pushed after a passed wave: nothing new; the `approve merge` checkpoint behind this item is next, and its brief carries the push-backs.
