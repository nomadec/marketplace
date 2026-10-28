import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { schedule } from './umka-t3-schedule.mjs';

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'umka-launchd-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const o = { home: path.join(dir, 'umka & home'), instance: 'test', project: dir, t3: '/test/t3' };
  const host = { platform: 'darwin', userHome: dir, uid: 501 };
  const loaded = new Set();
  const disabled = new Set();
  const calls = [];
  const run = (exe, args) => {
    calls.push({ exe, args });
    if (exe !== '/bin/launchctl') return '{}';
    if (args[0] === 'print') { if (!loaded.has(args[1])) throw new Error('Could not find service'); return 'loaded'; }
    if (args[0] === 'bootstrap') {
      const label = path.basename(args[2], '.plist');
      assert.equal(disabled.has(`${args[1]}/${label}`), false);
      loaded.add(`${args[1]}/${label}`); return '';
    }
    if (args[0] === 'enable') { disabled.delete(args[1]); return ''; }
    if (args[0] === 'disable') { disabled.add(args[1]); return ''; }
    if (args[0] === 'bootout') { loaded.delete(args[1]); return ''; }
    throw new Error(`Unexpected ${args}`);
  };
  const connect = async () => { throw new Error('No native API expected'); };
  return { dir, o, host, loaded, disabled, calls, run, call: (action, args = [], api = connect) => schedule(o, action, args, api, run, host) };
}

test('install produces two 10-second jobs without model turns; enable/reinstall/disable/uninstall are idempotent', async t => {
  const f = fixture(t);
  const first = await f.call('schedule-install');
  assert.equal(first.everyMs, 10000);
  assert.equal(first.enabled, false);
  assert.equal(f.loaded.size, 0);
  assert.equal(f.disabled.size, 2);
  assert.deepEqual(first.jobs.map(j => j.action), ['tick', 'inbox-open']);
  for (const job of first.jobs) {
    const contents = fs.readFileSync(job.file, 'utf8');
    assert.match(contents, /<key>StartInterval<\/key><integer>10<\/integer>/);
    assert.match(contents, /umka &amp; home/);
    assert.match(contents, /--quiet/);
    assert.match(contents, /<key>PATH<\/key>/);
    assert.match(contents, /<key>RunAtLoad<\/key><true\/>/);
    assert.match(contents, /<key>Disabled<\/key><true\/>/);
  }
  await f.call('enable');
  assert.equal(f.loaded.size, 2);
  const bootstraps = f.calls.filter(c => c.args[0] === 'bootstrap').length;
  await f.call('schedule-install');
  assert.equal(f.loaded.size, 2);
  assert.equal(f.calls.filter(c => c.args[0] === 'bootstrap').length, bootstraps);
  assert.equal((await f.call('schedule-status')).jobs.every(j => j.loaded), true);
  await f.call('disable');
  await f.call('disable');
  assert.equal(f.disabled.size, 2);
  assert.equal(f.loaded.size, 0);
  await f.call('schedule-uninstall');
  assert.equal(first.jobs.every(j => !fs.existsSync(j.file)), true);
});

test('uninstall disables the jobs so no enable override survives the unit files', async t => {
  const f = fixture(t);
  await f.call('schedule-install');
  await f.call('enable');
  assert.equal(f.disabled.size, 0);
  await f.call('schedule-uninstall');
  assert.equal(f.disabled.size, 2);
  assert.equal(f.loaded.size, 0);
  const g = systemdFixture(t);
  await g.call('schedule-install');
  await g.call('enable');
  await g.call('schedule-uninstall');
  assert.equal(g.enabled.size, 0);
  assert.equal(g.active.size, 0);
});

