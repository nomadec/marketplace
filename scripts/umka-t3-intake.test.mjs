import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { intake, poll } from './umka-t3-intake.mjs';
import { tick } from './umka-t3-runtime.mjs';
import { write } from './umka-t3code.mjs';

function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'umka-intake-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const o = { home, instance: 'test', t3: 't3', project: '/test/project' };
  const source = path.join(home, 'feed.jsonl');
  const feed = items => fs.writeFileSync(source, items.map(i => JSON.stringify(i)).join('\n') + '\n');
  const item = { id: 'request-1', title: 'A synthetic question', text: 'How does the synthetic example work?', who: 'test', created: '2026-10-26T00:00:00Z' };
  feed([item]);
  write(path.join(home, 'sources.json'), { sources: [{ name: 'test-feed', kind: 'file', path: source, repo_key: 'example' }] });
  const state = { issues: [], calls: [], launches: 0, threadStatus: 'running', failLaunch: false, loseCreate: false, failCreate: false, failNote: false };
  const run = (exe, args) => {
    state.calls.push({ exe, args });
    if (exe === 'bd') {
      if (args[2] === 'list') return JSON.stringify(state.issues);
      if (args[2] === 'create') {
        if (state.failCreate) throw new Error('Create failed');
        const epic = { id: `u-${state.issues.length + 1}`, title: args[args.indexOf('--') + 1], status: 'open', issue_type: 'epic', labels: ['loop'], external_ref: args[args.indexOf('--external-ref') + 1], description: args[args.indexOf('-d') + 1] };
        state.issues.push(epic);
        if (state.loseCreate) throw new Error('Lost create response');
        return JSON.stringify(epic);
      }
      if (args[2] === 'note') {
        if (state.failNote) throw new Error('Note failed');
        const epic = state.issues.find(i => i.id === args[3]);
        epic.notes = [epic.notes, args[4]].filter(Boolean).join('\n');
        return '';
      }
    }
    if (exe === 't3' && args[0] === 'thread') {
      if (args[1] === 'start') {
        state.launches++;
        if (state.failLaunch) throw new Error('Lost launch response');
        return JSON.stringify({ threadId: `thread-${state.launches}` });
      }
      if (args[1] === 'show') return JSON.stringify({ thread: { status: state.threadStatus } });
    }
    throw new Error(`Unexpected ${exe}: ${args.join(' ')}`);
  };
  const classify = () => {
    for (const epic of state.issues.filter(i => i.issue_type === 'epic')) {
      epic.notes += '\nclass: question';
      epic.labels.push('topic:other');
    }
    state.threadStatus = 'completed';
  };
  return { o, state, source, feed, item, run, classify, call: (options = {}) => intake(o, options, run) };
}

test('dry-run previews sources without importing, advancing cursors, writing journals or invoking T3', t => {
  const f = fixture(t);
  const before = fs.readdirSync(f.o.home);
  const preview = f.call({ dry: true });
  assert.equal(preview.items.length, 1);
  assert.equal(preview.items[0].link, `${f.source}#request-1`);
  assert.deepEqual(fs.readdirSync(f.o.home), before);
  assert.equal(f.state.calls.every(c => c.exe === 'bd' && c.args[2] === 'list'), true);
});

test('empty and already-known intake never invokes a model', t => {
  const f = fixture(t);
  f.state.issues.push({ id: 'known', external_ref: `${f.source}#request-1` });
  assert.equal(f.call().status, 'empty');
  assert.equal(f.call().status, 'empty');
  assert.equal(f.state.launches, 0);
  assert.equal(f.state.calls.every(c => c.exe === 'bd' && c.args[2] === 'list'), true);
  assert.equal(fs.existsSync(path.join(f.o.home, 't3code/intake.json')), false);
});

test('new items import once and start one fresh T3 classification thread, blocking ticks until completion', t => {
  const f = fixture(t);
  f.feed([f.item, { ...f.item, id: 'request-2', title: 'Second request' }]);
  const result = f.call();
  assert.equal(result.status, 'started');
  assert.deepEqual(result.epicIds, ['u-1', 'u-2']);
  assert.equal(f.state.launches, 1);
  assert.match(f.state.issues[0].notes, /channel: cli\nrepo: example/);
  const launch = f.state.calls.find(c => c.exe === 't3' && c.args[1] === 'start');
  assert.match(launch.args[3], /intake u-1 u-2 afk/);
  assert.match(launch.args[3], /fresh T3 thread/);
  assert.equal(tick(f.o, {}, f.run).status, 'busy');
  assert.equal(f.call().status, 'busy');
  assert.equal(f.state.launches, 1);
  f.classify();
  assert.equal(f.call().status, 'empty');
  assert.equal(f.state.issues.length, 2);
  assert.equal(f.state.launches, 1);
});

test('failed or incomplete classification stops dispatch instead of silently losing imported work', t => {
  const f = fixture(t);
  f.call();
  f.state.threadStatus = 'completed';
  assert.throws(() => tick(f.o, {}, f.run), /did not finish classifying/);
  assert.throws(() => f.call(), /did not finish classifying/);
  assert.equal(f.state.launches, 1);
});

test('an uncertain intake launch is never retried even though cursors already advanced', t => {
  const f = fixture(t);
  f.state.failLaunch = true;
  assert.throws(() => f.call(), /Lost launch response/);
  assert.throws(() => f.call(), /uncertain outcome/);
  assert.throws(() => tick(f.o, {}, f.run), /uncertain outcome/);
  assert.equal(f.state.launches, 1);
  assert.equal(f.state.issues.length, 1);
});

