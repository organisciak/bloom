#!/usr/bin/env node
/*
Print bloom's Obsidian tracker: Inbox lines still to triage, then open tasks by
priority. Runs as the Claude Code SessionStart hook (.claude/settings.json) so
every session starts knowing what Peter dictated. See AGENTS.md "Tasks".

  node tools/tasks.mjs          inbox + open tasks
  node tools/tasks.mjs --next   print the next free bl-NN id

BLOOM_TRACKER overrides the tracker folder (tests use it).
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_TRACKER = path.join(os.homedir(), 'workspace', 'Obsidian Vault', 'Projects', 'bloom');
const LIVE = ['open', 'doing', 'blocked'];

// Flat YAML frontmatter: `key: value`, with `- item` lists joined by spaces
export function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const out = {};
  let last = null;
  for (const line of (m ? m[1] : '').split('\n')) {
    const kv = line.match(/^(\w[\w-]*):(.*)$/);
    if (kv) {
      last = kv[1];
      out[last] = kv[2].trim();
    } else if (last && line.trim().startsWith('- ')) {
      out[last] = `${out[last]} ${line.trim().slice(2)}`.trim();
    }
  }
  return out;
}

export function readTasks(tracker) {
  const dir = path.join(tracker, 'Tasks');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => ({ ...frontmatter(fs.readFileSync(path.join(dir, f), 'utf8')), title: f.slice(0, -3) }));
}

export function nextId(tasks) {
  const nums = tasks
    .map((t) => t.id?.match(/^bl-(\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);
  return `bl-${String(Math.max(0, ...nums) + 1).padStart(2, '0')}`;
}

// Unticked `- [ ]` lines between `## Inbox` and the next heading
export function inboxLines(text) {
  const sec = text.match(/^## Inbox\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  return (sec ? sec[1] : '')
    .split('\n')
    .filter((l) => /^\s*- \[ \] \S/.test(l))
    .map((l) => l.trim());
}

export function report(tracker) {
  const tasks = readTasks(tracker);
  const inbox = inboxLines(fs.readFileSync(path.join(tracker, 'LLM Todos.md'), 'utf8'));
  const live = tasks
    .filter((t) => LIVE.includes(t.status))
    .sort((a, b) => (a.priority || '9').localeCompare(b.priority || '9') || (a.id || '').localeCompare(b.id || ''));
  const lines = [`# bloom tasks (Obsidian: ${tracker})`, ''];
  lines.push(`## Inbox: ${inbox.length} to triage${inbox.length ? ' (do this first; see AGENTS.md)' : ''}`, ...inbox);
  lines.push('', `## Open: ${live.length}   (next free id ${nextId(tasks)})`);
  for (const t of live) {
    const labels = t.labels ? `  [${t.labels}]` : '';
    lines.push(`- ${t.id} P${t.priority} ${t.status.padEnd(7)} ${t.title}${labels}`);
  }
  return lines.join('\n');
}

function main() {
  const tracker = process.env.BLOOM_TRACKER || DEFAULT_TRACKER;
  if (!fs.existsSync(path.join(tracker, 'Tasks'))) {
    console.log(`bloom tracker not found at ${tracker}`);
    return;
  }
  console.log(process.argv.includes('--next') ? nextId(readTasks(tracker)) : report(tracker));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
