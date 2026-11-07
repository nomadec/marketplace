// The registry on disk: the frontmatter of `phases/*.md`, parsed for `phases/registry` and the runtimes.
import fs from "node:fs";
import path from "node:path";

export const MODES = ["afk", "hitl", "checkpoint"];
export const KEYS = ["phase", "mode", "skill", "from", "to", "artifact", "budget", "ask", "auto-close when", "rounds"];
export const SKILL_NAME = /^[a-z0-9][a-z0-9_-]*$/;

// What `skill:` names: a skill of this plugin (`umka:<name>`), the human (`human`), or a
// command the phase runs itself (`tool: <command>`). Null when the field has none of the forms.
export function parseSkill(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (s === "human") return { kind: "human" };
  const skill = /^umka:(\S+)$/.exec(s);
  if (skill) return { kind: "skill", name: skill[1] };
  const tool = /^tool:\s*(.+)$/.exec(s);
  if (tool) return { kind: "tool", command: tool[1].trim() };
  return null;
}

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

// Every phase file of `dir`, by slug: its frontmatter plus `file`, `body` (the markdown after
// the frontmatter) and `call` (the parsed `skill:`). `rounds` is a number when it is a positive
// integer, the raw text otherwise, so lint can name what is wrong.
export function load(dir) {
  const phases = {};
  const errors = [];
  if (!fs.existsSync(dir)) return { phases, errors: [`${dir}: no such folder`] };
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const file = path.join(dir, name);
    try {
      const text = fs.readFileSync(file, "utf8");
      const body = text.replace(/^---\n[\s\S]*?\n---\n/, "");
      const p = { file: name, body, ...parseFrontmatter(text, name) };
      p.call = parseSkill(p.skill);
      if (typeof p.rounds === "string" && /^[1-9][0-9]*$/.test(p.rounds)) p.rounds = Number(p.rounds);
      phases[name.slice(0, -3)] = p;
    } catch (e) {
      errors.push(e.message);
    }
  }
  return { phases, errors };
}
