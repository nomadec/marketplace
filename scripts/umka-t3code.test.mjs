import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { setup, root, parse, digest, withLock } from './umka-t3code.mjs';
import { smoke } from './umka-t3code-smoke.mjs';

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'umka setup '));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const home = path.join(dir, "instance's home");
  const calls = [];
  const state = { bd: '1.3.1', project: false, failProject: false, pluginVersion: '0.1.0' };
  const options = { mode: 'apply', instance: 'test', home, repos: {}, project: root, t3: '/test/t3' };
  const run = (exe, args, opts) => {
    calls.push({ exe, args });
    if (args[0] === '--version') return exe === 'bd' ? `bd version ${state.bd} (test)` : 'test version';
    if (exe === 'claude' && args.join(' ') === 'plugin list --json') return JSON.stringify([{ id: 'umka@marketplace', version: state.pluginVersion, enabled: true, scope: 'user', installPath: path.join(root, 'umka') }]);
    if (exe === '/test/t3' && args[0] === 'project') {
      if (state.failProject) throw new Error('Server unavailable');
      if (state.project) throw new Error('ProjectAlreadyExistsError: already registered');
      state.project = true;
      return 'Added project test';
    }
    if (args[0]?.endsWith('/queue') && args[1] === 'init') {
      fs.mkdirSync(path.join(opts.env.UMKA_HOME, '.beads'), { recursive: true });
      fs.writeFileSync(path.join(opts.env.UMKA_HOME, '.beads/sentinel'), 'database');
    }
    return '[]';
  };
  return { dir, home, calls, state, options, run, apply: () => setup(options, run, () => {}) };
}

test('fresh setup and second apply preserve state and produce an identical receipt', t => {
  const f = fixture(t);
  f.apply();
  const receipt = fs.readFileSync(path.join(f.home, 't3code/setup.json'), 'utf8');
  const stamp = fs.statSync(path.join(f.home, 't3code/setup.json')).mtimeMs;
  fs.writeFileSync(path.join(f.home, 'sources.json'), '{"sources":[{"name":"existing"}]}');
  fs.writeFileSync(path.join(f.home, 'cursors.json'), '{"existing":{"id":"123"}}');
  f.apply();
  assert.equal(fs.readFileSync(path.join(f.home, 't3code/setup.json'), 'utf8'), receipt);
  assert.equal(fs.statSync(path.join(f.home, 't3code/setup.json')).mtimeMs, stamp);
  assert.equal(fs.readFileSync(path.join(f.home, 'sources.json'), 'utf8'), '{"sources":[{"name":"existing"}]}');
  assert.equal(fs.readFileSync(path.join(f.home, 'cursors.json'), 'utf8'), '{"existing":{"id":"123"}}');
  assert.equal(f.calls.filter(c => c.args[1] === 'init').length, 1);
  assert.equal(fs.readFileSync(path.join(f.home, '.beads/sentinel'), 'utf8'), 'database');
  setup({ ...f.options, mode: 'verify' }, f.run, () => {});
});

test('interrupted setup resumes without reinitializing the database', t => {
  const f = fixture(t);
  f.state.failProject = true;
  assert.throws(f.apply, /Server unavailable/);
  assert.equal(fs.existsSync(path.join(f.home, 't3code/setup.json')), false);
  f.state.failProject = false;
  f.apply();
  assert.equal(f.calls.filter(c => c.args[1] === 'init').length, 1);
});

test('check makes no home or external mutations', t => {
  const f = fixture(t);
  setup({ ...f.options, mode: 'check' }, f.run, () => {});
  assert.equal(fs.existsSync(f.home), false);
  assert.equal(f.calls.some(c => ['add', 'install', 'update', 'init'].some(a => c.args.includes(a))), false);
});

test('wrong beads version stops before creating or modifying the home', t => {
  const f = fixture(t);
  f.state.bd = '1.3.10';
  assert.throws(f.apply, /Install bd 1.3.1/);
  assert.equal(fs.existsSync(f.home), false);
});

test('repo mapping conflicts and malformed config fail before running commands', t => {
  const f = fixture(t);
  fs.mkdirSync(f.home);
  fs.writeFileSync(path.join(f.home, 'repos.json'), JSON.stringify({ app: f.dir }));
  f.options.repos = { app: root };
  assert.throws(f.apply, /refusing to replace/);
  assert.equal(f.calls.length, 0);
  fs.writeFileSync(path.join(f.home, 'repos.json'), '[]');
  assert.throws(f.apply, /Expected an object/);
});

test('verify detects changed plugin version and missing receipt', t => {
  const f = fixture(t);
  assert.throws(() => setup({ ...f.options, mode: 'verify' }, f.run, () => {}), /receipt/);
  f.apply();
  f.state.pluginVersion = '0.1.3';
  assert.throws(() => setup({ ...f.options, mode: 'verify' }, f.run, () => {}), /Plugin version or contents/);
});

