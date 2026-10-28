// Recurring tick and inbox checks as launchd agents (macOS) or systemd user timers (Linux).
// Install writes the unit files disabled; enable/disable flip them and persist across login.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { command, root, write, withLock } from './umka-t3code.mjs';
import { withT3Api } from './t3-api.mjs';

// Retain the old ID solely to disable an installed native, agent-backed timer.
export function scheduleId(o) {
  return `umka:${createHash('sha256').update(o.home).update('\0').update(o.instance).digest('hex').slice(0, 24)}`;
}
const checkArgs = (o, job) => [path.join(root, 'scripts/umka-t3'), o.home, job.action, '--quiet'];

const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
export function plist(job, o, everyMs, envPath = process.env.PATH || '/usr/bin:/bin', node = process.execPath) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${xml(job.label)}</string>
<key>ProgramArguments</key><array>${[node, ...checkArgs(o, job)].map(a => `<string>${xml(a)}</string>`).join('')}</array>
<key>WorkingDirectory</key><string>${xml(o.project)}</string>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>${xml(envPath)}</string><key>UMKA_HOME</key><string>${xml(o.home)}</string></dict>
<key>StartInterval</key><integer>${everyMs / 1000}</integer>
<key>RunAtLoad</key><true/>
<key>Disabled</key><true/>
<key>Umask</key><integer>63</integer>
<key>StandardOutPath</key><string>/dev/null</string>
<key>StandardErrorPath</key><string>/dev/null</string>
</dict></plist>
`;
}

// systemd unit quoting: double quotes with backslash escapes; % is a specifier.
const quote = value => `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('%', '%%')}"`;
export function systemdUnits(job, o, everyMs, envPath = process.env.PATH || '/usr/bin:/bin', node = process.execPath) {
  const service = `[Unit]
Description=Umka ${o.instance} ${job.action} check

[Service]
Type=oneshot
ExecStart=${[node, ...checkArgs(o, job)].map(quote).join(' ')}
WorkingDirectory=${quote(o.project)}
Environment=${quote(`PATH=${envPath}`)} ${quote(`UMKA_HOME=${o.home}`)}
UMask=0077
StandardOutput=null
StandardError=null
`;
  const timer = `[Unit]
Description=Umka ${o.instance} ${job.action} timer

[Timer]
OnActiveSec=0
OnUnitActiveSec=${everyMs / 1000}s
AccuracySec=1s
Unit=${job.label}.service

[Install]
WantedBy=timers.target
`;
  return { service, timer };
}

function launchd(o, host, run) {
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
  return {
    name: 'launchd', jobs, loaded, unload,
    stateFile: 'launchd.json',
    files: (job, everyMs) => ({ [job.file]: plist(job, o, everyMs) }),
    prepare: () => fs.mkdirSync(agentDir, { recursive: true }),
    reload: () => {},
    load: job => {
      run('/bin/launchctl', ['enable', job.target]);
      if (!loaded(job)) run('/bin/launchctl', ['bootstrap', domain, job.file]);
    },
    disable: job => {
      run('/bin/launchctl', ['disable', job.target]);
      unload(job);
    },
    remove: job => fs.rmSync(job.file, { force: true }),
  };
}

