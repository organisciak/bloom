import { EditorView, ViewPlugin, keymap, showTooltip } from '@codemirror/view';
import { Prec, StateEffect, StateField } from '@codemirror/state';
import { logger } from '@strudel/core';

const CLAUDE_COMMAND_REGEX = /\\(ai|claude)$/;
const CLAUDE_COMMAND_MAX_LEN = '\\claude'.length;

const openClaudePrompt = StateEffect.define();
const closeClaudePrompt = StateEffect.define();

const hasPrompt = (state) => state.field(claudePromptField, false);

const openPromptAt = (view, pos) => {
  const targetPos = pos ?? view.state.selection.main.head;
  view.dispatch({ effects: openClaudePrompt.of({ pos: targetPos }) });
  return true;
};

const closePrompt = (view) => {
  if (!hasPrompt(view.state)) {
    return false;
  }
  view.dispatch({ effects: closeClaudePrompt.of(null) });
  return true;
};

const setBusyState = (input, submit, cancel, status, busy) => {
  input.disabled = busy;
  submit.disabled = busy;
  cancel.disabled = busy;
  if (busy) {
    status.textContent = 'Claude is editing...';
  }
};

const createPromptDom = (view) => {
  const dom = document.createElement('div');
  dom.className = 'claude-prompt';

  const header = document.createElement('div');
  header.className = 'claude-prompt-title';
  header.textContent = 'Claude edit';

  const input = document.createElement('input');
  input.className = 'claude-prompt-input';
  input.type = 'text';
  input.placeholder = 'Describe the change you want (Enter to apply, Esc to close)';

  const status = document.createElement('div');
  status.className = 'claude-prompt-status';

  const actions = document.createElement('div');
  actions.className = 'claude-prompt-actions';

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'claude-prompt-button';
  submit.textContent = 'Apply';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'claude-prompt-button claude-prompt-secondary';
  cancel.textContent = 'Cancel';

  actions.appendChild(submit);
  actions.appendChild(cancel);

  dom.appendChild(header);
  dom.appendChild(input);
  dom.appendChild(status);
  dom.appendChild(actions);

  const closeAndFocus = () => {
    closePrompt(view);
    view.focus();
  };

  const submitRequest = async () => {
    const prompt = input.value.trim();
    if (!prompt) {
      status.textContent = 'Enter a request first.';
      return;
    }
    status.textContent = '';
    setBusyState(input, submit, cancel, status, true);

    const { from, to } = view.state.selection.main;
    const selection = from !== to ? view.state.sliceDoc(from, to) : '';
    const code = view.state.doc.toString();

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, code, selection }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Claude request failed.');
      }
      if (!data?.code) {
        throw new Error('Claude returned empty content.');
      }
      const nextCode = String(data.code);
      const length = view.state.doc.length;
      view.dispatch({
        changes: { from: 0, to: length, insert: nextCode },
      });
      logger('[claude] applied edits', 'highlight');
      closeAndFocus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Claude request failed.';
      status.textContent = message;
      logger(`[claude] ${message}`, 'highlight');
      setBusyState(input, submit, cancel, status, false);
    }
  };

  submit.addEventListener('click', submitRequest);
  cancel.addEventListener('click', closeAndFocus);

  input.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      closeAndFocus();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      submitRequest();
    }
  });

  dom.addEventListener('keydown', (event) => event.stopPropagation());

  setTimeout(() => {
    input.focus();
  }, 0);

  return dom;
};

const createTooltip = (pos) => ({
  pos,
  above: true,
  strictSide: true,
  class: 'strudel-claude-tooltip',
  create(view) {
    const dom = createPromptDom(view);
    return { dom };
  },
});

const claudePromptField = StateField.define({
  create() {
    return null;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(openClaudePrompt)) {
        return createTooltip(effect.value.pos);
      }
      if (effect.is(closeClaudePrompt)) {
        return null;
      }
    }
    if (!value) {
      return null;
    }
    if (tr.docChanged) {
      return { ...value, pos: tr.changes.mapPos(value.pos) };
    }
    return value;
  },
  provide: (field) => showTooltip.from(field),
});

const getCommandMatch = (state) => {
  const { head } = state.selection.main;
  if (!state.selection.main.empty) {
    return null;
  }
  const line = state.doc.lineAt(head);
  const prefix = line.text.slice(0, head - line.from);
  const tail = prefix.slice(-CLAUDE_COMMAND_MAX_LEN);
  const match = tail.match(CLAUDE_COMMAND_REGEX);
  if (!match) {
    return null;
  }
  const command = match[0];
  return { from: head - command.length, to: head };
};

const claudeCommandPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.view = view;
      this.ignoreNext = false;
    }

    update(update) {
      if (this.ignoreNext) {
        this.ignoreNext = false;
        return;
      }
      const hasUserInput = update.transactions.some(
        (tr) => tr.isUserEvent('input') || tr.isUserEvent('input.type'),
      );
      if (!hasUserInput || !update.docChanged) {
        return;
      }
      const command = getCommandMatch(update.state);
      if (!command) {
        return;
      }
      this.ignoreNext = true;
      update.view.dispatch({
        changes: { from: command.from, to: command.to, insert: '' },
        selection: { anchor: command.from },
        effects: openClaudePrompt.of({ pos: command.from }),
      });
    }
  },
);

const claudeKeymap = Prec.highest(
  keymap.of([
    {
      key: 'Mod-\\',
      preventDefault: true,
      run: (view) => openPromptAt(view),
    },
    {
      key: 'Escape',
      run: (view) => closePrompt(view),
    },
  ]),
);

export const claudePrompt = [claudePromptField, claudeCommandPlugin, claudeKeymap];
