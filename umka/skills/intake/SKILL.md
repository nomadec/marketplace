---
name: intake
description: "Class the epics the poll laid: give each one the GLOSSARY topic it concerns and its class (bug, proposal, spec, ticket, question or idea) from its text and labels. Used by the umka:run phase intake; called by name, not for auto-triggering."
---

# Intake

The input per epic: its title, its text ending `Sent by <who> (<source>).`, its external ref, the labels the source carries, the `repo:` note when the source names one, and that repo's `GLOSSARY.md` through `repos.json`. The output per epic: a topic term and a class. The item's own text and labels decide; no repo code is read.

## Topic

The topic is the GLOSSARY term the item concerns: the thing the item asks to change, see or explain. Match the item's nouns to the terms; the `_Avoid_` lines catch the words a source uses for the same thing. Several terms fit: the one the item asks to change. None fits, or no repo and no GLOSSARY: `other`.

## Class

The first row that holds:

| Signal in the text or labels | Class |
|---|---|
| A failure is reported (an error, wrong output, something that stopped working), or a `bug` label | `bug` |
| Numbered points to build | `proposal` |
| A `ready-for-agent` label | `spec` |
| One task against a spec: the text names the spec or the ticket is its child | `ticket` |
| Asks a fact or a design | `question` |
| Else | `idea` |

A text that reports a failure and proposes the fix is a `bug`. A text that asks "should we" is a `question`; a text that says "we should" is an `idea`.

## Return

One line per epic: `<epic id>: topic:<term> class:<class>`. Nothing else.
