// The pick of `queue tick` against a captured queue of three units.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { load } from "./phases.mjs";
import { decide } from "./pick.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const { phases } = load(path.join(here, "phases"));
const fixture = () => JSON.parse(fs.readFileSync(path.join(here, "fixtures", "queue.json"), "utf8"));
const find = (issues, id) => issues.find((i) => i.id === id);
const ids = (xs) => xs.map((x) => x.id);

test("an unbriefed checkpoint is picked before any afk work", () => {
  const d = decide(fixture(), phases);
  assert.equal(d.pick.id, "app-05y.2");
  assert.match(d.pick.reason, /no brief/);
});

test("a briefed checkpoint waits, and the tick continues the unit of the last closed item", () => {
  const issues = fixture();
  find(issues, "app-05y.2").labels.push("briefed");
  find(issues, "app-05y.2").status = "closed";
  find(issues, "app-05y.2").labels.push("applied");
  find(issues, "app-05y.2").closed_at = "2026-10-21T09:00:00Z";
  const d = decide(issues, phases);
  assert.equal(d.pick.id, "app-05y.3");
  assert.match(d.pick.reason, /continues app-05y/);
});

test("with the last unit waiting on a human, the first afk item of the ready queue is picked", () => {
  const issues = fixture();
  find(issues, "app-05y.2").labels.push("briefed");
  const d = decide(issues, phases);
  assert.equal(d.pick.id, "app-eam.1");
  assert.match(d.pick.reason, /ready queue/);
  assert.ok(ids(d.waiting).includes("app-05y.2"));
  assert.ok(ids(d.waiting).includes("app-sb1.3"));
});

test("a human item closed by hand is picked first, until a turn marks it applied", () => {
  const issues = fixture();
  Object.assign(find(issues, "app-sb1.3"), { status: "closed", closed_at: "2026-10-21T09:30:00Z", close_reason: "1 now" });
  const d = decide(issues, phases);
  assert.equal(d.pick.id, "app-sb1.3");
  assert.match(d.pick.reason, /not applied/);
  find(issues, "app-sb1.3").labels.push("applied");
  assert.notEqual(decide(issues, phases).pick.id, "app-sb1.3");
});

test("an item in progress is left alone and reported", () => {
  const issues = fixture();
  find(issues, "app-eam.1").status = "in_progress";
  find(issues, "app-05y.2").labels.push("briefed");
  const d = decide(issues, phases);
  assert.deepEqual(ids(d.inProgress), ["app-eam.1"]);
  assert.equal(d.pick.id, "app-bvd.1");
});

test("a child of a closed epic is never ready", () => {
  const issues = fixture();
  find(issues, "app-05y").status = "closed";
  const d = decide(issues, phases);
  assert.notEqual(d.pick.id, "app-05y.2");
});

test("nothing ready lists what waits on the human", () => {
  const issues = fixture().filter((i) => i.issue_type === "epic" || (i.labels || []).includes("briefed") || i.status === "closed");
  const d = decide(issues, phases);
  assert.equal(d.pick, null);
  assert.ok(d.waiting.length > 0);
});
