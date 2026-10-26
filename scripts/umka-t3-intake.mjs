import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { command, write } from './umka-t3code.mjs';
import { runtimeLock, journal, settleActive, readQueue, homeInstructions, t3call } from './umka-t3-runtime.mjs';

const read = (file, fallback) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;

// Poll only. Import and model dispatch happen separately, under the instance lock.
export function poll(source, cursor, run = command) {
  if (source.kind === 'github') {
    const since = cursor?.created ? ` created:>=${cursor.created}` : '';
    return JSON.parse(run('gh', ['issue', 'list', '--repo', source.repo, '--state', 'all', '--limit', '200',
      '--search', `sort:created-asc${since}`, '--json', 'number,title,body,author,labels,url,createdAt']))
      .filter(i => String(i.number) !== String(cursor?.id))
      .map(i => ({ id: String(i.number), title: i.title, text: i.body || '', who: i.author?.login || 'unknown',
        created: i.createdAt, labels: (i.labels || []).map(l => l.name), link: i.url }))
      .sort((a, b) => a.created.localeCompare(b.created) || Number(a.id) - Number(b.id));
  }
  if (source.kind === 'file') {
    const items = fs.readFileSync(source.path, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    const at = cursor?.id ? items.findIndex(i => String(i.id) === String(cursor.id)) : -1;
    return items.slice(at + 1).map(i => ({ ...i, id: String(i.id), link: `${source.path}#${i.id}` }));
  }
  throw new Error(`Source ${source.name}: unsupported kind ${source.kind}`);
}

function collect(o, issues, run) {
  const { sources } = read(path.join(o.home, 'sources.json'), { sources: [] });
  const cursors = read(path.join(o.home, 'cursors.json'), {});
  if (!Array.isArray(sources) || !cursors || typeof cursors !== 'object' || Array.isArray(cursors)) throw new Error('Invalid sources.json or cursors.json');
  const names = new Set();
  for (const source of sources) {
    if (!source.name || names.has(source.name)) throw new Error('Intake sources need unique names');
    names.add(source.name);
    if (!['github', 'file'].includes(source.kind)) throw new Error(`Source ${source.name}: unsupported kind ${source.kind}`);
    if (source.kind === 'github' && !source.repo) throw new Error(`Source ${source.name}: repo is required`);
    if (source.kind === 'file' && (!source.path || !path.isAbsolute(source.path))) throw new Error(`Source ${source.name}: path must be absolute`);
  }
  const known = new Set(issues.map(i => i.external_ref).filter(Boolean));
  const entries = [];
  for (const source of sources) {
    const items = poll(source, cursors[source.name], run);
    for (const item of items) {
      if (!item.id || item.id === 'undefined' || !item.title || !item.link) throw new Error(`Source ${source.name}: item needs an id, title and link`);
      if (known.has(item.link)) continue;
      known.add(item.link);
      entries.push({ source: { name: source.name, repoKey: source.repo_key }, item });
    }
    const last = items.at(-1);
    if (last) cursors[source.name] = { id: last.id, ...(last.created ? { created: last.created } : {}) };
  }
  return { id: randomUUID(), entries, cursors };
}

export function intake(o, { dry = false } = {}, run = command) {
  return runtimeLock(o, () => {
    const runner = journal(o);
    if (!dry) {
      const busy = settleActive(o, runner, run);
      if (busy) return busy;
    }
    const { issues, decision } = readQueue(o, run);
    if (!dry && decision.inProgress.length) return { status: 'busy', inProgress: decision.inProgress };
    const file = path.join(o.home, 't3code/intake.json');
    let batch = read(file, {}).pending;
    // A crash after saving the launched thread but before clearing pending is recoverable.
    if (batch && runner.data.history.some(h => h.intakeBatchId === batch.id)) {
      if (!dry) write(file, { pending: null });
      batch = null;
    }
    if (dry) {
      const preview = collect(o, issues, run);
      return { status: 'dry-run', items: preview.entries.map(e => ({ source: e.source.name, ...e.item })), pending: batch?.entries.map(e => ({ link: e.item.link, epicId: e.epicId || null })) || [] };
    }
    if (!batch) {
      batch = collect(o, issues, run);
      if (!batch.entries.length) {
        write(path.join(o.home, 'cursors.json'), batch.cursors);
        return { status: 'empty', epicIds: [] };
      }
      // Snapshot the batch before importing, so crashes cannot orphan unclassified epics.
      write(file, { pending: batch });
    }
    const byLink = new Map(issues.filter(i => i.external_ref).map(i => [i.external_ref, i]));
    for (const entry of batch.entries) {
      let epic = byLink.get(entry.item.link);
      if (entry.epicId && epic?.id !== entry.epicId) throw new Error(`Imported epic ${entry.epicId} is missing; inspect intake.json`);
      if (!epic) {
        if (entry.creating) throw new Error(`Import outcome for ${entry.item.link} is uncertain; inspect beads and intake.json before retrying`);
        entry.creating = true;
        write(file, { pending: batch });
        const labels = entry.item.labels?.length ? `\nSource labels: ${entry.item.labels.join(', ')}` : '';
        epic = JSON.parse(run('bd', ['-C', o.home, 'create', entry.item.title, '--type', 'epic', '-l', 'loop', '--external-ref', entry.item.link,
          '-d', `${entry.item.text || ''}\n\nSent by ${entry.item.who || 'unknown'} (${entry.source.name}).${labels}`, '--json']));
        if (!epic.id) throw new Error('Beads returned no epic id; inspect the import outcome');
        byLink.set(entry.item.link, epic);
      }
      entry.epicId = epic.id;
      entry.creating = false;
      write(file, { pending: batch });
      for (const note of ['channel: cli', ...(entry.source.repoKey ? [`repo: ${entry.source.repoKey}`] : [])]) {
        if (!(epic.notes || '').split('\n').includes(note)) run('bd', ['-C', o.home, 'note', epic.id, note]);
      }
    }
    write(path.join(o.home, 'cursors.json'), batch.cursors);
    const epicIds = batch.entries.map(e => e.epicId);
    const args = `intake ${epicIds.join(' ')} afk`;
    const prompt = `${homeInstructions(o)} Invoke the Skill tool with skill "umka:run" and args ${JSON.stringify(args)}. Follow exactly the intake phase for these imported epics in this fresh T3 thread. Classify each epic, set its topic and class, lay bug pre-work when required, and create or extend the sort items as the phase says. Do not run terminal claude, intake, tick, inbox-open, or any subsequent phase. Do not answer human decisions. End with the intake result line. The separate tick and inbox dispatchers handle later work.`;
    runner.data.active = { kind: 'intake', intakeBatchId: batch.id, epicIds, launching: true };
    write(runner.file, runner.data);
    const launched = JSON.parse(t3call(o, run, ['thread', 'start', o.project, prompt, '--title', `Umka ${o.instance}: intake (${epicIds.length} ${epicIds.length === 1 ? 'item' : 'items'})`, '--json']));
    if (!launched.threadId) throw new Error('T3 returned no intake thread id; inspect the launch outcome');
    runner.data.active.threadId = launched.threadId;
    runner.data.active.launching = false;
    write(runner.file, runner.data);
    write(file, { pending: null });
    return { status: 'started', epicIds, threadId: launched.threadId };
  });
}
