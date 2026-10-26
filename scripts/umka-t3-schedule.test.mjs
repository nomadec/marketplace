import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
  assert.equal(fs.existsSync(path.join(f.o.home, 't3code/schedule.lock')), false);
});

test('invalid intervals and non-macOS hosts fail before installation', async t => {
  const f = fixture(t);
  await assert.rejects(f.call('schedule-install', ['--every-ms', '1500']), /whole number/);
  await assert.rejects(schedule(f.o, 'schedule-install', [], null, f.run, { platform: 'linux' }), /requires macOS/);
  assert.equal(fs.existsSync(f.o.home), false);
});

test('launchctl errors other than a missing service propagate', async t => {
  const f = fixture(t);
  await assert.rejects(schedule(f.o, 'schedule-status', [], null, () => { throw new Error('permission denied'); }, f.host), /permission denied/);
});
