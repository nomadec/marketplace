# Umka plugin

Install: `/plugin install umka --marketplace nomadec/marketplace`

What the workflows of Umka share, as one Claude Code plugin. It ships the pick and the publish script, which the host runs, the skill `findings`, which the conversation follows at exit 3, and no command.

| Piece             | What it does                                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pick`            | Told the link of the spec issue of the run, prints the next ticket of it, or nothing, when the spec issue is a GitHub issue of the repository, and declines with the exit code 3 when it is a spec issue of another tracker; a stage list names it as `umka:pick` |
| `publish`         | Told the spec issues of the checkout, one pair of arguments per spec issue, the link then the title, ends a workflow: pushes the branch and opens a pull request against the default branch, ready for review, or edits the body of the one open, one section per spec issue; a stage list names it as `umka:publish` |
| `skills/findings` | Shapes the findings a conversation hands to the host with its request: links and facts in one short section, no plan; the conversation prompt names it as `umka:findings` |
| `hooks/stop-guard.mjs` | The `Stop` hook of the plugin: a turn does not end while a background task it started still runs; the hook blocks the stop and names the task, so the session waits for it and closes out after; `hooks/hooks.json` registers it |

## The findings skill

`skills/findings/SKILL.md` is the skill `umka:findings`. The conversation system prompt
of the host names it at exit 3, where the agent writes the request and hands it to the
host with the call `request` of the host tool. The skill shapes the `findings` argument
of that call: one short section of bullets, the links the conversation read first, each
with what it is in a few words, the facts it established about the product after, no
heading, no plan and at most ten bullets under 10000 characters. A conversation that
found nothing hands over no findings. The host stores the findings with the request,
shows the request and not the findings in the thread, and when the button of the
request is pressed sends the first stage the request text and then the findings under
the heading `## Findings`, so the grill does not search again for what the conversation
found.

## The pick

`pick` is an executable file in the root folder of the plugin. The host runs it in the
container of a thread before each repeat of a repeat stage, with the writable checkout as
its working directory and one argument, the link of the spec issue of the run: the newest
spec issue the workspace holds under the repository of the checkout, which the spec stage
handed the host through the host tool `spec`. It runs in a terminal the same way, from
the checkout:

```sh
/path/to/umka/umka/pick https://github.com/acme/app/issues/10
```

The pick reads no file for the spec issue. The link is a GitHub issue of the repository
when it is the address of the repository, as `gh repo view --json url` prints it,
followed by `/issues/` and the number of the issue, as `https://github.com/acme/app/issues/10`
in the repository `acme/app`; the pick asks `gh` for the address once. Any other link,
such as `https://example.atlassian.net/browse/CORE-5940`, or a link of an issue of
another repository or of a pull request, is no case of the pick, which reads GitHub
Issues of the repository and nothing else: it declines with the exit code 3, prints
nothing and says on the standard error "pick: the spec issue
https://example.atlassian.net/browse/CORE-5940 is no GitHub issue of the repository, so
the agent picks", so that the host has an agent make the pick through the tracker: it
sends the command `pick` of the plugin of the stage, `/build:pick` or `/charter:pick`,
with the link after it, to a fresh session, which hands its choice to the host through
the call `pick` of the host tool. For a GitHub issue of the repository, it chooses as
follows.

A ticket is an open issue of the repository with the label `umka` whose `## Parent` heading
names the spec issue. The pick chooses the oldest ticket whose `## Blocked by` heading names
only closed issues, and prints three lines: the number and the title of the ticket, its
link, and the count of the open tickets, the chosen one among them. It reads at most 1000
open issues with the label.

```
12 Add the button
https://github.com/acme/app/issues/12
3
```

With no ticket to choose, because none is open or every open one is blocked, it prints
nothing and ends with the exit code 0.

Under a heading an issue is named as `#12`, as `acme/app#12` or by its address in the
repository of the ticket, and the section of a heading ends at the next heading of its level
or above. A blocker that is a merged pull request counts as closed. A reference to another repository, such as `acme/other#12` or an address in it, is
ignored: it names no parent and blocks nothing.

The pick ends with the exit code 1, prints nothing and says the reason on the standard
error when it is given no argument, when the argument is no link, because it does not
start with `https://` or holds a space or one of `<`, `>` and `|`, and when `gh` fails.
It asks `gh` nothing for an argument that is no link.

## The publish script

`publish` is an executable file in the root folder of the plugin, which a stage list
names as the script `umka:publish` of its last stage, a script stage. The host runs it
in the container of a thread when the thread reaches the stage, with the writable
checkout as its working directory and one pair of arguments per spec issue the
workspace holds under the repository of the checkout, the link then the title, in the
order the host recorded them, which the spec stage of each Builder run handed the host.
It sends the agent nothing, and says one line in the thread: "The pull request is ready
for review:" and the link the script printed, or "The pull request was not opened:" and
the reason the script wrote after `publish:`. It runs in a terminal the same way, from
the checkout, with the pairs as its arguments:

