// The Stop hook against the event shape of the Stop hook input.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { decide } from "./stop-guard.mjs";
import * as fsModule from "node:fs";
const require_fs = () => fsModule;

const here = path.dirname(new URL(import.meta.url).pathname);
const run = (event) =>
  spawnSync("node", [path.join(here, "stop-guard.mjs")], { input: JSON.stringify(event), encoding: "utf8" });

test("nothing in flight: the turn may end", () => {
  assert.equal(decide({ hook_event_name: "Stop", stop_hook_active: false, background_tasks: [] }), null);
  assert.equal(decide({ hook_event_name: "Stop", stop_hook_active: false }), null);
});

test("a running shell task blocks the stop and names the command", () => {
  const out = decide({
    hook_event_name: "Stop",
    stop_hook_active: false,
    background_tasks: [{ id: "b1", type: "shell", status: "running", description: "full suite", command: "mix test > /tmp/fullsuite.log" }],
  });
  assert.equal(out.decision, "block");
  assert.match(out.reason, /shell: mix test > \/tmp\/fullsuite\.log/);
  assert.match(out.reason, /Wait for it in the foreground/);
});

test("a finished task does not block; a pending subagent does", () => {
  assert.equal(decide({ background_tasks: [{ id: "b1", type: "shell", status: "completed", description: "done" }] }), null);
  const out = decide({ background_tasks: [{ id: "a1", type: "subagent", status: "pending", description: "review", agent_type: "Explore" }] });
  assert.equal(out.decision, "block");
  assert.match(out.reason, /subagent: review/);
});

test("the script prints the decision as JSON on stdout, and nothing when free", () => {
  const blocked = run({ background_tasks: [{ id: "b1", type: "shell", status: "running", command: "sleep 9" }] });
  assert.equal(blocked.status, 0);
  assert.equal(JSON.parse(blocked.stdout).decision, "block");
  const free = run({ background_tasks: [] });
  assert.equal(free.status, 0);
  assert.equal(free.stdout, "");
  const garbage = spawnSync("node", [path.join(here, "stop-guard.mjs")], { input: "not json", encoding: "utf8" });
  assert.equal(garbage.status, 0);
  assert.equal(garbage.stdout, "");
});

test("the script runs as main when reached through a symlink", () => {
  const fs = require_fs();
  const dir = fs.mkdtempSync("/tmp/stop-guard-");
  const link = path.join(dir, "stop-guard.mjs");
  fs.symlinkSync(path.join(here, "stop-guard.mjs"), link);
  const r = spawnSync("node", [link], { input: JSON.stringify({ background_tasks: [{ id: "b", type: "shell", status: "running", command: "x" }] }), encoding: "utf8" });
  fs.rmSync(dir, { recursive: true });
  assert.equal(JSON.parse(r.stdout).decision, "block");
});
