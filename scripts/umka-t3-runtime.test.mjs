import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { tick, inbox, answer, openInbox, resumeInbox, timeline, HISTORY_LIMIT } from './umka-t3-runtime.mjs';
import { withLock, write } from './umka-t3code.mjs';

function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'umka-runtime-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const o = { home, instance: 'test', t3: 't3', project: '/test/project' };
  const state = {
    launches: 0, threadStatus: 'running', failLaunch: false, sends: [], replyWithoutLink: false,
    issues: [{ id: 'u-1', issue_type: 'epic', title: 'First unit', status: 'open', labels: ['loop'] }, { id: 'u-1.1', parent: 'u-1', title: 'answer', status: 'open', labels: ['phase:answer'], description: 'A test answer' }],
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
      if (args[1] === 'start') { state.launches++; if (state.failLaunch) throw new Error('Lost response'); return JSON.stringify({ threadId: `thread-${state.launches}`, status: 'completed', reply: 'ready' }); }
      if (args[1] === 'send') {
        state.sends.push({ threadId: args[2], message: args[3] });
        const child = `thread:delegated-task:child-${state.sends.length}`;
        const reply = state.replyWithoutLink ? 'ignored'
          : state.v2Links ? `started u-1.1 answer\n<t3-thread://v2/env-1/${child}>`
          : `started\n[Umka test: u-1.1 answer](t3-thread://v1/${child})`;
        return JSON.stringify({ threadId: args[2], status: 'completed', reply });
      }
      if (args[1] === 'show') return JSON.stringify({ thread: { status: state.threadStatus, providerInstanceId: 'claudeAgent', model: 'project-default', runtimeMode: 'full-access', interactionMode: 'default' }, messages: [{ role: 'assistant', text: state.lastMessage || '' }] });
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

test('a re-briefed item opens a fresh conversation instead of reusing its settled phase thread', t => {
  const f = fixture(t);
  f.state.issues[1].labels = ['phase:approve-proposal', 'checkpoint'];
  tick(f.o, {}, f.run);
  f.state.threadStatus = 'completed';
  f.state.issues[1].labels.push('briefed');
  assert.equal(tick(f.o, {}, f.run).status, 'waiting');
  assert.equal(inbox(f.o, f.run)[0].threadId, 'thread-1');
  f.state.issues[1].description = 'A different brief, posted by a terminal session';
  assert.equal(inbox(f.o, f.run)[0].threadId, null);
  assert.equal(openInbox(f.o, f.run).items[0].threadId, 'thread-2');
  assert.equal(f.state.launches, 2);
});

test('closed inbox conversations are dropped and the runner history stays bounded', t => {
  const f = fixture(t);
  f.state.issues[1].labels = ['phase:approve-proposal', 'checkpoint', 'briefed'];
  openInbox(f.o, f.run);
  const items = path.join(f.o.home, 't3code/inbox-items.json');
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(items)).items), ['u-1.1']);
  answer(f.o, 'u-1.1', 'Approved', f.run);
  assert.equal(openInbox(f.o, f.run).status, 'empty');
  assert.deepEqual(JSON.parse(fs.readFileSync(items)).items, {});
  const runner = path.join(f.o.home, 't3code/runner.json');
  write(runner, { active: null, history: Array.from({ length: HISTORY_LIMIT }, (_, i) => ({ itemId: `old-${i}`, threadId: `t-${i}`, result: 'closed' })) });
  f.state.issues[1] = { id: 'u-1.2', parent: 'u-1', title: 'answer', status: 'open', labels: ['phase:answer'], description: 'Next' };
  tick(f.o, {}, f.run);
  f.state.threadStatus = 'completed'; f.state.issues[1].status = 'closed';
  tick(f.o, {}, f.run);
  const history = JSON.parse(fs.readFileSync(runner)).history;
  assert.equal(history.length, HISTORY_LIMIT);
  assert.equal(history.at(-1).itemId, 'u-1.2');
  assert.equal(history[0].itemId, 'old-1');
});

test('conversations of items deleted from beads are dropped from the inbox journal', t => {
  const f = fixture(t);
  f.state.issues[1].labels = ['phase:approve-proposal', 'checkpoint', 'briefed'];
  openInbox(f.o, f.run);
  const items = path.join(f.o.home, 't3code/inbox-items.json');
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(items)).items), ['u-1.1']);
  f.state.issues.splice(1, 1);
  assert.equal(openInbox(f.o, f.run).status, 'empty');
  assert.deepEqual(JSON.parse(fs.readFileSync(items)).items, {});
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

