// The registry on disk: the frontmatter of `phases/*.md`, parsed for `registry` and `queue`.
import fs from "node:fs";
import path from "node:path";

export const MODES = ["afk", "hitl", "checkpoint"];
export const KEYS = ["phase", "mode", "skill", "from", "to", "artifact", "budget", "ask", "auto-close when"];

// The YAML subset the frontmatter uses: `key: scalar`, `key: [a, b]`, `key: []`, and a block
// list of mappings (`key:` then `  - k: v` lines with `    k: v` continuations).
export function parseFrontmatter(text, file) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) throw new Error(`${file}: no frontmatter block`);
  const data = {};
  let listKey = null;
  for (const raw of m[1].split("\n")) {
    if (!raw.trim()) continue;
    const item = /^  - (.*)$/.exec(raw);
    const cont = /^    ([^:]+): (.*)$/.exec(raw);
    if (item && listKey) {
      const kv = /^([^:]+): (.*)$/.exec(item[1]);
      data[listKey].push(kv ? { [kv[1].trim()]: kv[2].trim() } : item[1].trim());
      continue;
    }
    if (cont && listKey && data[listKey].length) {
      data[listKey][data[listKey].length - 1][cont[1].trim()] = cont[2].trim();
      continue;
    }
    const kv = /^([^:]+):(.*)$/.exec(raw);
    if (!kv) throw new Error(`${file}: cannot read line "${raw}"`);
    const key = kv[1].trim();
    const value = kv[2].trim();
    if (value === "") { data[key] = []; listKey = key; continue; }
    listKey = null;
    const flow = /^\[(.*)\]$/.exec(value);
    data[key] = flow ? flow[1].split(",").map((s) => s.trim()).filter(Boolean) : value;
  }
  return data;
}

// Every phase file of `dir`, by slug: its frontmatter plus `file` and `body` (the markdown
// after the frontmatter).
export function load(dir) {
  const phases = {};
  const errors = [];
  if (!fs.existsSync(dir)) return { phases, errors: [`${dir}: no such folder`] };
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const file = path.join(dir, name);
    try {
      const text = fs.readFileSync(file, "utf8");
      const body = text.replace(/^---\n[\s\S]*?\n---\n/, "");
      phases[name.slice(0, -3)] = { file: name, body, ...parseFrontmatter(text, name) };
    } catch (e) {
      errors.push(e.message);
    }
  }
  return { phases, errors };
}
