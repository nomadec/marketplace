import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { tick, inbox, answer, openInbox, resumeInbox } from './umka-t3-runtime.mjs';
import { withLock } from './umka-t3code.mjs';

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

test('empty inbox checks never call T3 or create an inbox journal', t => {
  const f = fixture(t);
  assert.equal(openInbox(f.o, f.run).status, 'empty');
  assert.equal(f.state.launches, 0);
  assert.equal(fs.existsSync(path.join(f.o.home, 't3code/inbox-items.json')), false);
});

test('each waiting item has one conversation across repeated inbox checks and restarts', t => {
  const f = fixture(t);
  f.state.issues[1].labels = ['phase:approve-proposal', 'checkpoint', 'briefed'];
  f.state.issues.push({ ...f.state.issues[1], id: 'u-1.2', title: 'another checkpoint' });
  const first = openInbox(f.o, f.run);
  assert.equal(first.items.length, 2);
  assert.equal(f.state.launches, 2);
  assert.deepEqual(openInbox({ ...f.o }, f.run).items.map(i => i.threadId), first.items.map(i => i.threadId));
  assert.equal(f.state.launches, 2);
  answer(f.o, 'u-1.1', 'Approved', f.run);
  assert.equal(openInbox(f.o, f.run).items.length, 1);
  assert.equal(f.state.launches, 2);
});

test('a phase thread that produced the brief becomes its inbox conversation', t => {
  const f = fixture(t);
  f.state.issues[1].labels = ['phase:approve-proposal', 'checkpoint'];
  tick(f.o, {}, f.run);
  f.state.threadStatus = 'completed';
  f.state.issues[1].labels.push('briefed');
  assert.equal(openInbox(f.o, f.run).items[0].threadId, 'thread-1');
  assert.equal(f.state.launches, 1);
  assert.equal(tick(f.o, {}, f.run).status, 'waiting');
});

test('uncertain inbox launches never duplicate a conversation', t => {
  const f = fixture(t);
  f.state.issues[1].labels = ['phase:grill', 'briefed'];
  f.state.failLaunch = true;
  assert.throws(() => openInbox(f.o, f.run), /Lost response/);
  f.state.failLaunch = false;
  assert.throws(() => openInbox(f.o, f.run), /uncertain/);
  assert.equal(f.state.launches, 1);
});

test('waiting inbox items do not occupy the worker; interactive replies reserve their existing thread', t => {
  const f = fixture(t);
  f.state.issues[1].labels = ['phase:grill', 'briefed'];
  openInbox(f.o, f.run);
  assert.equal(tick(f.o, {}, f.run).status, 'waiting');
  assert.equal(resumeInbox(f.o, 'u-1.1', f.run).status, 'reserved');
  assert.equal(tick(f.o, {}, f.run).status, 'busy');
  f.state.threadStatus = 'completed';
  f.state.issues[1].status = 'in_progress';
  assert.equal(tick(f.o, {}, f.run).status, 'busy');
  assert.equal(resumeInbox(f.o, 'u-1.1', f.run).status, 'reserved');
  f.state.issues[1].status = 'closed';
  f.state.issues[1].labels.push('applied');
  assert.equal(tick(f.o, {}, f.run).status, 'idle');
  assert.equal(f.state.launches, 1);
});

test('inbox and tick share a lock and a live owner causes a harmless skip', t => {
  const f = fixture(t);
  withLock(`${f.o.home}:runtime`, () => {
    assert.equal(tick(f.o, {}, f.run).reason, 'locked');
    assert.equal(openInbox(f.o, f.run).reason, 'locked');
  });
  assert.equal(f.state.launches, 0);
});

test('inbox conversations can open while an unrelated autonomous phase is running', t => {
  const f = fixture(t);
  tick(f.o, {}, f.run);
  f.state.issues.push({ ...f.state.issues[1], id: 'u-1.2', title: 'approval', labels: ['phase:approve-proposal', 'briefed'] });
  assert.equal(openInbox(f.o, f.run).items[0].itemId, 'u-1.2');
  assert.equal(f.state.launches, 2);
  assert.equal(resumeInbox(f.o, 'u-1.2', f.run).status, 'busy');
});

test('a human clarification without claiming work releases the worker slot', t => {
  const f = fixture(t);
  f.state.issues[1].labels = ['phase:grill', 'briefed'];
  openInbox(f.o, f.run);
  resumeInbox(f.o, 'u-1.1', f.run);
  f.state.threadStatus = 'completed';
  assert.equal(tick(f.o, {}, f.run).status, 'waiting');
  f.state.issues.push({ ...f.state.issues[1], id: 'u-1.2', labels: ['phase:answer'] });
  assert.equal(tick(f.o, {}, f.run).status, 'started');
});