test('with the timeline on, one parent thread per epic dispatches every afk phase to a child', t => {
  const f = fixture(t);
  timeline(f.o, 'enable');
  const first = tick(f.o, {}, f.run);
  assert.equal(first.status, 'started');
  assert.equal(f.state.launches, 1);
  assert.equal(first.threadId, 'thread:delegated-task:child-1');
  assert.equal(first.timelineId, 'thread-1');
  assert.deepEqual(f.state.sends, [{ threadId: 'thread-1', message: 'tick u-1.1 answer afk' }]);
  assert.equal(tick(f.o, {}, f.run).status, 'busy');
  f.state.threadStatus = 'completed'; f.state.issues[1].status = 'closed';
  f.state.issues.push({ id: 'u-1.2', parent: 'u-1', title: 'review', status: 'open', labels: ['phase:review'], description: 'Next' });
  const second = tick(f.o, {}, f.run);
  assert.equal(second.status, 'started');
  assert.equal(f.state.launches, 1);
  assert.equal(second.threadId, 'thread:delegated-task:child-2');
  assert.equal(f.state.sends[1].message, 'tick u-1.2 review afk');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.o.home, 't3code/timeline.json'))).epics, { 'u-1': { threadId: 'thread-1' } });
});

test('a parent reply with an environment-scoped thread link still names the child', t => {
  const f = fixture(t);
  timeline(f.o, 'enable');
  f.state.v2Links = true;
  assert.equal(tick(f.o, {}, f.run).threadId, 'thread:delegated-task:child-1');
});

test('a parent that starts no child leaves an uncertain turn that stops further ticks', t => {
  const f = fixture(t);
  timeline(f.o, 'enable');
  f.state.replyWithoutLink = true;
  assert.throws(() => tick(f.o, {}, f.run), /did not start a phase/);
  assert.throws(() => tick(f.o, {}, f.run), /uncertain outcome/);
  assert.equal(f.state.sends.length, 1);
});

test('a brief posted by a timeline child points the inbox at the parent thread', t => {
  const f = fixture(t);
  timeline(f.o, 'enable');
  f.state.issues[1].labels = ['phase:approve-proposal', 'checkpoint'];
  tick(f.o, {}, f.run);
  f.state.threadStatus = 'completed';
  f.state.issues[1].labels.push('briefed');
  assert.equal(tick(f.o, {}, f.run).status, 'waiting');
  assert.equal(inbox(f.o, f.run)[0].threadId, 'thread-1');
  assert.equal(openInbox(f.o, f.run).items[0].threadId, 'thread-1');
  assert.equal(f.state.launches, 1);
});

test('attended work and a disabled timeline both use a thread of their own', t => {
  const f = fixture(t);
  timeline(f.o, 'enable');
  f.state.issues[1].labels = ['phase:grill', 'briefed'];
  assert.equal(tick(f.o, { attendedId: 'u-1.1' }, f.run).threadId, 'thread-1');
  assert.equal(f.state.sends.length, 0);
  const g = fixture(t);
  timeline(g.o, 'enable');
  timeline(g.o, 'disable');
  assert.equal(tick(g.o, {}, g.run).threadId, 'thread-1');
  assert.equal(g.state.sends.length, 0);
});

test('a turn that ends with a result line for its item settles even when the item is unchanged', t => {
  const f = fixture(t);
  f.state.issues[1].labels = ['phase:approve-merge', 'checkpoint'];
  tick(f.o, {}, f.run);
  f.state.threadStatus = 'completed';
  f.state.lastMessage = 'Round 4 is already laid ahead of this checkpoint.\n\nu-1.1 waits: address round 4 (u-1.2) laid ahead of it for 1 open thread';
  assert.equal(tick(f.o, {}, f.run).status, 'started');
  assert.equal(f.state.launches, 2);
  f.state.threadStatus = 'completed';
  f.state.lastMessage = 'u-1.9 waits: a line about another item';
  assert.throws(() => tick(f.o, {}, f.run), /did not finish/);
});
