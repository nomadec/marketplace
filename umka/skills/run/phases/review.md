---
phase: review
mode: afk
skill: mattpocock-skills:code-review
from: [pr, address]
to:
  - phase: decide-blocking
artifact: a "## Review verdict (round N)" review on the PR with the two buckets
budget: 100k
---
# review

**Input:** the PR URL from the epic's `pr:` note. Fixed point: round 1, the merge-base with the default branch; round N, the `Reviewed at` sha of verdict N-1.

**Run:** `/mattpocock-skills:code-review <fixed point>` on the PR branch, then sort every finding into two buckets. Post the review as the repo's tracker doc says under "Pull requests"; the GitHub form follows. **Blocks merge**: behaviour wrong against the spec, data loss, a security hole, a failing or missing test the spec demands, a documented-standard breach. **Does not block**: smells, naming, style, nits. Post one review carrying the verdict and the blocking findings inline:

```bash
gh api repos/{owner}/{repo}/pulls/<n>/reviews --input review.json
```

`review.json`: `body` is the verdict below, `event` is `REQUEST_CHANGES` when the blocking bucket is non-empty, else `COMMENT`; `comments` is one `{path, line, side: "RIGHT", body}` per **Blocks merge** finding, each body starting with `**Blocks merge**`. The **Does not block** bucket lives in the verdict body only, so it opens no thread; a finding that returns round after round earns a line in the repo's standards doc, which makes it a blocking finding from then on.

```markdown
## Review verdict (round N)

Reviewed at <sha>

### Blocks merge
- `path:line` finding (Standards | Spec)

### Does not block
- `path:line` finding (Standards | Spec)
```

**Done when:** the verdict is on the PR.

**Reconcile:** a `## Review verdict (round N)` exists on the PR: done.

**Close out:** `checkpoint: decide blocking round N` brief: the line `Blocking: none` or `Blocking: <count>`, the line `Open threads: <count>` (the open threads of `address.md`, counted after the verdict is posted), the blocking bucket one line each, and the line `Move a finding between buckets by editing the verdict on the PR`. Behind it: `address round N` when the PR has open threads, else `qa plan wave M` (M is one more than the last wave, 1 at first).
