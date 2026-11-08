// Create a disposable Umka home with one briefed checkpoint and open its inbox
// conversation in T3, to verify that a human can answer from a T3 thread.
import fs from 'node:fs';
import path from 'node:path';
import { command, write, setup, parse } from '../setup.mjs';
import { openInbox } from '../runtime.mjs';

if (!process.argv[2]) throw new Error('Usage: node umka/runtimes/t3code/testing/create-inbox.mjs NEW_DIRECTORY');
const dir = path.resolve(process.argv[2]);
const home = path.join(dir, 'home');
if (fs.existsSync(dir)) throw new Error('Fixture exists');

const o = parse(['apply', '--home', home, '--instance', 'inbox-test']);
setup({ ...o, mode: 'apply' });
const bd = args => command('bd', ['-C', home, ...args]);
const epic = JSON.parse(bd(['create', 'Disposable inbox decision', '--type', 'epic', '-l', 'loop',
  '-d', 'A synthetic setup checkpoint. No repository or source ticket. The fix is only to record that inbox replies work. No product decision or code work.', '--json']));
bd(['note', epic.id, 'channel: cli']);
const item = JSON.parse(bd(['create', 'checkpoint: decide fix', '--parent', epic.id, '-l', 'phase:decide-fix,checkpoint,briefed',
  '-d', 'Decide the synthetic inbox test fix: record that a human can answer in T3. No code changes. Does this test fix go ahead? Recommended answer: yes. Evidence: this setup fixture only. To answer: use the Umka inbox.', '--json']));
write(path.join(dir, 'state.json'), { dir, home, epicId: epic.id, itemId: item.id });
console.log(openInbox(o));
