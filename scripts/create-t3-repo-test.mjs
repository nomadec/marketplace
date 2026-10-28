// Create a disposable repository fixture plus an Umka home whose single ready item
// is a one-line fix in that repository. Used to exercise a real managed phase end to end.
import fs from 'node:fs';
import path from 'node:path';
import { command, write, setup, parse } from './umka-t3code.mjs';

if (!process.argv[2]) throw new Error('Usage: node scripts/create-t3-repo-test.mjs NEW_DIRECTORY');
const dir = path.resolve(process.argv[2]);
if (fs.existsSync(dir)) throw new Error('Fixture exists; use the saved state instead of recreating it');
fs.mkdirSync(dir, { recursive: true });
const repo = path.join(dir, 'repo');
const remote = path.join(dir, 'remote.git');
const home = path.join(dir, 'home');

command('git', ['init', '--bare', '--initial-branch=main', remote]);
command('git', ['clone', remote, repo]);
command('git', ['-C', repo, 'config', 'user.name', 'Umka Setup Test']);
command('git', ['-C', repo, 'config', 'user.email', 'test@example.invalid']);
write(path.join(repo, 'package.json'), { name: 'umka-runtime-fixture', private: true, type: 'module', scripts: { test: 'node --test' } });
write(path.join(repo, 'add.mjs'), 'export const add = (a, b) => a - b;\n');
write(path.join(repo, 'add.test.mjs'), [
  "import { test } from 'node:test';",
  "import assert from 'node:assert/strict';",
  "import { add } from './add.mjs';",
  "test('adds positive values', () => assert.equal(add(2, 3), 5));",
  "test('adds negative values', () => assert.equal(add(-2, -3), -5));",
  '',
].join('\n'));
write(path.join(repo, 'docs/issues/fix-add.md'), '# Fix addition\n\nThe add function subtracts instead of adding. Cause: add.mjs uses minus. Reproduction: npm test fails both regression tests. Change the implementation so both tests pass. No other behavior is requested.\n\n## Activity\n');
write(path.join(repo, 'docs/agents/issue-tracker.md'), '# Local file tracker\nThis disposable repository uses Markdown files in docs/issues as its tracker. Append status/comments to that file in the unit worktree, commit and push to the local origin. Never call gh or any remote tracker. origin is a local bare repository.\n');
write(path.join(repo, 'CLAUDE.md'), '# Disposable Umka runtime fixture\nThis is a setup integration test, not product work. The tracker is docs/issues; follow docs/agents/issue-tracker.md. Test with npm test. Only push to the existing local filesystem origin. Do not open a GitHub PR or contact external services. The default branch is main.\n');
command('git', ['-C', repo, 'add', '.']);
command('git', ['-C', repo, 'commit', '-m', 'Add failing addition fixture']);
command('git', ['-C', repo, 'push', '-u', 'origin', 'main']);

setup(parse(['apply', '--home', home, '--instance', 'repo-test', '--repo', `fixture=${repo}`]));
const bd = args => command('bd', ['-C', home, ...args]);
const epic = JSON.parse(bd(['create', 'Disposable addition fix', '--type', 'epic', '-l', 'loop',
  '-d', 'Fix the local fixture addition function. repo: fixture. Source ticket: docs/issues/fix-add.md in the fixture repository. No GitHub.', '--json']));
bd(['note', epic.id, 'repo: fixture']);
bd(['note', epic.id, 'channel: cli']);
const fix = JSON.parse(bd(['create', 'fix: addition in disposable repo', '--parent', epic.id, '-l', 'phase:fix',
  '-d', `Source ticket: docs/issues/fix-add.md in repo fixture (${repo}); use the unit worktree copy when commenting. Reproduction is complete: add.mjs subtracts its arguments and the two tests in add.test.mjs fail. The human approved this exact one-line fix for the disposable setup test. Create the unit worktree as the run skill says, fix addition, run npm test, append a local tracker note, commit and push only to the local origin. Do not open a PR; the next phase is outside this turn. Budget: 10k. Resume from: docs/issues/fix-add.md.`,
  '--json']));
write(path.join(dir, 'state.json'), { dir, repo, remote, home, epicId: epic.id, itemId: fix.id });
console.log(JSON.stringify({ dir, home, epicId: epic.id, itemId: fix.id }));
