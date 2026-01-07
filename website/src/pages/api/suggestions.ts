const coerceText = (value: any) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value && typeof value === 'object') {
    const direct = value.text ?? value.content ?? value.value;
    if (typeof direct === 'string') {
      return direct.trim();
    }
  }
  return '';
};

const pickFirstText = (item: any, keys: string[]) => {
  for (const key of keys) {
    const text = coerceText(item?.[key]);
    if (text) {
      return text;
    }
  }
  return '';
};

export const normalizeSuggestions = (value: any) => {
  const list = Array.isArray(value) ? value : [];
  const promptKeys = [
    'prompt',
    'text',
    'suggestion',
    'instruction',
    'edit',
    'change',
    'tweak',
    'idea',
  ];
  return list
    .map((item) => {
      if (typeof item === 'string') {
        const text = item.trim();
        return { title: text, prompt: text, why: '' };
      }
      const title = pickFirstText(item, ['title', 'label', 'name']);
      const hasPromptKey =
        item && typeof item === 'object'
          ? promptKeys.some((key) => Object.prototype.hasOwnProperty.call(item, key))
          : false;
      const prompt = pickFirstText(item, promptKeys);
      const why = pickFirstText(item, ['why', 'reason', 'because', 'explanation']);
      const resolvedPrompt = prompt || (!hasPromptKey ? title : '');
      const resolvedTitle = title || resolvedPrompt;
      return { title: resolvedTitle, prompt: resolvedPrompt, why };
    })
    .filter((item) => item.prompt.length > 0)
    .slice(0, 5);
};

const stripBullet = (line: string) => line.replace(/^[-*•\d]+[.)\]]?\s+/, '');

const splitTitlePrompt = (line: string) => {
  const divider = ' - ';
  if (!line.includes(divider)) {
    return { title: line, prompt: line };
  }
  const [left, ...rest] = line.split(divider);
  const prompt = rest.join(divider).trim();
  const title = left.trim() || prompt;
  return { title, prompt };
};

export const deriveSuggestionsFromText = (text: string) => {
  if (typeof text !== 'string') {
    return [];
  }
  const lines = text
    .split(/\r?\n/)
    .map((line) => stripBullet(line.trim()))
    .filter((line) => line.length > 0);
  const suggestions: { title: string; prompt: string; why: string }[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const { title, prompt } = splitTitlePrompt(line);
    if (!prompt || seen.has(prompt)) {
      continue;
    }
    suggestions.push({ title, prompt, why: '' });
    seen.add(prompt);
    if (suggestions.length >= 5) {
      break;
    }
  }
  return suggestions;
};

export const buildSuggestionsFromText = (text: string, parsed: any) => {
  const suggestionsSource =
    parsed?.suggestions ?? parsed?.items ?? parsed?.ideas ?? parsed?.tweaks ?? parsed?.recommendations ?? parsed;
  let suggestions = normalizeSuggestions(suggestionsSource);
  if (!suggestions.length) {
    suggestions = deriveSuggestionsFromText(text);
  }
  return suggestions;
};
