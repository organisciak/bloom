const addSectionPrompt = [
  'Add a new instrument section to the composition.',
  'Keep all existing code unchanged.',
  'Add the new part as its own pattern/voice.',
  'User request:',
].join(' ');

export const CLAUDE_COMMANDS = [
  {
    trigger: '\\ai',
    mode: 'edit',
    label: 'Edit',
    placeholder: 'Describe the change you want (Enter to apply, Esc to close)',
    promptPrefix: '',
  },
  {
    trigger: '\\claude',
    mode: 'edit',
    label: 'Edit',
    placeholder: 'Describe the change you want (Enter to apply, Esc to close)',
    promptPrefix: '',
  },
  {
    trigger: '/addsection',
    mode: 'add-section',
    label: 'Add section',
    placeholder: 'Describe the new instrument/part you want to add',
    promptPrefix: addSectionPrompt,
  },
];

const sortedTriggers = [...CLAUDE_COMMANDS].sort((a, b) => b.trigger.length - a.trigger.length);

export const getCommandByMode = (mode) =>
  CLAUDE_COMMANDS.find((command) => command.mode === mode) || CLAUDE_COMMANDS[0];

export const matchInlineCommand = (prefix) => {
  if (typeof prefix !== 'string' || !prefix.length) {
    return null;
  }
  for (const command of sortedTriggers) {
    if (!prefix.endsWith(command.trigger)) continue;
    const from = prefix.length - command.trigger.length;
    const prevChar = prefix[from - 1];
    if (from === 0 || /\s/.test(prevChar)) {
      return {
        ...command,
        from,
        to: prefix.length,
      };
    }
  }
  return null;
};

export const buildClaudePrompt = (mode, input) => {
  const command = getCommandByMode(mode);
  const trimmed = (input || '').trim();
  if (!trimmed) {
    return '';
  }
  if (!command.promptPrefix) {
    return trimmed;
  }
  return `${command.promptPrefix} ${trimmed}`.trim();
};
