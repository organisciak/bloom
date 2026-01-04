export const normalizeSuggestions = (value: any) => {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((item) => {
      const title = typeof item?.title === 'string' ? item.title.trim() : '';
      const prompt = typeof item?.prompt === 'string' ? item.prompt.trim() : '';
      const why = typeof item?.why === 'string' ? item.why.trim() : '';
      return { title, prompt, why };
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
  const suggestionsSource = parsed?.suggestions ?? parsed;
  let suggestions = normalizeSuggestions(suggestionsSource);
  if (!suggestions.length) {
    suggestions = deriveSuggestionsFromText(text);
  }
  return suggestions;
};