```sh
/path/to/umka/umka/publish https://github.com/acme/app/issues/10 "The list has a button that saves it"
```

The script, in order:

1. Reads its pairs of arguments, and fails with "publish: the branch has no spec issue"
   with none, with the line that says so for a link that is no `https://` link, and for
   a link with no title. The title is read as one line.
2. Refuses a working tree with changes that are not committed, with one line that names
   them: "publish: the working tree holds changes that are not committed: src/button.ts,
   notes.txt". It names at most 20 and counts the rest.
3. Reads the branch and asks `gh` for the default branch of the repository, which it
   refuses to publish, and for the link of the repository. A spec issue is a GitHub
   issue of the repository when its link is that link followed by `/issues/<n>`, the rule
   the pick tells its case by; for the spec issues that are, it asks `gh` for the closed
   issues with the label `umka`, of which it keeps, for each such spec issue, those whose
   `## Parent` heading names it and that were not closed as not planned; it reads at most
   1000 closed issues with the label. For a spec issue of another tracker, such as
   `https://example.atlassian.net/browse/CORE-5940`, it reads nothing from the tracker.
4. Fetches the default branch from `origin` and lists the ADRs the branch adds: the
   Markdown files that it adds to a folder `docs/adr/`, at the root or under a context,
   but for a `README.md`.
5. Pushes the branch to `origin`.
6. Opens the pull request against the default branch with `gh pr create`, ready for
   review, with the title of the last spec issue as its title. When the branch has
   an open pull request against the default branch, as a branch built again has, that
   one gets the body with `gh pr edit` in its place, no second one is opened, and it is
   marked ready when it is a draft.
7. Prints the link of the pull request, and nothing else.

The body of the pull request holds one section per spec issue, in the order the host
told them: the title linked to the spec issue under `## Spec`, and, for a spec issue
that is a GitHub issue of the repository, the closed tickets under `## Tickets` and the
`Closes` line of that spec issue; the ADRs the branch adds stand once, under
`## Decisions`, in the section of the last spec issue, before its `Closes` line. The
spec issue holds the proposal. With one spec issue on GitHub Issues:

```markdown
## Spec

[The list has a button that saves it](https://github.com/acme/app/issues/10)

## Tickets

- [Keep the list](https://github.com/acme/app/issues/11)
- [Add the button](https://github.com/acme/app/issues/12)

## Decisions

- [The list is saved on a press](https://github.com/acme/app/blob/<commit>/docs/adr/0003-the-list-is-saved-on-a-press.md)

Closes #10
```

The tickets stand in the order of their numbers. An ADR is named by its first heading, or
by the name of its file when it has none, and its link leads to the file at the commit
that was pushed. A body with no closed ticket has no `## Tickets` section, and one with
no ADR no `## Decisions` section. The line `Closes #10` has GitHub close the spec issue
when the pull request is merged. A branch built again for a second request, whose
workspace holds two spec issues under the repository, gets the section of the second
spec issue after the first, with its own `## Spec`, `## Tickets` and `Closes #20` line,
so the merge closes both spec issues and one pull request stays the one review of the
branch. The section of a spec issue of another tracker holds, under `## Spec`, the title
linked to the spec issue, as
`[The list saves itself](https://example.atlassian.net/browse/CORE-5940)`, with no
`## Tickets` section and no `Closes` line, since the tracker is not read and GitHub
closes no issue of it; a branch built again may hold a spec issue of each kind, and each
section follows its own link.

The script never merges and never marks a pull request a draft. It ends with the exit
code 1, prints nothing and says the reason on the standard error, with nothing pushed,
when it is told no spec issue, a link that is no `https://` link or a link with no title,
when the working tree holds a change that is not committed, when the checkout is on no
branch or on the default branch, when the branch has no commit that the default branch
lacks, and when `gh` or `git` fails before the push. When `gh` fails after the push, it ends the same way with the
branch pushed, and the next run opens the pull request.

## Requirements

- Node 22.3 or later, which the agent image carries.
- `gh`, signed in to an account that reads the issues of the repository and, for the
  publish script, opens its pull requests.
- `git`, for the publish script, with a remote `origin` it can push the branch to.

## Layout

```
umka/
├── .claude-plugin/
│   └── plugin.json         the plugin manifest: name `umka`
├── pick                    the pick of the workflows
├── publish                 the publish script of the workflows
├── skills/
│   └── findings/
│       └── SKILL.md        the skill `umka:findings`, which shapes the findings of a request
├── tickets.cjs             what the pick and the publish script share, with the rule that tells a GitHub issue of the repository from any other link
└── README.md
```

`claude plugin validate umka` checks the manifest. The tests of the pick are in
`test/pick.test.ts` and those of the publish script in `test/umka-publish.test.ts`, each
against a `gh` of the test.