test('migration refuses to continue when the recorded native timer cannot be found', async t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.o.home, 't3code'), { recursive: true });
  const file = path.join(f.o.home, 't3code/schedule.json');
  fs.writeFileSync(file, JSON.stringify({ scheduledTaskId: 'elsewhere' }));
  const connect = async (_o, action) => action({ rpc: async () => ({ tasks: [{ id: 'other', enabled: true }] }) });
  await assert.rejects(f.call('schedule-install', [], connect), /elsewhere is not in this T3 base dir/);
  assert.equal(JSON.parse(fs.readFileSync(file)).disabledForLaunchd, undefined);
  assert.equal(fs.existsSync(path.join(f.dir, 'Library/LaunchAgents')), false);
});

test('migration disables only the recorded native timer before installing launchd jobs', async t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.o.home, 't3code'), { recursive: true });
  const file = path.join(f.o.home, 't3code/schedule.json');
  fs.writeFileSync(file, JSON.stringify({ scheduledTaskId: 'old-umka', threadId: 'scheduler' }));
  const mutations = [];
  const connect = async (_o, action) => action({ rpc: async (method, payload) => {
    if (method === 'scheduledTasks.list') return { tasks: [{ id: 'old-umka', enabled: true }, { id: 'other', enabled: true }] };
    mutations.push(payload); return {};
  } });
  await f.call('schedule-install', [], connect);
  assert.deepEqual(mutations, [{ id: 'old-umka', enabled: false }]);
  await f.call('schedule-install');
  assert.equal(JSON.parse(fs.readFileSync(file)).disabledForLaunchd, true);
});

test('failed migration prevents installation and can be retried', async t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.o.home, 't3code'), { recursive: true });
  fs.writeFileSync(path.join(f.o.home, 't3code/schedule.json'), JSON.stringify({ scheduledTaskId: 'old' }));
  await assert.rejects(f.call('schedule-install'), /No native API expected/);
  assert.equal(fs.existsSync(path.join(f.dir, 'Library/LaunchAgents')), false);
  const connect = async (_o, action) => action({ rpc: async () => ({ tasks: [{ id: 'old', enabled: false }] }) });
  assert.equal((await f.call('schedule-install', [], connect)).enabled, false);
});

test('the schedule lock is held across the async migration, so a concurrent command fails fast', async t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.o.home, 't3code'), { recursive: true });
  fs.writeFileSync(path.join(f.o.home, 't3code/schedule.json'), JSON.stringify({ scheduledTaskId: 'old' }));
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const held = f.call('schedule-install', [], async (_o, action) => { await gate; return action({ rpc: async () => ({ tasks: [{ id: 'old', enabled: false }] }) }); });
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(f.call('schedule-install'), /Another setup operation/);
  release();
  assert.equal((await held).enabled, false);
  assert.equal((await f.call('disable')).enabled, false);
});

test('invalid intervals and unsupported hosts fail before installation', async t => {
  const f = fixture(t);
  await assert.rejects(f.call('schedule-install', ['--every-ms', '1500']), /whole number/);
  await assert.rejects(schedule(f.o, 'schedule-install', [], null, f.run, { platform: 'win32' }), /requires macOS .* or Linux/);
  assert.equal(fs.existsSync(f.o.home), false);
});

function systemdFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'umka-systemd-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const o = { home: path.join(dir, 'umka "50%" home'), instance: 'test', project: dir, t3: '/test/t3' };
  const host = { platform: 'linux', userHome: dir, uid: 1000 };
  const active = new Set();
  const enabled = new Set();
  const calls = [];
  const run = (exe, args, options) => {
    calls.push({ exe, args });
    if (exe !== 'systemctl') return '{}';
    assert.equal(args[0], '--user');
    assert.equal(options.env.XDG_RUNTIME_DIR, process.env.XDG_RUNTIME_DIR || '/run/user/1000');
    const [, verb, ...rest] = args;
    const unit = rest.at(-1);
    if (verb === 'show') return active.has(unit) ? 'active' : 'inactive';
    if (verb === 'daemon-reload') return '';
    if (verb === 'start') { assert.equal(fs.existsSync(path.join(dir, '.config/systemd/user', unit)), true); active.add(unit); return ''; }
    if (verb === 'stop') { active.delete(unit); return ''; }
    if (verb === 'enable') { enabled.add(unit); return ''; }
    if (verb === 'disable') { enabled.delete(unit); return ''; }
    throw new Error(`Unexpected ${args}`);
  };
  const connect = async () => { throw new Error('No native API expected'); };
  return { dir, o, host, active, enabled, calls, run, call: (action, args = []) => schedule(o, action, args, connect, run, host) };
}

