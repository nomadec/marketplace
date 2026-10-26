import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { tick, inbox, answer, openInbox } from './umka-t3-runtime.mjs';
import { schedule, scheduleId } from './umka-t3-schedule.mjs';

function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'umka-runtime-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const o = { home, instance: 'test', t3: 't3', project: '/test/project' };
  const state = {
    launches: 0, threadStatus: 'running', failLaunch: false,
    issues: [{ id: 'u-1', issue_type: 'epic', status: 'open', labels: ['loop'] }, { id: 'u-1.1', parent: 'u-1', title: 'answer', status: 'open', labels: ['phase:answer'], description: 'A test answer' }],
  };
  const run = (exe, args) => {
    if (exe === 'bd') {
      if (args[2] === 'list') return JSON.stringify(state.issues);
      if (args[2] === 'close') {
        const item = state.issues.find(i => i.id === args[3]);
        item.status = 'closed'; item.close_reason = args[5]; return '';
      }
    }
    if (exe === 't3' && args[0] === 'thread') {
      if (args[1] === 'start') { state.launches++; if (state.failLaunch) throw new Error('Lost response'); return JSON.stringify({ threadId: `thread-${state.launches}` }); }
      if (args[1] === 'show') return JSON.stringify({ thread: { status: state.threadStatus, providerInstanceId: 'claudeAgent', model: 'project-default', runtimeMode: 'full-access', interactionMode: 'default' } });
    }
    throw new Error(`Unexpected ${exe}: ${args.join(' ')}`);
  };
  return { o, state, run };
}

test('repeated ticks do not overlap even before the agent claims its item', t => {
  const f = fixture(t);
  assert.equal(tick(f.o, {}, f.run).status, 'started');
  assert.equal(tick(f.o, {}, f.run).status, 'busy');
  assert.equal(f.state.launches, 1);
  assert.equal(f.state.issues[1].status, 'open');
  f.state.threadStatus = 'completed'; f.state.issues[1].status = 'closed';
  assert.equal(tick(f.o, {}, f.run).status, 'idle');
  assert.equal(f.state.launches, 1);
});

test('an uncertain launch and a completed turn with no progress both stop retries', t => {
  const f = fixture(t);
  f.state.failLaunch = true;
  assert.throws(() => tick(f.o, {}, f.run), /Lost response/);
  assert.throws(() => tick(f.o, {}, f.run), /uncertain outcome/);
  assert.equal(f.state.launches, 1);
  const g = fixture(t);
  tick(g.o, {}, g.run); g.state.threadStatus = 'completed';
  assert.throws(() => tick(g.o, {}, g.run), /did not finish/);
  assert.equal(g.state.launches, 1);
});

test('dry runs do not launch or write journals and manual claims block managed turns', t => {
  const f = fixture(t);
  assert.equal(tick(f.o, { dry: true }, f.run).pick.id, 'u-1.1');
  assert.equal(fs.existsSync(path.join(f.o.home, 't3code')), false);
  f.state.issues[1].status = 'in_progress';
  assert.equal(tick(f.o, {}, f.run).status, 'busy');
  assert.equal(f.state.launches, 0);
});

test('briefed checkpoints appear in inbox and explicit answers become eligible for the next tick', t => {
  const f = fixture(t);
  f.state.issues[1].labels = ['phase:approve-proposal', 'checkpoint', 'briefed'];
  assert.equal(inbox(f.o, f.run)[0].id, 'u-1.1');
  answer(f.o, 'u-1.1', 'Yes, exactly this scope.', f.run);
  assert.equal(f.state.issues[1].close_reason, 'Yes, exactly this scope.');
  assert.equal(tick(f.o, { dry: true }, f.run).pick.id, 'u-1.1');
  assert.throws(() => answer(f.o, 'u-1.1', 'different', f.run), /not a ready/);
});

test('interactive phases cannot be silently closed through the answer command', t => {
  const f = fixture(t);
  f.state.issues[1].labels = ['phase:grill', 'briefed'];
  assert.throws(() => answer(f.o, 'u-1.1', 'yes', f.run), /needs a conversation/);
  assert.equal(f.state.issues[1].status, 'open');
  assert.equal(tick(f.o, { attendedId: 'u-1.1' }, f.run).status, 'started');
});

test('inbox chat is reused rather than sending unsolicited refresh messages', t => {
  const f = fixture(t);
  assert.deepEqual(openInbox(f.o, f.run), openInbox(f.o, f.run));
  assert.equal(f.state.launches, 1);
});

test('schedule install is idempotent, preserves enabled state, and disable is reversible', async t => {
  const f = fixture(t);
  let task;
  const api = {
    projects: async () => ({ projects: [{ id: 'project', workspaceRoot: f.o.project, deletedAt: null }] }),
    rpc: async (method, payload) => {
      if (method === 'scheduledTasks.list') return { tasks: task ? [task] : [] };
      if (method === 'scheduledTasks.upsert') { task = { ...payload }; return { task }; }
      if (method === 'scheduledTasks.setEnabled') { task.enabled = payload.enabled; return { task }; }
      throw new Error(`Unexpected ${method}`);
    },
  };
  const connect = async (_o, action) => action(api);
  await schedule(f.o, 'schedule-install', [], connect, f.run);
  assert.equal(task.enabled, false);
  assert.equal(task.id, scheduleId(f.o));
  await schedule(f.o, 'enable', [], connect, f.run);
  await schedule(f.o, 'schedule-install', [], connect, f.run);
  assert.equal(task.enabled, true);
  assert.equal(f.state.launches, 1);
  await schedule(f.o, 'disable', [], connect, f.run);
  assert.equal(task.enabled, false);
  assert.equal(task.schedule.everyMs, 300000);
});
