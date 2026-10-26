import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { command, write, shellQuote } from './umka-t3code.mjs';
import { withT3Api } from './t3-api.mjs';
import { t3call } from './umka-t3-runtime.mjs';

export function scheduleId(o) {
  return `umka:${createHash('sha256').update(o.home).update('\0').update(o.instance).digest('hex').slice(0, 24)}`;
}
export function schedulePrompt(o) {
  return `Umka scheduled tick for instance ${o.instance}. Run exactly this shell command:\n${shellQuote(path.join(o.home, 'bin/umka-t3'))} tick\nThe command selects and launches at most one phase in a separate T3 thread, and prevents overlapping managed turns. Do not run umka tick or umka inbox, invoke a skill yourself, answer human checkpoints, modify the runner journal, or launch extra work. If the command reports idle, busy, or waiting, stop without a status message. If it started work, report its item ID and thread ID in one line. If it fails, report the error so the owner can inspect it. Human decisions belong in the Umka inbox or the phase's thread.`;
}
export async function schedule(o, action, args = [], connect = withT3Api, run = command) {
  let everyMs = 300000;
  if (args.length) {
    if (action !== 'schedule-install' || args.length !== 2 || args[0] !== '--every-ms') throw new Error('Only schedule-install accepts --every-ms N');
    everyMs = Number(args[1]);
    if (!Number.isSafeInteger(everyMs) || everyMs < 60000) throw new Error('Schedule interval must be at least 60000 milliseconds');
  }
  const folder = path.join(o.home, 't3code');
  fs.mkdirSync(folder, { recursive: true });
  const lock = path.join(folder, 'schedule.lock');
  try { fs.mkdirSync(lock); } catch (e) { if (e.code !== 'EEXIST') throw e; throw new Error(`Schedule setup is already active or interrupted. Inspect ${lock} before removing it.`); }
  try {
    fs.writeFileSync(path.join(lock, 'pid'), String(process.pid));
    return await connect(o, async api => {
      const id = scheduleId(o);
      const { tasks } = await api.rpc('scheduledTasks.list');
      const existing = tasks.find(t => t.id === id);
      if (action === 'schedule-status') return existing || { id, status: 'not-installed' };
      if (action !== 'schedule-install') {
        if (!existing) throw new Error('Run schedule-install first');
        if (action === 'schedule-run') return api.rpc('scheduledTasks.runNow', { id });
        if (!['enable', 'disable'].includes(action)) throw new Error(`Unknown schedule action: ${action}`);
        return api.rpc('scheduledTasks.setEnabled', { id, enabled: action === 'enable' });
      }
      const { projects } = await api.projects();
      const project = projects.find(p => p.workspaceRoot === o.project && p.deletedAt === null);
      if (!project) throw new Error('The exact T3 project is missing; rerun setup apply');
      const statePath = path.join(folder, 'schedule.json');
      let state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
      if (!state.threadId && existing?.threadId) state = { threadId: existing.threadId };
      if (!state.threadId) {
        if (state.launching) throw new Error('Scheduler chat launch is uncertain; inspect T3 and schedule.json before retrying');
        write(statePath, { launching: true });
        const launch = JSON.parse(t3call(o, run, ['thread', 'start', project.id, `This is the scheduler control chat for Umka instance ${o.instance}. Setup will bind a recurring task here. No product work is requested now. Reply only: Umka scheduler ready.`, '--title', `Umka ${o.instance}: scheduler`, '--json']));
        if (!launch.threadId) throw new Error('T3 returned no scheduler thread id');
        state = { threadId: launch.threadId };
        write(statePath, state);
      }
      const { thread } = JSON.parse(t3call(o, run, ['thread', 'show', state.threadId, '--messages', '1', '--json']));
      if (!thread.providerInstanceId || !thread.model) throw new Error('T3 scheduler thread has no model selection');
      const payload = {
        id, commandId: `umka-setup:${randomUUID()}`, title: `Umka ${o.instance}: tick`,
        prompt: schedulePrompt(o), enabled: existing?.enabled ?? false,
        schedule: { type: 'interval', everyMs }, projectId: project.id, threadId: state.threadId,
        workspaceStrategy: { type: 'root' },
        modelSelection: { instanceId: thread.providerInstanceId, model: thread.model },
        runtimeMode: thread.runtimeMode, interactionMode: thread.interactionMode,
        createdBy: 'user', creationSource: 'mcp',
      };
      // Stable ID reconciles a timeout or interrupted response without duplicate schedules.
      const result = await api.rpc('scheduledTasks.upsert', payload);
      write(statePath, { threadId: state.threadId, scheduledTaskId: id });
      return result;
    });
  } finally { fs.rmSync(lock, { recursive: true }); }
}
