---
name: findings
description: Shape the findings of a conversation for the request handed to the host at exit 3, as the links and facts the conversation found, in one short section with no plan, so that the grill it seeds does not search for them again.
---

# Findings

The findings are what the conversation found that the grill would otherwise search for
again: the issue, the page, the screens and the facts of the product the request
concerns. They travel with the request, in the `findings` argument of the host tool call
`request`, and the grill reads them in its first message, under the heading
`## Findings` after the request text. The thread shows the request and not the findings.

## Shape

One short section of bullets, in Markdown, and nothing else: no heading, since the host
adds it, no introduction and no closing line.

- **Links first.** One bullet per link the conversation read, with what it is in a few
  words before the link: the Jira issue, the Confluence page, the pull request, the
  design. Give the link as it was read, never a shortened or guessed one.
- **Facts after.** One bullet per fact the conversation established about the product
  or its code that bears on the request: what a screen shows today, which list, button
  or notification the request concerns, what the requester ruled out. Each fact names
  where it came from when a link does not already say so.
- **No plan.** Nothing about how to build it, which files to change, what the design
  should be, or what to ask the requester: the grill decides that. A proposal, a step
  list or a recommendation in the findings is removed before the call.
- **Short.** At most ten bullets, each one line, and under 10000 characters in all.
  A conversation that found nothing hands over no findings: leave the argument out.

## Example

```markdown
- The Jira issue: https://jira.example.com/browse/APP-412
- The Confluence page on the list: https://wiki.example.com/pages/9013
- The list screen shows the items with no button today; the save happens on leaving the screen.
- The requester ruled out a confirmation dialog.
```
