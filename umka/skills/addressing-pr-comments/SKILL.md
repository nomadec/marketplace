---
name: addressing-pr-comments
description: "Work through every open review thread on a GitHub pull request with the gh CLI, unattended: fix what the spec or a standard backs, push back with evidence, reply to the rest, resolve what you handled, then report per thread. Used by the umka:run phase address; called by name, not for auto-triggering."
origin:
  source: ~/.claude/skills/addressing-pr-comments
  author: nomadec
  adapted: true
---

# Addressing PR review comments

The input is a PR URL and the checkout of its branch. The output is a PR with no open thread without a reply, commits pushed when threads asked for a change, and a report of one line per thread. No human is in the run: a thread that needs a product decision gets a reply that names it, not a question.

An **open thread** is an unresolved review thread, whoever opened it: a human, the loop's own review, another bot. The opener never changes the handling; the thread's words do.

Copy this checklist and track progress:

```
- [ ] 1. Gather every open thread on the PR
- [ ] 2. Triage each thread into its bucket: fix / push back / reply
- [ ] 3. Make the code changes, with tests
- [ ] 4. Run the project's checks
- [ ] 5. Commit and push
- [ ] 6. Reply to every thread; resolve the ones you handled
- [ ] 7. Report the outcome per thread
```

## 1. Gather feedback

Check out the PR branch when not on it: `gh pr checkout <number>`.

Feedback lives in three places; collect all of them:

- Review bodies and top-level comments: `gh pr view <number> --json title,url,reviews,comments`
- Inline review threads, through GraphQL, since REST cannot see resolution state:

```bash
gh api graphql -F owner='{owner}' -F repo='{repo}' -F pr=<number> -f query='
query($owner:String!, $repo:String!, $pr:Int!) {
  repository(owner:$owner, name:$repo) {
    pullRequest(number:$pr) {
      reviewThreads(first:100) {
        nodes {
          id isResolved isOutdated path line
          comments(first:50) {
            nodes { databaseId author { login } body url }
          }
        }
      }
    }
  }
}' --jq '.data.repository.pullRequest.reviewThreads.nodes | map(select(.isResolved | not))'
```

Keep each thread's `id` (to resolve it) and the first comment's `databaseId` (to reply to it).

## 2. Triage

The loop's review sorts findings into two buckets, and a thread shows its bucket in its first words: **Blocks merge** opens a thread; **Does not block** stays in the review body. A thread from anyone else is read for the same two things. For each open thread decide one of:

- **Fix.** The thread is marked **Blocks merge**, or it asks for a change the spec or a documented standard (the repo's standards doc, its GLOSSARY, an ADR) backs. Plan a code change.
- **Push back.** The thread is marked **Blocks merge** or backed by the spec or a standard, and you have a concrete, evidence-based reason not to change: the spec line, the ADR, the test that shows the concern does not apply. Reply with the evidence; do not resolve. A push-back stays open for its opener.
- **Reply.** Any other thread: the fix when it is trivial (one line, no behaviour change, under a minute), else a one-line reply that says what you did or why not. A thread that implies a product or scope decision gets a one-line reply that names the decision and a recommended answer; it is not guessed and not fixed.

Never skip a thread. Treat `isOutdated: true` threads as live unless the code shows the concern is gone.

## 3 and 4. Fix and verify

Group related threads into coherent changes. Match the repo's conventions; update or add tests when behaviour changes. Run the project's checks: typecheck, the affected test files, the full suite once at the end.

## 5. Commit and push

One commit per logical fix, or one commit for a small round, its message naming the review point it addresses. Push to the PR branch. Nothing to fix: nothing is committed, and the report says so.

## 6. Reply and resolve

Reply on each inline thread, targeting the thread's first comment `databaseId`:

```bash
gh api repos/{owner}/{repo}/pulls/<number>/comments/<databaseId>/replies \
  -f body='Fixed in <short-sha>: <one-line summary>'
```

Resolve every thread you fixed or replied to:

```bash
gh api graphql -f query='
mutation($id:ID!) { resolveReviewThread(input:{threadId:$id}) { thread { isResolved } } }' \
  -f id='<thread_id>'
```

A push-back stays unresolved; its opener closes it. Answer review-body or top-level feedback with one summary comment: `gh pr comment <number> --body '...'`. Follow the repo's conventions for agent-posted comments (`docs/agents/`, the tracker doc's "Pull requests" section).

## 7. Report

One line per thread: `path:line: <what the reviewer asked>: fixed in <sha> | pushed back: <evidence, one phrase> | replied: <one phrase>`. Then one line: `Pushed: <n> commits` or `Pushed: nothing`. Then the push-backs again, one line each, as the evidence a human reads when they decide the merge.