test('another instance cannot silently take over an existing home', t => {
  const f = fixture(t);
  f.apply();
  assert.throws(() => setup({ ...f.options, instance: 'other' }, f.run, () => {}), /configured for test/);
});

test('CLI rejects unknown flags and supports spaces, quotes and equals in paths', () => {
  assert.throws(() => parse(['apply', '--force']), /Unknown option/);
  assert.throws(() => parse(['apply', '--home']), /Missing value/);
  assert.throws(() => parse(['apply', '--repo', 'bad']), /NAME=PATH/);
  const o = parse(['check', '--home', "/tmp/user's home", '--repo', 'app=/tmp/a=b repo']);
  assert.equal(o.repos.app, '/tmp/a=b repo');
  assert.equal(o.home, "/tmp/user's home");
});

test('plugin contents ignore Claude in-use marker but detect changes at the same version', t => {
  const f = fixture(t);
  const plugin = path.join(f.dir, 'plugin');
  fs.cpSync(path.join(root, 'umka'), plugin, { recursive: true });
  const original = digest(plugin);
  fs.writeFileSync(path.join(plugin, '.in_use'), 'active session');
  assert.equal(digest(plugin), original);
  fs.appendFileSync(path.join(plugin, 'skills/run/SKILL.md'), '\nChanged instructions\n');
  assert.notEqual(digest(plugin), original);
});

test('a missing T3 project is registered but an unreachable server stops setup', t => {
  const f = fixture(t);
  const run = (exe, args, opts) => {
    if (exe === '/test/t3' && args[0] === 'thread' && !f.state.project) throw new Error("No T3 Code project matches '/new/project'.");
    return f.run(exe, args, opts);
  };
  setup(f.options, run, () => {});
  assert.equal(f.state.project, true);
  const g = fixture(t);
  assert.throws(() => setup(g.options, (exe, args, opts) => {
    if (exe === '/test/t3' && args[0] === 'thread') throw new Error('Connection refused');
    return g.run(exe, args, opts);
  }, () => {}), /not reachable/);
  assert.equal(fs.existsSync(g.home), false);
});

test('verify catches missing config and damaged wrapper; apply repairs both', t => {
  const f = fixture(t);
  f.apply();
  fs.unlinkSync(path.join(f.home, 'sources.json'));
  assert.throws(() => setup({ ...f.options, mode: 'verify' }, f.run, () => {}), /sources.json is missing/);
  f.apply();
  fs.writeFileSync(path.join(f.home, 'bin/umka'), '#!/bin/sh\nexit 0\n');
  assert.throws(() => setup({ ...f.options, mode: 'verify' }, f.run, () => {}), /CLI is missing or changed/);
  f.apply();
  setup({ ...f.options, mode: 'verify' }, f.run, () => {});
});

test('concurrent setup cannot enter the same home and failures release the lock', t => {
  const f = fixture(t);
  withLock(f.home, () => assert.throws(f.apply, /Another setup operation/));
  assert.throws(() => withLock(f.home, () => { throw new Error('interrupted'); }), /interrupted/);
  f.apply();
});

test('a lock whose owner has not yet recorded its PID reads as busy, not as a crash', t => {
  const lock = path.join(os.tmpdir(), `umka-t3code-${createHash('sha256').update('pidless').digest('hex').slice(0, 24)}.lock`);
  fs.mkdirSync(lock);
  t.after(() => fs.rmSync(lock, { recursive: true, force: true }));
  assert.equal(withLock('pidless', () => 'ran', () => 'busy'), 'busy');
  assert.throws(() => withLock('pidless', () => 'ran'), /Another setup operation/);
});

test('smoke retries reuse the recorded thread and an uncertain launch never duplicates work', t => {
  const f = fixture(t);
  const folder = path.join(f.home, 't3code/smoke');
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'state.json'), JSON.stringify({ launching: true, epicId: 'u-1', itemId: 'u-1.1' }));
  assert.throws(() => smoke({ ...f.options, mode: 'smoke' }, f.run, () => {}), /uncertain outcome/);
  assert.equal(f.calls.length, 0);
  fs.writeFileSync(path.join(folder, 'state.json'), JSON.stringify({ threadId: 'test', epicId: 'u-1', itemId: 'u-1.1' }));
  let launches = 0;
  const run = (exe, args) => {
    if (args.includes('start')) launches++;
    if (exe === 'bd') return JSON.stringify([
      { id: 'u-1', status: 'closed', close_reason: 'Reply' },
      { id: 'u-1.1', status: 'closed', assignee: 'test', close_reason: 'Reply' },
    ]);
    return JSON.stringify({ thread: { status: 'completed' }, messages: [{ text: 'Unit done: Reply' }] });
  };
  smoke({ ...f.options, mode: 'smoke' }, run, () => {});
  smoke({ ...f.options, mode: 'smoke' }, run, () => {});
  assert.equal(launches, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(folder, 'state.json'))).verified, true);
});
