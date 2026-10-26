import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BD_VERSION = '1.3.1';
const pluginId = 'umka@marketplace';
const help = `Usage: scripts/setup-umka-t3code check|apply|verify|smoke|smoke-status [options]

  --instance NAME    Instance name (default: local)
  --home PATH        Umka home (default: UMKA_HOME or ~/.umka)
  --repo NAME=PATH   Register a repo; repeatable. Existing mappings are preserved.
  --t3 PATH          T3 executable (default: t3 on PATH, or ~/.t3/bin/t3)
  --t3-home PATH     Explicit T3 base directory, passed to its CLI
  --smoke-run NAME   Named smoke cycle; reuse its thread on retry

check reports prerequisites and planned changes without applying them.
apply installs the published plugin if needed, creates missing home files,
      registers the T3 project, and writes a setup receipt and instance CLI.
verify checks the receipt, home, plugin contents, T3 connectivity and dry-run pick.
smoke runs one synthetic AFK answer phase in a separate beads home and T3 thread.
smoke-status verifies that test's result; smoke resumes an existing test.

Requires Node >=22.3, git, Claude Code, bd ${BD_VERSION}, and a running T3 server.
Dependency installation/authentication and the T3 service belong to the lower layer.
No recurring schedule is enabled by this script. No live item is executed.
`;

export function command(executable, args, options = {}) {
  const r = spawnSync(executable, args, {
    cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024,
    ...options,
  });
  if (r.error || r.status !== 0) {
    throw new Error(`${path.basename(executable)} ${args.slice(0, 3).join(' ')}: ${r.error?.message || r.stderr?.trim() || r.stdout?.trim() || `exit ${r.status}`}`);
  }
  return r.stdout.trim();
}

export function parse(args) {
  const o = { mode: args.shift() || 'check', instance: 'local', home: process.env.UMKA_HOME || path.join(os.homedir(), '.umka'), repos: {}, project: root };
  if (o.mode === '--help' || o.mode === '-h') return { mode: 'help' };
  if (!['check', 'apply', 'verify', 'smoke', 'smoke-status'].includes(o.mode)) throw new Error(help);
  while (args.length) {
    const key = args.shift();
    if (!['--instance', '--home', '--repo', '--t3', '--t3-home', '--smoke-run'].includes(key)) throw new Error(`Unknown option: ${key}`);
    const value = args.shift();
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    if (key === '--repo') {
      const at = value.indexOf('=');
      const name = value.slice(0, at);
      if (at < 1 || !/^[a-zA-Z0-9_-]+$/.test(name) || !value.slice(at + 1)) throw new Error('--repo needs NAME=PATH');
      o.repos[name] = path.resolve(value.slice(at + 1));
    } else o[{ '--instance': 'instance', '--home': 'home', '--t3': 't3', '--t3-home': 't3Home', '--smoke-run': 'smokeRun' }[key]] = value;
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(o.instance)) throw new Error('Instance name must contain only letters, numbers, _ or -');
  if (o.smokeRun && !/^[a-zA-Z0-9_-]+$/.test(o.smokeRun)) throw new Error('Smoke run name must contain only letters, numbers, _ or -');
  o.home = path.resolve(o.home);
  if (o.t3Home) o.t3Home = path.resolve(o.t3Home);
  if (!o.t3) {
    const onPath = (process.env.PATH || '').split(path.delimiter).some(p => fs.existsSync(path.join(p, 't3')));
    o.t3 = onPath ? 't3' : path.join(os.homedir(), '.t3/bin/t3');
  }
  return o;
}