test('a lost beads create response is reconciled by external ref, without a duplicate epic', t => {
  const f = fixture(t);
  f.state.loseCreate = true;
  assert.throws(() => f.call(), /Lost create response/);
  assert.equal(fs.existsSync(path.join(f.o.home, 'cursors.json')), false);
  f.state.loseCreate = false;
  assert.equal(f.call().status, 'started');
  assert.equal(f.state.issues.length, 1);
  assert.equal(f.state.launches, 1);
});

test('a failed beads create is retried on the next intake instead of wedging the batch', t => {
  const f = fixture(t);
  f.state.failCreate = true;
  assert.throws(() => f.call(), /Create failed/);
  assert.throws(() => f.call(), /Create failed/);
  assert.equal(f.state.issues.length, 0);
  f.state.failCreate = false;
  assert.equal(f.call().status, 'started');
  assert.equal(f.state.issues.length, 1);
  assert.equal(f.state.launches, 1);
});

test('an untrusted title that looks like a flag is passed to bd after a -- terminator', t => {
  const f = fixture(t);
  f.feed([{ ...f.item, title: '--help me' }]);
  f.call();
  const create = f.state.calls.find(c => c.exe === 'bd' && c.args[2] === 'create');
  assert.equal(create.args.at(-2), '--');
  assert.equal(create.args.at(-1), '--help me');
  assert.equal(f.state.issues[0].title, '--help me');
});

test('partially imported batches resume and repair notes before advancing cursors', t => {
  const f = fixture(t);
  f.state.failNote = true;
  assert.throws(() => f.call(), /Note failed/);
  assert.equal(fs.existsSync(path.join(f.o.home, 'cursors.json')), false);
  f.state.failNote = false;
  assert.equal(f.call().status, 'started');
  assert.equal(f.state.issues.length, 1);
  assert.match(f.state.issues[0].notes, /repo: example/);
});

test('a pending batch left after a successful launch is cleared using completed runner history', t => {
  const f = fixture(t);
  f.call();
  const runner = JSON.parse(fs.readFileSync(path.join(f.o.home, 't3code/runner.json')));
  write(path.join(f.o.home, 't3code/intake.json'), { pending: { id: runner.active.intakeBatchId, entries: [] } });
  f.classify();
  assert.equal(f.call().status, 'empty');
  assert.equal(f.state.launches, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.o.home, 't3code/intake.json'))).pending, null);
});

test('GitHub polling uses the cursor boundary and preserves source labels and author', () => {
  let args;
  const items = poll({ kind: 'github', repo: 'example/project' }, { id: '1', created: '2026-10-26T00:00:00Z' }, (exe, a) => {
    assert.equal(exe, 'gh'); args = a;
    return JSON.stringify([
      { number: 1, title: 'Known', createdAt: '2026-10-26T00:00:00Z' },
      { number: 2, title: 'Bug', body: 'Broken', labels: [{ name: 'bug' }], author: { login: 'reporter' }, url: 'https://github.com/example/project/issues/2', createdAt: '2026-10-26T00:00:00Z' },
    ]);
  });
  assert.match(args[args.indexOf('--search') + 1], /created:>=2026-10-26T00:00:00Z/);
  assert.deepEqual(items[0].labels, ['bug']);
  assert.equal(items[0].who, 'reporter');
});

test('bad source configuration or a polling error makes no queue or cursor mutations', t => {
  const f = fixture(t);
  write(path.join(f.o.home, 'sources.json'), { sources: [{ name: 'missing', kind: 'file', path: '/no/such/intake-file' }] });
  assert.throws(() => f.call(), /ENOENT/);
  assert.equal(f.state.issues.length, 0);
  assert.equal(fs.existsSync(path.join(f.o.home, 'cursors.json')), false);
  write(path.join(f.o.home, 'sources.json'), { sources: [{ name: 'unsupported', kind: 'jira' }] });
  assert.throws(() => f.call(), /unsupported kind/);
});

test('a later manual intake starts a different thread for only the new source item', t => {
  const f = fixture(t);
  assert.equal(f.call().threadId, 'thread-1');
  f.classify();
  assert.equal(f.call().status, 'empty');
  f.feed([f.item, { ...f.item, id: 'request-2', title: 'A later request' }]);
  const next = f.call();
  assert.equal(next.threadId, 'thread-2');
  assert.deepEqual(next.epicIds, ['u-2']);
  assert.equal(f.state.issues.length, 2);
});

test('bug labels reach the imported brief and incomplete bug pre-work blocks completion', t => {
  const f = fixture(t);
  f.feed([{ ...f.item, labels: ['bug'] }]);
  f.call();
  const epic = f.state.issues[0];
  assert.match(epic.description, /Source labels: bug/);
  epic.notes += '\nclass: bug';
  epic.labels.push('topic:other');
  f.state.threadStatus = 'completed';
  assert.throws(() => f.call(), /did not finish classifying/);
  f.state.issues.push({ id: 'u-1.1', parent: epic.id, status: 'open', labels: ['phase:reproduce'] });
  assert.equal(f.call().status, 'empty');
});

test('a manually claimed phase blocks imports before polling or launching', t => {
  const f = fixture(t);
  f.state.issues.push({ id: 'manual', status: 'in_progress', labels: ['phase:answer'] });
  assert.equal(f.call().status, 'busy');
  assert.equal(f.state.calls.length, 1);
  assert.equal(fs.existsSync(path.join(f.o.home, 't3code')), false);
});
