const addSectionPrompt = [
  'Add a new instrument section to the composition.',
  'Keep all existing code unchanged.',
  'Add the new part as its own pattern/voice.',
  'User request:',
].join(' ');

const BASE_COMMANDS = [
  {
    trigger: '/ai',
    mode: 'edit',
    label: 'Edit',
    placeholder: 'Describe the change you want (Enter to apply, Esc to close)',
    promptPrefix: '',
    description: 'Open the inline edit prompt for the current code.',
  },
  {
    trigger: '/claude',
    mode: 'edit',
    label: 'Edit',
    placeholder: 'Describe the change you want (Enter to apply, Esc to close)',
    promptPrefix: '',
    description: 'Open the inline edit prompt for the current code.',
  },
  {
    trigger: '/suggestions',
    mode: 'suggestions',
    label: 'Suggestions',
    placeholder: 'Review suggested tweaks and why they help',
    promptPrefix: '',
    description: 'Get tweak ideas with a short explanation for each.',
  },
  {
    trigger: '/addsection',
    mode: 'add-section',
    label: 'Add section',
    placeholder: 'Describe the new instrument/part you want to add',
    promptPrefix: addSectionPrompt,
    description: 'Ask for a new instrument or part to be added as its own voice.',
  },
];

const LEGACY_COMMANDS = [
  { ...BASE_COMMANDS[0], trigger: '\\ai', legacy: true },
  { ...BASE_COMMANDS[1], trigger: '\\claude', legacy: true },
];

export const CLAUDE_COMMANDS = [...BASE_COMMANDS, ...LEGACY_COMMANDS];
export const SLASH_COMMANDS = BASE_COMMANDS;

const sortedTriggers = [...CLAUDE_COMMANDS].sort((a, b) => b.trigger.length - a.trigger.length);

export const getCommandByMode = (mode) =>
  CLAUDE_COMMANDS.find((command) => command.mode === mode && !command.legacy) ||
  CLAUDE_COMMANDS.find((command) => command.mode === mode) ||
  CLAUDE_COMMANDS[0];

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
  const normalized = typeof input === 'string' ? input : '';
  const trimmed = normalized.trim();
  if (!trimmed) {
    return '';
  }
  if (!command.promptPrefix) {
    return trimmed;
  }
  return `${command.promptPrefix} ${trimmed}`.trim();
};
