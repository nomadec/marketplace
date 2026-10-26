import fs from 'node:fs';
import path from 'node:path';
import { command, root, write, shellQuote, withLock } from './umka-t3code.mjs';

// A real AFK phase, with no code changes, remote tracker, or live queue involved.
// Persist the fixture and launch intent before starting a thread. An uncertain
// launch is never retried automatically: the first thread may still be running.
export function smoke(o, run = command, log = console.log) {
  const folder = path.join(o.home, 't3code/smoke', ...(o.smokeRun ? ['runs', o.smokeRun] : []));
  return withLock(folder, () => runSmoke(o, folder, run, log));
}

function runSmoke(o, folder, run, log) {
  const home = path.join(folder, 'home');
  const statePath = path.join(folder, 'state.json');
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
  const t3 = args => run(o.t3, [...args, ...(o.t3Home ? ['--base-dir', o.t3Home] : [])]);
  const bd = args => run('bd', ['-C', home, ...args]);
  if (!state.threadId && o.mode === 'smoke-status') throw new Error('No smoke thread is recorded. Run smoke first.');
  if (state.launching && !state.threadId) throw new Error(`The previous launch has an uncertain outcome. Inspect T3 threads and ${statePath}; do not launch a duplicate.`);
  if (!state.threadId) {
    if (!fs.existsSync(path.join(home, '.beads'))) {
      run(process.execPath, [path.join(root, 'umka/skills/run/queue'), 'init'], { env: { ...process.env, UMKA_HOME: home } });
    }
    const issues = JSON.parse(bd(['list', '--all', '-n', '0', '--json']));
    const title = 'Umka T3 setup smoke test';
    let epic = issues.find(i => i.issue_type === 'epic' && i.title === title);
    if (!epic) epic = JSON.parse(bd(['create', title, '--type', 'epic', '-l', 'loop', '-d', 'A local runtime verification. No repository or external tracker. Reply only in the CLI channel.', '--json']));
    if (!state.epicId) bd(['note', epic.id, 'channel: cli']);
    state.epicId = epic.id;
    write(statePath, state);
    let item = issues.find(i => i.parent === epic.id && i.title === 'answer: runtime smoke test');
    if (!item) item = JSON.parse(bd(['create', 'answer: runtime smoke test', '--parent', epic.id, '-l', 'phase:answer', '-d', 'The local setup has verified its prerequisites. Reply in the CLI channel: Umka runs in T3 Code. There is no source ticket, repository, or worktree. Claim this item and follow the answer phase close-out. Budget: 5k. Resume from: this brief.', '--json']));
    state.itemId = item.id;
    state.launching = true;
    write(statePath, state);
    const prompt = `This is the isolated Umka runtime smoke test. Use only the beads home ${JSON.stringify(home)} for this turn. In EVERY shell invocation, set UMKA_HOME=${shellQuote(home)}, and use bd -C ${shellQuote(home)} for EVERY beads command. Never use the default ~/.umka store or any other store. There is no source ticket, no repository work, and the channel is cli. Invoke the Skill tool with skill "umka:run" and args "${item.id} afk", then follow it for exactly this one answer phase. Do not start a nested claude process. Stop after close-out and the result line. If the skill cannot load, report that and stop.`;
    write(path.join(folder, 'prompt.txt'), prompt + '\n');
    const result = t3(['thread', 'start', o.project, prompt, '--title', `Umka ${o.instance}: runtime smoke test`, '--json']);
    write(path.join(folder, 'launch.json'), result + '\n');
    const parsed = JSON.parse(result);
    state.threadId = parsed.threadId || parsed.thread?.threadId || parsed.id;
    if (!state.threadId) throw new Error(`T3 did not return a thread id. Inspect ${path.join(folder, 'launch.json')} before retrying.`);
    state.launching = false;
    write(statePath, state);
    log(`Smoke thread started: ${state.threadId}. Run smoke-status to verify it.`);
    return state;
  }
  const result = t3(['thread', 'show', state.threadId, '--messages', '8', '--json']);
  write(path.join(folder, 'thread.json'), result + '\n');
  const issues = JSON.parse(bd(['list', '--all', '-n', '0', '--json']));
  const item = issues.find(i => i.id === state.itemId);
  const epic = issues.find(i => i.id === state.epicId);
  if (item?.status !== 'closed' || epic?.status !== 'closed' || JSON.parse(result).thread?.status !== 'completed') {
    log(`Smoke not complete: thread ${state.threadId}; item ${item?.status}, epic ${epic?.status}. Inspect ${path.join(folder, 'thread.json')}.`);
    process.exitCode = 2;
    return state;
  }
  if (!item.assignee || !item.close_reason || !epic.close_reason || !result.includes('Unit done:')) throw new Error('Smoke closed without the expected claim, close reasons, or final result line; inspect the thread');
  state.verified = true;
  write(statePath, state);
  log(`Smoke passed: ${state.threadId}; ${state.itemId} claimed and closed; ${state.epicId} closed; result line recorded.`);
  return state;
}