function systemd(o, host, run) {
  const userHome = host.userHome || os.homedir();
  const unitDir = path.join(host.configHome || process.env.XDG_CONFIG_HOME || path.join(userHome, '.config'), 'systemd/user');
  const uid = host.uid ?? process.getuid();
  // A shell reached through sudo -iu has no user bus; point systemctl at the user's runtime directory.
  const env = { ...process.env, XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || `/run/user/${uid}`, DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS || `unix:path=/run/user/${uid}/bus` };
  const systemctl = args => run('systemctl', ['--user', ...args], { env });
  const prefix = `umka-${scheduleId(o).slice(5)}`;
  const jobs = ['tick', 'inbox-open'].map(action => {
    const label = `${prefix}-${action === 'tick' ? 'tick' : 'inbox'}`;
    return { action, label, file: path.join(unitDir, `${label}.timer`), service: path.join(unitDir, `${label}.service`), target: `${label}.timer` };
  });
  const loaded = job => systemctl(['show', '-p', 'ActiveState', '--value', job.target]) === 'active';
  const unload = job => { if (loaded(job)) systemctl(['stop', job.target]); };
  return {
    name: 'systemd', jobs, loaded, unload,
    stateFile: 'systemd.json',
    files: (job, everyMs) => { const u = systemdUnits(job, o, everyMs); return { [job.service]: u.service, [job.file]: u.timer }; },
    prepare: () => fs.mkdirSync(unitDir, { recursive: true }),
    reload: () => systemctl(['daemon-reload']),
    load: job => {
      systemctl(['enable', job.target]);
      if (!loaded(job)) systemctl(['start', job.target]);
    },
    disable: job => {
      systemctl(['disable', job.target]);
      unload(job);
    },
    remove: job => { fs.rmSync(job.file, { force: true }); fs.rmSync(job.service, { force: true }); },
  };
}

export function backend(o, host = {}, run = command) {
  const platform = host.platform || process.platform;
  if (platform === 'darwin') return launchd(o, host, run);
  if (platform === 'linux') return systemd(o, host, run);
  throw new Error(`Umka scheduling requires macOS (launchd) or Linux (systemd user timers); found ${platform}`);
}

export async function schedule(o, action, args = [], connect = withT3Api, run = command, host = {}) {
  const b = backend(o, host, run);
  let everyMs = 10000;
  if (args.length) {
    if (action !== 'schedule-install' || args.length !== 2 || args[0] !== '--every-ms') throw new Error('Only schedule-install accepts --every-ms N');
    everyMs = Number(args[1]);
    if (!Number.isSafeInteger(everyMs) || everyMs < 1000 || everyMs % 1000) throw new Error('Interval must be a whole number of seconds, at least 1000 milliseconds');
  }
  const folder = path.join(o.home, 't3code');
  const { jobs } = b;
  const statePath = path.join(folder, b.stateFile);
  if (action === 'schedule-status') {
    const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null;
    return { backend: b.name, everyMs: state?.everyMs ?? null, jobs: jobs.map(job => ({ ...job, installed: fs.existsSync(job.file), loaded: b.loaded(job) })) };
  }
  // The lock spans async API migration as well as service manager mutations.
  return withLock(`${o.home}:schedule`, async () => {
    fs.mkdirSync(folder, { recursive: true });
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
            if (!old) throw new Error(`Recorded T3 scheduled task ${legacy.scheduledTaskId} is not in this T3 base dir. Disable it where it lives, then delete ${legacyPath} to continue.`);
            if (old.enabled) await api.rpc('scheduledTasks.setEnabled', { id: old.id, enabled: false });
          });
          write(legacyPath, { ...legacy, disabledForLaunchd: true });
        }
      }
      b.prepare();
      const enabled = state?.enabled ?? false;
      state = { backend: b.name, everyMs, enabled, jobs };
      // Preserve PATH at install time; service managers do not read interactive shell profiles.
      let changedAny = false;
      for (const job of jobs) {
        const files = b.files(job, everyMs);
        const changed = Object.entries(files).some(([file, contents]) => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== contents);
        if (changed) { b.unload(job); for (const [file, contents] of Object.entries(files)) write(file, contents); changedAny = true; }
      }
      if (changedAny) b.reload();
      for (const job of jobs) enabled ? b.load(job) : b.disable(job);
      write(statePath, state);
      return state;
    }
    if (!state) throw new Error('Run schedule-install first');
    if (action === 'schedule-uninstall') {
      // Disable as well as unload, so no enable override outlives the unit files.
      for (const job of jobs) { b.disable(job); b.remove(job); }
      b.reload();
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
    for (const job of jobs) state.enabled ? b.load(job) : b.disable(job);
    return state;
  });
}
