// `phases/registry` against the fixture phase and skill folders beside it.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { load, parseSkill } from "../lib/phases.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const fixture = (name) => path.join(here, "fixtures", name);
const skills = fixture("skills");
const run = (cmd, dir) => {
  const r = spawnSync(process.execPath, [path.join(here, "registry"), cmd, "--dir", dir, "--skills", skills], { encoding: "utf8" });
  return { code: r.status, out: r.stdout, errors: r.stderr.split("\n").filter(Boolean) };
};

test("skill: parses into the plugin skill, the human, or a tool command", () => {
  assert.deepEqual(parseSkill("umka:mattpocock_to-spec"), { kind: "skill", name: "mattpocock_to-spec" });
  assert.deepEqual(parseSkill("human"), { kind: "human" });
  assert.deepEqual(parseSkill("tool: gh pr merge"), { kind: "tool", command: "gh pr merge" });
  assert.equal(parseSkill("foo"), null);
});

test("load keeps the raw skill and adds call and a numeric rounds", () => {
  const { phases, errors } = load(fixture("valid"));
  assert.deepEqual(errors, []);
  assert.equal(phases.work.skill, "umka:vend_one");
  assert.deepEqual(phases.work.call, { kind: "skill", name: "vend_one" });
  assert.deepEqual(phases.ship.call, { kind: "tool", command: "gh pr merge" });
  assert.equal(phases.approve.rounds, 2);
  assert.equal(phases.intake.rounds, undefined);
});

test("lint passes a folder whose skills resolve, whose tool form is free text, and whose cycle has rounds", () => {
  const r = run("lint", fixture("valid"));
  assert.deepEqual(r.errors, []);
  assert.equal(r.code, 0);
});

test("lint reports every skill, rounds and cycle problem and exits 1", () => {
  const r = run("lint", fixture("errors"));
  assert.equal(r.code, 1);
  assert.deepEqual(r.errors, [
    `a.md: skill: "nope" has no SKILL.md under ${skills}`,
    'b.md: skill: "Bad.Name" is not /^[a-z0-9][a-z0-9_-]*$/',
    'c.md: skill: "locked" sets disable-model-invocation, so the model cannot call it',
    "d.md: skill: human only on a checkpoint or hitl phase",
    'e.md: rounds: "0" is not a positive integer',
    'f.md: rounds: "two" is not a positive integer',
    'g.md: skill: "foo" is not umka:<name>, human, or tool: <command>',
    "cycle without rounds: g > h > g",
  ]);
});

test("paths prints entries, terminals, each simple path with mode marks, a count, and each cycle", () => {
  const r = run("paths", fixture("valid"));
  assert.equal(r.code, 0);
  assert.equal(r.out, ["entries: chat, intake", "terminals: ship", "(chat) > ship", "intake > work > [approve] > ship", "2 paths", "cycles:", "[approve] > work > [approve]", ""].join("\n"));
});

test("graph shows rounds on the node label", () => {
  const r = run("graph", fixture("valid"));
  assert.match(r.out, /approve\{\{"approve rounds 2"\}\}/);
  assert.match(r.out, /work\["work 10k"\]/);
});