// Lets a real systemd parse the generated units when the host has one; the fixture only mocks systemctl.
function verifyUnits(jobs) {
  const analyze = spawnSync('systemd-analyze', ['--version'], { stdio: 'ignore' });
  if (analyze.error || analyze.status !== 0) return;
  for (const job of jobs) {
    const r = spawnSync('systemd-analyze', ['--user', 'verify', job.service, job.file], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${job.label}: ${r.stderr}`);
    assert.doesNotMatch(r.stderr, /fatal error|not absolute/);
  }
}

test('linux hosts install two systemd user timers with the same lifecycle', async t => {
  const f = systemdFixture(t);
  const first = await f.call('schedule-install');
  assert.equal(first.backend, 'systemd');
  assert.equal(first.enabled, false);
  assert.equal(f.active.size, 0);
  assert.deepEqual(first.jobs.map(j => j.action), ['tick', 'inbox-open']);
  assert.equal(f.calls.filter(c => c.args[1] === 'daemon-reload').length, 1);
  for (const job of first.jobs) {
    const timer = fs.readFileSync(job.file, 'utf8');
    assert.match(timer, /OnUnitActiveSec=10s/);
    assert.match(timer, /WantedBy=timers.target/);
    const service = fs.readFileSync(job.service, 'utf8');
    assert.match(service, /Type=oneshot/);
    assert.match(service, /umka \\"50%%\\" home/);
    assert.match(service, /--quiet/);
    assert.match(service, /Environment="PATH=/);
    // WorkingDirectory is not word-split, so it must be unquoted or systemd rejects the unit.
    assert.equal(service.split('\n').find(l => l.startsWith('WorkingDirectory=')), `WorkingDirectory=${f.dir}`);
  }
  verifyUnits(first.jobs);
  assert.equal(fs.existsSync(path.join(f.o.home, 't3code/systemd.json')), true);
  await f.call('enable');
  assert.equal(f.active.size, 2);
  assert.equal(f.enabled.size, 2);
  const starts = f.calls.filter(c => c.args[1] === 'start').length;
  await f.call('schedule-install');
  assert.equal(f.active.size, 2);
  assert.equal(f.calls.filter(c => c.args[1] === 'start').length, starts);
  assert.equal(f.calls.filter(c => c.args[1] === 'daemon-reload').length, 1);
  assert.equal((await f.call('schedule-status')).jobs.every(j => j.loaded), true);
  await f.call('schedule-install', ['--every-ms', '30000']);
  assert.equal(f.calls.filter(c => c.args[1] === 'daemon-reload').length, 2);
  assert.match(fs.readFileSync(first.jobs[0].file, 'utf8'), /OnUnitActiveSec=30s/);
  await f.call('disable');
  assert.equal(f.active.size, 0);
  assert.equal(f.enabled.size, 0);
  await f.call('schedule-uninstall');
  assert.equal(first.jobs.every(j => !fs.existsSync(j.file) && !fs.existsSync(j.service)), true);
  assert.equal(fs.existsSync(path.join(f.o.home, 't3code/systemd.json')), false);
});

test('launchctl errors other than a missing service propagate', async t => {
  const f = fixture(t);
  await assert.rejects(schedule(f.o, 'schedule-status', [], null, () => { throw new Error('permission denied'); }, f.host), /permission denied/);
});
