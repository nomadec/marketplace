// The pick of `queue tick`: one item out of a full beads dump, by the rules of SKILL.md step 3.
// Pure: it reads the issues and the registry it is given and touches nothing.

export const HUMAN = ["hitl", "checkpoint"];

export function phaseOf(issue) {
  const label = (issue.labels || []).find((l) => l.startsWith("phase:"));
  return label ? label.slice("phase:".length) : null;
}

export function modeOf(issue, phases) {
  const slug = phaseOf(issue);
  return slug && phases[slug] ? phases[slug].mode : null;
}

const has = (issue, label) => (issue.labels || []).includes(label);
const byPriorityThenAge = (a, b) =>
  (a.priority ?? 2) - (b.priority ?? 2) || String(a.created_at).localeCompare(String(b.created_at));
const byClosedAt = (a, b) => String(a.closed_at).localeCompare(String(b.closed_at));

// An item is ready when it is open, its epic is open, and every item that blocks it is closed.
export function isReady(issue, byId) {
  if (issue.status !== "open") return false;
  const epic = issue.parent && byId.get(issue.parent);
  if (epic && epic.status !== "open") return false;
  return (issue.dependencies || [])
    .filter((d) => d.type === "blocks")
    .every((d) => !byId.has(d.depends_on_id) || byId.get(d.depends_on_id).status === "closed");
}

// `decide` takes every issue of the database and the registry's phases, and returns the pick
// with its reason, the in-progress items it left alone, and the briefed items waiting on a human.
export function decide(issues, phases) {
  const byId = new Map(issues.map((i) => [i.id, i]));
  const items = issues.filter((i) => phaseOf(i) && i.issue_type !== "epic");
  const human = (i) => HUMAN.includes(modeOf(i, phases));
  const afk = (i) => modeOf(i, phases) === "afk";
  const ready = items.filter((i) => isReady(i, byId)).sort(byPriorityThenAge);
  const result = {
    pick: null,
    inProgress: items.filter((i) => i.status === "in_progress").map(brief),
    waiting: ready.filter((i) => human(i) && has(i, "briefed")).map(brief),
  };
  const choose = (issue, reason) => Object.assign(result, { pick: { ...brief(issue), reason } });

  const unapplied = items.filter((i) => i.status === "closed" && human(i) && !has(i, "applied")).sort(byClosedAt);
  if (unapplied.length) return choose(unapplied[0], "closed by a human, its answer not applied");

  const unbriefed = ready.filter((i) => human(i) && !has(i, "briefed"));
  if (unbriefed.length) return choose(unbriefed[0], "waits on a human and has no brief");

  const closed = items.filter((i) => i.status === "closed" && i.closed_at).sort(byClosedAt);
  const last = closed.length ? closed[closed.length - 1] : null;
  if (last && last.parent) {
    const next = ready.find((i) => i.parent === last.parent && afk(i));
    if (next) return choose(next, `continues ${last.parent}, the unit of the last closed item ${last.id}`);
  }

  const first = ready.find(afk);
  if (first) return choose(first, "first afk item of the ready queue");
  return result;
}

function brief(issue) {
  return { id: issue.id, title: issue.title, parent: issue.parent || null, phase: phaseOf(issue) };
}
