import { EditorView, ViewPlugin, keymap, showTooltip } from '@codemirror/view';
import { Prec, StateEffect, StateField } from '@codemirror/state';
import { logger } from '@strudel/core';
import { buildClaudePrompt, getCommandByMode, matchInlineCommand } from './claude_commands.mjs';

const getBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) {
    const base = import.meta.env.BASE_URL;
    return base.endsWith('/') ? base : `${base}/`;
  }
  return '/';
};

const buildApiUrl = (path) => {
  if (path.startsWith('http')) return path;
  const base = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${cleanPath}`;
};

const getSoundContext = () => {
  if (typeof window === 'undefined') return undefined;
  return window.__strudelSoundContext;
};

const openClaudePrompt = StateEffect.define();
const closeClaudePrompt = StateEffect.define();

const hasPrompt = (state) => state.field(claudePromptField, false);

const openPromptAt = (view, pos, mode = 'edit') => {
  const targetPos = pos ?? view.state.selection.main.head;
  view.dispatch({ effects: openClaudePrompt.of({ pos: targetPos, mode }) });
  return true;
};

const closePrompt = (view) => {
  if (!hasPrompt(view.state)) {
    return false;
  }
  view.dispatch({ effects: closeClaudePrompt.of(null) });
  return true;
};

const setBusyState = (input, submit, cancel, status, suggestionsList, busy) => {
  input.disabled = busy;
  submit.disabled = busy;
  cancel.disabled = busy;
  if (suggestionsList) {
    suggestionsList.querySelectorAll('button').forEach((button) => {
      button.disabled = busy;
    });
  }
  if (busy) {
    status.textContent = '';
    const dotsContainer = document.createElement('span');
    dotsContainer.className = 'loading-dots';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      dotsContainer.appendChild(dot);
    }
    status.appendChild(dotsContainer);
    const text = document.createTextNode(' Refining code...');
    status.appendChild(text);
  }
};

const createPromptDom = (view, mode) => {
  const command = getCommandByMode(mode);
  const isSuggestionsMode = mode === 'suggestions';
  const canApplySuggestions = mode === 'edit';
  const dom = document.createElement('div');
  dom.className = 'claude-prompt';

  const header = document.createElement('div');
  header.className = 'claude-prompt-title';
  header.textContent = command.label;

  const input = document.createElement('input');
  input.className = 'claude-prompt-input';
  input.type = 'text';
  input.placeholder = command.placeholder;

  const status = document.createElement('div');
  status.className = 'claude-prompt-status';

  const suggestions = document.createElement('div');
  suggestions.className = 'claude-prompt-suggestions';

  const suggestionsTitle = document.createElement('div');
  suggestionsTitle.className = 'claude-prompt-suggestions-title';
  suggestionsTitle.textContent = isSuggestionsMode ? 'Tweak ideas' : 'Suggestions';

  const suggestionsList = document.createElement('div');
  suggestionsList.className = 'claude-prompt-suggestions-list';

  const suggestionsStatus = document.createElement('div');
  suggestionsStatus.className = 'claude-prompt-suggestions-status';
  suggestionsStatus.textContent = 'Loading suggestions...';

  suggestions.appendChild(suggestionsTitle);
  suggestions.appendChild(suggestionsList);
  suggestions.appendChild(suggestionsStatus);

  const actions = document.createElement('div');
  actions.className = 'claude-prompt-actions';

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'claude-prompt-button';
  submit.textContent = 'Apply';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'claude-prompt-button claude-prompt-secondary';
  cancel.textContent = isSuggestionsMode ? 'Close' : 'Cancel';

  actions.appendChild(submit);
  actions.appendChild(cancel);

  dom.appendChild(header);
  dom.appendChild(input);
  dom.appendChild(suggestions);
  dom.appendChild(status);
  dom.appendChild(actions);

  const closeAndFocus = () => {
    closePrompt(view);
    view.focus();
  };

  const submitRequest = async (overridePrompt) => {
    const prompt = buildClaudePrompt(mode, overridePrompt ?? input.value);
    if (!prompt) {
      status.textContent = 'Enter a request first.';
      return;
    }
    status.textContent = '';
    setBusyState(input, submit, cancel, status, suggestionsList, true);

    const { from, to } = view.state.selection.main;
    const selection = from !== to ? view.state.sliceDoc(from, to) : '';
    const code = view.state.doc.toString();
    const soundContext = getSoundContext();

    try {
      const response = await fetch(buildApiUrl('/api/claude-api'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, code, selection, soundContext }),
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

      logger('[edit] applied changes', 'highlight');
      closeAndFocus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed.';
      status.textContent = '';
      status.className = 'claude-prompt-status fade-in';
      status.textContent = message;
      logger(`[edit] ${message}`, 'highlight');
      setBusyState(input, submit, cancel, status, suggestionsList, false);
    }
  };

  const renderSuggestions = (items) => {
    suggestionsList.innerHTML = '';
    items.forEach((item) => {
      const container = document.createElement('div');
      container.className = 'claude-prompt-suggestion-item';

      const title = typeof item.title === 'string' ? item.title.trim() : '';
      const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : '';
      const why = typeof item.why === 'string' ? item.why.trim() : '';
      const label = title || prompt || '';

      if (canApplySuggestions) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'claude-prompt-suggestion';
        button.textContent = label;
        button.addEventListener('click', () => {
          submitRequest(prompt);
        });
        container.appendChild(button);
      } else {
        const labelText = document.createElement('div');
        labelText.className = 'claude-prompt-suggestion claude-prompt-suggestion--static';
        labelText.textContent = label;
        container.appendChild(labelText);
      }

      if (prompt && prompt !== label) {
        const detail = document.createElement('div');
        detail.className = 'claude-prompt-suggestion-detail';
        detail.textContent = prompt;
        container.appendChild(detail);
      }

      if (why) {
        const reason = document.createElement('div');
        reason.className = 'claude-prompt-suggestion-why';
        reason.textContent = why;
        container.appendChild(reason);
      }

      suggestionsList.appendChild(container);
    });
  };

  const loadSuggestions = async () => {
    const { from, to } = view.state.selection.main;
    const selection = from !== to ? view.state.sliceDoc(from, to) : '';
    const code = view.state.doc.toString();
    const soundContext = getSoundContext();

    suggestionsStatus.textContent = 'Loading suggestions...';
    suggestionsStatus.className = 'claude-prompt-suggestions-status';
    try {
      const response = await fetch(buildApiUrl('/api/claude-suggestions'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, selection, soundContext }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Suggestions unavailable.');
      }
      const items = Array.isArray(data?.suggestions) ? data.suggestions : [];
      if (!items.length) {
        suggestionsStatus.textContent = 'No suggestions yet.';
        return;
      }
      suggestionsStatus.textContent = '';
      renderSuggestions(items);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Suggestions unavailable.';
      suggestionsStatus.textContent = message;
    }
  };

  submit.addEventListener('click', () => submitRequest());
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

  if (isSuggestionsMode) {
    input.style.display = 'none';
    submit.style.display = 'none';
  } else {
    setTimeout(() => {
      input.focus();
    }, 0);
  }

  if (mode === 'edit' || mode === 'suggestions') {
    loadSuggestions();
  } else {
    suggestions.style.display = 'none';
  }

  return dom;
};

const createTooltip = (pos, mode) => ({
  pos,
  mode,
  above: true,
  strictSide: true,
  class: 'strudel-claude-tooltip',
  create(view) {
    const dom = createPromptDom(view, mode);
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
        return createTooltip(effect.value.pos, effect.value.mode);
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
  const match = matchInlineCommand(prefix);
  if (!match) return null;
  return {
    from: line.from + match.from,
    to: line.from + match.to,
    mode: match.mode,
  };
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
        (tr) =>
          tr.isUserEvent('input') ||
          tr.isUserEvent('input.type') ||
          tr.isUserEvent('input.complete'),
      );
      if (!hasUserInput || !update.docChanged) {
        return;
      }
      const command = getCommandMatch(update.state);
      if (!command) {
        return;
      }
      this.ignoreNext = true;
      // Schedule dispatch after current update cycle completes
      setTimeout(() => {
        update.view.dispatch({
          changes: { from: command.from, to: command.to, insert: '' },
          selection: { anchor: command.from },
          effects: openClaudePrompt.of({ pos: command.from, mode: command.mode }),
        });
      }, 0);
    }
  },
);

const claudeKeymap = Prec.highest(
  keymap.of([
    {
      key: 'Mod-/',
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
