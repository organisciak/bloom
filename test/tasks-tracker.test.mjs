import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { frontmatter, inboxLines, nextId, readTasks, report } from '../tools/tasks.mjs';

const note = (fm, body = 'What and why.') => `---\n${fm}\n---\n\n${body}\n`;

describe('tasks tracker', () => {
  let tracker;

  beforeAll(() => {
    // Arrange: a tiny fake vault folder shaped like Projects/bloom
    tracker = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-tracker-'));
    fs.mkdirSync(path.join(tracker, 'Tasks'));
    const write = (name, text) => fs.writeFileSync(path.join(tracker, 'Tasks', `${name}.md`), text);
    write('Ship slides', note('id: bl-03\nstatus: doing\npriority: 2\nlabels:\n  - needs-peter'));
    write('Fix the bug', note('id: bl-09\nstatus: open\npriority: 1\nlabels:'));
    write('Old thing', note('id: bl-11\nstatus: done\npriority: 1'));
    fs.writeFileSync(
      path.join(tracker, 'LLM Todos.md'),
      ['Intro', '', '## Inbox', '', '- [ ] make it purple', '- [x] already handled', '- [ ] ', '', '## Triaged', '', '- [ ] not inbox'].join('\n'),
    );
  });

  afterAll(() => fs.rmSync(tracker, { recursive: true, force: true }));

  it('reads flat frontmatter and joins list values', () => {
    const fm = frontmatter(note('id: bl-01\nclosed: \nlabels:\n  - needs-peter\n  - big\nblocked_by:\n  - "[[Other]]"'));
    expect(fm).toMatchObject({ id: 'bl-01', closed: '', labels: 'needs-peter big', blocked_by: '"[[Other]]"' });
  });

  it('next id follows the highest id, even when a done task holds it', () => {
    // Ids are never reused, so closed tasks still count
    expect(nextId(readTasks(tracker))).toBe('bl-12');
    expect(nextId([])).toBe('bl-01');
  });

  it('inbox only picks unticked, non-empty lines inside the Inbox section', () => {
    const text = fs.readFileSync(path.join(tracker, 'LLM Todos.md'), 'utf8');
    expect(inboxLines(text)).toEqual(['- [ ] make it purple']);
    // Inbox as the last section still parses
    expect(inboxLines('## Inbox\n- [ ] tail item')).toEqual(['- [ ] tail item']);
  });

  it('report lists live tasks by priority and hides done ones', () => {
    const out = report(tracker);
    expect(out).toContain('## Inbox: 1 to triage');
    expect(out).toContain('next free id bl-12');
    expect(out.indexOf('bl-09')).toBeLessThan(out.indexOf('bl-03'));
    expect(out).toContain('[needs-peter]');
    expect(out).not.toContain('Old thing');
  });
});
