import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { command, root, write } from './umka-t3code.mjs';
import { withT3Api } from './t3-api.mjs';

// Retain the old ID solely to disable an installed native, agent-backed timer.
export function scheduleId(o) {
  return `umka:${createHash('sha256').update(o.home).update('\0').update(o.instance).digest('hex').slice(0, 24)}`;
}
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
export function plist(job, o, everyMs, envPath = process.env.PATH || '/usr/bin:/bin', node = process.execPath) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${escape(job.label)}</string>
<key>ProgramArguments</key><array>${[node, path.join(root, 'scripts/umka-t3'), o.home, job.action, '--quiet'].map(a => `<string>${escape(a)}</string>`).join('')}</array>
<key>WorkingDirectory</key><string>${escape(o.project)}</string>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>${escape(envPath)}</string><key>UMKA_HOME</key><string>${escape(o.home)}</string></dict>
<key>StartInterval</key><integer>${everyMs / 1000}</integer>
<key>RunAtLoad</key><true/>
<key>Disabled</key><true/>
<key>Umask</key><integer>63</integer>
<key>StandardOutPath</key><string>/dev/null</string>
<key>StandardErrorPath</key><string>/dev/null</string>
</dict></plist>
`;
}

export async function schedule(o, action, args = [], connect = withT3Api, run = command, host = {}) {
  if ((host.platform || process.platform) !== 'darwin') throw new Error('Umka launchd scheduling requires macOS');
  let everyMs = 10000;
  if (args.length) {
    if (action !== 'schedule-install' || args.length !== 2 || args[0] !== '--every-ms') throw new Error('Only schedule-install accepts --every-ms N');
    everyMs = Number(args[1]);
    if (!Number.isSafeInteger(everyMs) || everyMs < 1000 || everyMs % 1000) throw new Error('Interval must be a whole number of seconds, at least 1000 milliseconds');
  }
  const folder = path.join(o.home, 't3code');
  const agentDir = path.join(host.userHome || os.homedir(), 'Library/LaunchAgents');
  const domain = `gui/${host.uid ?? process.getuid()}`;
  const prefix = `com.nomadec.umka.${scheduleId(o).slice(5)}`;
  const jobs = ['tick', 'inbox-open'].map(action => {
    const label = `${prefix}.${action === 'tick' ? 'tick' : 'inbox'}`;
    return { action, label, file: path.join(agentDir, `${label}.plist`), target: `${domain}/${label}` };
  });
  const loaded = job => {
    try { run('/bin/launchctl', ['print', job.target]); return true; }
    catch (e) { if (/could not find service|not found|no such process/i.test(e.message)) return false; throw e; }
  };
  const unload = job => { if (loaded(job)) run('/bin/launchctl', ['bootout', job.target]); };
  const load = job => {
    run('/bin/launchctl', ['enable', job.target]);
    if (!loaded(job)) run('/bin/launchctl', ['bootstrap', domain, job.file]);
  };
  const disable = job => {
    run('/bin/launchctl', ['disable', job.target]);
    unload(job);
  };
  const statePath = path.join(folder, 'launchd.json');
  if (action === 'schedule-status') {
    const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null;
    return { backend: 'launchd', everyMs: state?.everyMs ?? null, jobs: jobs.map(job => ({ ...job, installed: fs.existsSync(job.file), loaded: loaded(job) })) };
  }
  // The filesystem lock spans async API migration as well as launchctl mutations.
  const lock = path.join(folder, 'schedule.lock');
  fs.mkdirSync(folder, { recursive: true });
  try { fs.mkdirSync(lock); } catch (e) { if (e.code !== 'EEXIST') throw e; throw new Error(`Schedule management active or interrupted; inspect ${lock}`); }
  try {
    fs.writeFileSync(path.join(lock, 'pid'), String(process.pid));
    let state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null;
    if (action === 'schedule-install') {
      // Disable the old timer before any new dispatcher can run. Failure stops migration.
      const legacyPath = path.join(folder, 'schedule.json');
      if (fs.existsSync(legacyPath)) {
        const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
        if (legacy.scheduledTaskId && !legacy.disabledForLaunchd) {
          await connect(o, async api => {
            const { tasks } = await api.rpc('scheduledTasks.list');
            const old = tasks.find(t => t.id === legacy.scheduledTaskId);
            if (old?.enabled) await api.rpc('scheduledTasks.setEnabled', { id: old.id, enabled: false });
          });
          write(legacyPath, { ...legacy, disabledForLaunchd: true });
        }
      }
      fs.mkdirSync(agentDir, { recursive: true });
      const enabled = state?.enabled ?? false;
      state = { backend: 'launchd', everyMs, enabled, jobs };
      // Preserve PATH at install time; launchd does not read interactive shell profiles.
      for (const job of jobs) {
        const contents = plist(job, o, everyMs);
        const changed = !fs.existsSync(job.file) || fs.readFileSync(job.file, 'utf8') !== contents;
        if (changed) { unload(job); write(job.file, contents); }
        if (enabled) load(job);
        else disable(job);
      }
      write(statePath, state);
      return state;
    }
    if (!state) throw new Error('Run schedule-install first');
    if (action === 'schedule-uninstall') {
      for (const job of jobs) { unload(job); fs.rmSync(job.file, { force: true }); }
      fs.rmSync(statePath);
      return { status: 'uninstalled' };
    }
    if (action === 'schedule-run') {
      for (const job of jobs) run(process.execPath, [path.join(root, 'scripts/umka-t3'), o.home, job.action]);
      return { status: 'checked' };
    }
    if (!['enable', 'disable'].includes(action)) throw new Error(`Unknown schedule action: ${action}`);
    // Persist intent first so a failed or interrupted enable can be retried.
    state.enabled = action === 'enable';
    write(statePath, state);
    for (const job of jobs) state.enabled ? load(job) : disable(job);
    return state;
  } finally { fs.rmSync(lock, { recursive: true }); }
}