const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
export function write(p, value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n';
  if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === text) return;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text, { mode: 0o600 });
  fs.renameSync(tmp, p);
}
function object(p, fallback) {
  const value = fs.existsSync(p) ? read(p) : fallback;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Expected an object in ${p}`);
  return value;
}
export function digest(dir) {
  const hash = createHash('sha256');
  function visit(base) {
    for (const e of fs.readdirSync(path.join(dir, base), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      // Claude creates this cache marker when a session loads the plugin.
      if (!base && e.name === '.in_use') continue;
      const rel = path.join(base, e.name);
      if (e.isDirectory()) visit(rel);
      else if (e.isFile()) hash.update(rel).update('\0').update(fs.readFileSync(path.join(dir, rel))).update('\0');
      else throw new Error(`Unsupported plugin entry: ${rel}`);
    }
  }
  visit('');
  return hash.digest('hex');
}
export const shellQuote = s => `'${s.replaceAll("'", "'\\''")}'`;
function t3(o, run, args) { return run(o.t3, [...args, ...(o.t3Home ? ['--base-dir', o.t3Home] : [])]); }

export function withLock(key, work, onBusy) {
  const lock = path.join(os.tmpdir(), `umka-t3code-${createHash('sha256').update(key).digest('hex').slice(0, 24)}.lock`);
  try { fs.mkdirSync(lock, { mode: 0o700 }); }
  catch (e) {
    if (e.code !== 'EEXIST') throw e;
    if (onBusy) {
      const pid = Number(fs.readFileSync(path.join(lock, 'pid'), 'utf8'));
      if (Number.isInteger(pid) && pid > 0) {
        try { process.kill(pid, 0); return onBusy(); } catch (error) { if (error.code !== 'ESRCH') throw error; }
      }
    }
    throw new Error(`Another setup operation may be active (${lock}). After a crash, inspect the recorded PID and outcome before removing this lock.`);
  }
  try {
    fs.writeFileSync(path.join(lock, 'pid'), String(process.pid));
    return work();
  } finally { fs.rmSync(lock, { recursive: true }); }
}

function config(o) {
  const receiptPath = path.join(o.home, 't3code/setup.json');
  const receipt = fs.existsSync(receiptPath) ? read(receiptPath) : null;
  if (receipt && (receipt.instance !== o.instance || receipt.project !== o.project)) throw new Error(`This home is configured for ${receipt.instance} at ${receipt.project}; use its options or a separate home`);
  const reposPath = path.join(o.home, 'repos.json');
  const repos = object(reposPath, {});
  for (const [name, location] of Object.entries(o.repos)) {
    if (Object.hasOwn(repos, name) && repos[name] !== location) throw new Error(`Repo ${name} already maps to ${repos[name]}; refusing to replace it with ${location}`);
    repos[name] = location;
  }
  for (const [name, location] of Object.entries(repos)) {
    if (typeof location !== 'string' || !path.isAbsolute(location) || !fs.existsSync(location)) throw new Error(`Repo ${name} is not an existing absolute path: ${location}`);
  }
  const sources = object(path.join(o.home, 'sources.json'), { sources: [] });
  if (!Array.isArray(sources.sources)) throw new Error('sources.json must contain a sources array');
  object(path.join(o.home, 'cursors.json'), {});
  return { receiptPath, receipt, reposPath, repos };
}

function prerequisites(o, run) {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 3)) throw new Error('Node >=22.3 is required');
  const bd = run('bd', ['--version']);
  if (!new RegExp(`^bd version ${BD_VERSION.replaceAll('.', '\\.')}([ (]|$)`).test(bd)) throw new Error(`Install bd ${BD_VERSION} in the dependency layer; found ${bd}. This script never migrates a database.`);
  run('git', ['--version']);
  const claude = run('claude', ['--version']);
  const t3Version = run(o.t3, ['--version']);
  // This works before registration too: T3 may resolve an ancestor project.
  // Registration below still checks the exact project path.
  try { t3(o, run, ['thread', 'list', '--project', o.project, '--json']); }
  catch (e) {
    if (!/project.*not found|no (T3 Code )?project|could not resolve.*project/i.test(e.message)) throw new Error(`T3 is not reachable: ${e.message}`);
  }
  return { node: process.versions.node, bd: BD_VERSION, claude, t3: t3Version };
}

function installed(run) {
  return JSON.parse(run('claude', ['plugin', 'list', '--json'])).filter(p => p.id === pluginId);
}
function pluginMatches(p, expected) {
  return p?.enabled && p.scope === 'user' && p.version === expected.version && p.installPath && fs.existsSync(p.installPath) && digest(p.installPath) === expected.digest;
}
function ensurePlugin(o, run, expected) {
  let entries = installed(run);
  if (entries.some(p => p.scope !== 'user')) throw new Error('Remove the project/local Umka override before setup so the runtime loads one version');
  if (entries.some(p => pluginMatches(p, expected))) return true;
  if (o.mode !== 'apply') return false;
  const markets = JSON.parse(run('claude', ['plugin', 'marketplace', 'list', '--json']));
  const market = markets.find(m => m.name === 'marketplace');
  if (market && (market.source !== 'github' || market.repo !== 'nomadec/marketplace')) throw new Error('Marketplace name is already used by a different source');
  if (!market) run('claude', ['plugin', 'marketplace', 'add', 'nomadec/marketplace']);
  run('claude', ['plugin', 'marketplace', 'update', 'marketplace', '--json']);
  run('claude', ['plugin', entries.length ? 'update' : 'install', pluginId, '--scope', 'user', '--json']);
  if (entries.some(p => !p.enabled)) run('claude', ['plugin', 'enable', pluginId, '--scope', 'user']);
  entries = installed(run);
  if (!entries.some(p => pluginMatches(p, expected))) throw new Error('Installed Umka differs from this checkout (version or contents). Align the checkout and published plugin, then rerun. Setup is incomplete.');
  return true;
}

function ensureHome(o, run, c) {
  const beads = path.join(o.home, '.beads');
  if (!fs.existsSync(beads)) {
    fs.mkdirSync(o.home, { recursive: true });
    // queue init is runtime-independent and preserves existing config files.
    run(process.execPath, [path.join(root, 'umka/skills/run/queue'), 'init'], { env: { ...process.env, UMKA_HOME: o.home } });
  }
  // An existing or partially initialized database must pass health, never reinit it.
  run('bd', ['-C', o.home, 'ready', '--json', '--brief', '-n', '0']);
  for (const [name, fallback] of [['sources.json', { sources: [] }], ['cursors.json', {}]]) {
    const p = path.join(o.home, name);
    if (!fs.existsSync(p)) write(p, fallback);
  }
  write(c.reposPath, c.repos);
}

function wrapper(o) {
  return `#!/bin/sh\n# Generated by setup-umka-t3code. The queue itself has no T3 dependency.\nexport UMKA_HOME=${shellQuote(o.home)}\nexec ${shellQuote(process.execPath)} ${shellQuote(path.join(root, 'umka/skills/run/queue'))} "$@"\n`;
}

function runtimeWrapper(o) {
  return `#!/bin/sh\n# Generated by setup-umka-t3code: T3 runtime adapter.\nexec ${shellQuote(process.execPath)} ${shellQuote(path.join(root, 'scripts/umka-t3'))} ${shellQuote(o.home)} "$@"\n`;
}

export function setup(o, run = command, log = console.log) {
  return o.mode === 'apply' ? withLock(o.home, () => configure(o, run, log)) : configure(o, run, log);
}

function configure(o, run, log) {
  const c = config(o); // Validate conflicts before touching plugins or the home.
  const versions = prerequisites(o, run);
  const plugin = path.join(root, 'umka');
  const expected = { version: read(path.join(plugin, '.claude-plugin/plugin.json')).version, digest: digest(plugin) };
  run(process.execPath, [path.join(plugin, 'skills/run/registry'), 'lint']);
  const matched = ensurePlugin(o, run, expected);
  const receipt = { schema: 2, instance: o.instance, home: o.home, project: o.project, t3: o.t3, t3Home: o.t3Home || null, versions, plugin: expected, repos: c.repos };
  if (o.mode === 'apply') {
    ensureHome(o, run, c);
    try { t3(o, run, ['project', 'add', o.project, '--title', 'Umka']); }
    catch (e) { if (!e.message.includes('ProjectAlreadyExistsError')) throw e; }
    t3(o, run, ['thread', 'list', '--project', o.project, '--json']);
    write(path.join(o.home, 'bin/umka'), wrapper(o));
    fs.chmodSync(path.join(o.home, 'bin/umka'), 0o700);
    write(path.join(o.home, 'bin/umka-t3'), runtimeWrapper(o));
    fs.chmodSync(path.join(o.home, 'bin/umka-t3'), 0o700);
  } else if (o.mode === 'check') {
    log(`bd ${BD_VERSION}; ${versions.t3}; plugin ${expected.version}: ${matched ? 'matches checkout' : 'needs install/refresh'}`);
    log(`Home ${o.home}: ${fs.existsSync(path.join(o.home, '.beads')) ? 'preserve existing database' : 'initialize on apply'}`);
    log(`Repos: ${Object.keys(c.repos).join(', ') || '(none)'}; setup does not change schedule state`);
    return receipt;
  } else {
    if (!matched) throw new Error('Plugin version or contents do not match this checkout; run apply');
    if (!c.receipt || JSON.stringify(c.receipt) !== JSON.stringify(receipt)) throw new Error('Setup receipt is missing or stale; run apply with these options');
    const bin = path.join(o.home, 'bin/umka');
    if (!fs.existsSync(bin) || fs.readFileSync(bin, 'utf8') !== wrapper(o) || !(fs.statSync(bin).mode & 0o100)) throw new Error('Instance CLI is missing or changed; run apply');
    const runtimeBin = path.join(o.home, 'bin/umka-t3');
    if (!fs.existsSync(runtimeBin) || fs.readFileSync(runtimeBin, 'utf8') !== runtimeWrapper(o) || !(fs.statSync(runtimeBin).mode & 0o100)) throw new Error('T3 runtime CLI is missing or changed; run apply');
    for (const name of ['repos.json', 'sources.json', 'cursors.json']) {
      if (!fs.existsSync(path.join(o.home, name))) throw new Error(`${name} is missing; run apply`);
    }
    run('bd', ['-C', o.home, 'ready', '--json', '--brief', '-n', '0']);
  }
  log(run(process.execPath, [path.join(plugin, 'skills/run/queue'), 'tick', '--dry-run'], { env: { ...process.env, UMKA_HOME: o.home } }));
  if (o.mode === 'apply') write(c.receiptPath, receipt); // Success only after health and dry-run pass.
  log(`${o.mode === 'apply' ? 'Configured' : 'Verified'} ${o.instance}: ${o.home}. Schedule state unchanged.`);
  return receipt;
}

export async function main() {
  const o = parse(process.argv.slice(2));
  if (o.mode === 'help') { console.log(help); return; }
  if (o.mode === 'smoke' || o.mode === 'smoke-status') {
    setup({ ...o, mode: 'verify' });
    const { smoke } = await import('./umka-t3code-smoke.mjs');
    smoke(o);
  } else setup(o);
}
