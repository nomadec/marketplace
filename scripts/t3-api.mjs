// T3 protocol 2, verified against the locally installed T3 0.1.2 contracts.
// Uses the supported auth CLI and native WebSocket API, never the T3 database.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { command } from './umka-t3code.mjs';

const methods = new Set(['scheduledTasks.list', 'scheduledTasks.upsert', 'scheduledTasks.setEnabled', 'scheduledTasks.runNow', 'scheduledTasks.delete']);

export async function withT3Api(o, action) {
  const base = o.t3Home || process.env.T3CODE_HOME || path.join(os.homedir(), '.t3');
  const location = o.t3Home ? ['--base-dir', o.t3Home] : [];
  const origin = new URL(JSON.parse(fs.readFileSync(path.join(base, 'userdata/server-runtime.json'), 'utf8')).origin);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname)) throw new Error('This setup adapter only connects to a local T3 server');
  // Keep the token in memory. Do not include it in logs, files, or error messages.
  const auth = JSON.parse(command(o.t3, ['auth', 'session', 'issue', '--scope', 'orchestration:read', '--scope', 'orchestration:operate', '--ttl', '5m', '--label', 'Umka setup', '--json', ...location]));
  let ws;
  const pending = new Map();
  try {
    async function http(route, method = 'GET') {
      const res = await fetch(new URL(route, origin), { method, headers: { Authorization: `Bearer ${auth.token}` }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`T3 ${route}: HTTP ${res.status}`);
      return res.json();
    }
    const { ticket } = await http('/api/auth/websocket-ticket', 'POST');
    const url = new URL('/ws', origin);
    url.protocol = origin.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('wsTicket', ticket);
    url.searchParams.set('orchestrationProtocol', '2');
    ws = new WebSocket(url);
    const rejectAll = () => { for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('T3 connection closed; mutation outcome may be unknown. Reconcile before retrying.')); } pending.clear(); };
    ws.addEventListener('close', rejectAll);
    ws.addEventListener('message', event => {
      for (const line of String(event.data).split('\n').filter(Boolean)) {
        let decoded;
        try { decoded = JSON.parse(line); } catch { rejectAll(); continue; }
        for (const m of Array.isArray(decoded) ? decoded : [decoded]) {
          if (m._tag === 'Ping') { ws.send(JSON.stringify({ _tag: 'Pong' })); continue; }
          const p = pending.get(String(m.requestId));
          if (!p || m._tag !== 'Exit') continue;
          pending.delete(String(m.requestId)); clearTimeout(p.timer);
          if (m.exit?._tag === 'Success') p.resolve(m.exit.value);
          else p.reject(new Error(`T3 ${p.method} failed: ${JSON.stringify(m.exit?.cause || m.exit)}`));
        }
      }
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('T3 WebSocket connection timed out')), 15000);
      ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('T3 WebSocket connection failed')); }, { once: true });
    });
    let nextId = 0;
    const rpc = (method, payload = {}) => {
      if (!methods.has(method)) throw new Error(`Unsupported T3 method: ${method}`);
      return new Promise((resolve, reject) => {
        const id = String(++nextId);
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`T3 ${method} timed out; reconcile its outcome before retrying`)); }, 20000);
        pending.set(id, { resolve, reject, timer, method });
        ws.send(JSON.stringify({ _tag: 'Request', id, tag: method, payload, headers: [] }));
      });
    };
    return await action({ rpc, projects: () => http('/api/projects') });
  } finally {
    for (const p of pending.values()) clearTimeout(p.timer);
    ws?.close();
    command(o.t3, ['auth', 'session', 'revoke', auth.sessionId, ...location]);
  }
}
