type OpenAIRequestBody = Record<string, unknown>;

const completionTokenParamForModel = (model: string) => {
  const normalized = model.toLowerCase();
  if (
    normalized.startsWith('gpt-5') ||
    normalized.startsWith('o1') ||
    normalized.startsWith('o3') ||
    normalized.startsWith('o4')
  ) {
    return 'max_completion_tokens';
  }
  return 'max_tokens';
};

const supportsCustomTemperature = (model: string) => {
  const normalized = model.toLowerCase();
  if (
    normalized.startsWith('gpt-5') ||
    normalized.startsWith('o1') ||
    normalized.startsWith('o3') ||
    normalized.startsWith('o4')
  ) {
    return false;
  }
  return true;
};

const extractTextValue = (value: any) => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object') {
    const direct = value.text ?? value.content ?? value.value;
    if (typeof direct === 'string') {
      return direct;
    }
    if (direct && typeof direct === 'object') {
      const nested = direct.text ?? direct.content ?? direct.value;
      if (typeof nested === 'string') {
        return nested;
      }
    }
  }
  return '';
};

const extractTextFromParts = (parts: any[]) =>
  parts
    .map((part) => {
      const text = extractTextValue(part?.text);
      if (text) return text;
      const content = extractTextValue(part?.content);
      if (content) return content;
      const output = extractTextValue(part?.output_text);
      if (output) return output;
      return '';
    })
    .join('')
    .trim();

export const extractOpenAIText = (data: any) => {
  const outputText = data?.output_text;
  if (typeof outputText === 'string') {
    return outputText.trim();
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  if (output.length) {
    const text = output
      .map((item: any) => {
        if (Array.isArray(item?.content)) {
          return extractTextFromParts(item.content);
        }
        return extractTextValue(item?.content);
      })
      .join('')
      .trim();
    if (text) {
      return text;
    }
  }

  const message = data?.choices?.[0]?.message;
  const content = message?.content;
  if (typeof content === 'string') {
    return content.trim();
  }
  if (Array.isArray(content)) {
    const text = extractTextFromParts(content);
    if (text) {
      return text;
    }
  }
  if (content && typeof content === 'object') {
    const text = extractTextValue(content);
    if (text) {
      return text.trim();
    }
  }
  const legacyText = data?.choices?.[0]?.text;
  if (typeof legacyText === 'string') {
    return legacyText.trim();
  }
  return '';
};

export const withOpenAIMaxTokens = (body: OpenAIRequestBody, model: string, maxTokens: number) => {
  const tokenParam = completionTokenParamForModel(model);
  return { ...body, [tokenParam]: maxTokens };
};

export const withOpenAITemperature = (
  body: OpenAIRequestBody,
  model: string,
  temperature: number,
) => {
  if (!supportsCustomTemperature(model)) {
    return body;
  }
  return { ...body, temperature };
};

export const getOpenAIMaxTokensParam = (model: string) => completionTokenParamForModel(model);
