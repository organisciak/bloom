import type { APIRoute } from 'astro';
import { buildInlineSuggestionsPrompt } from '../../repl/ai_prompt.mjs';

export const prerender = false;

const DEFAULT_MODEL = 'claude-3-5-haiku-20241022';
const DEFAULT_MAX_TOKENS = 512;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const parseMaxTokens = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : DEFAULT_MAX_TOKENS;
};

const extractClaudeText = (data: any) => {
  const content = Array.isArray(data?.content) ? data.content : [];
  return content.map((part: { text?: string }) => part?.text || '').join('').trim();
};

const tryParseJson = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (innerError) {
        return null;
      }
    }
    return null;
  }
};

const normalizeSuggestions = (value: any) => {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((item) => {
      const title = typeof item?.title === 'string' ? item.title.trim() : '';
      const prompt = typeof item?.prompt === 'string' ? item.prompt.trim() : '';
      return { title, prompt };
    })
    .filter((item) => item.prompt.length > 0)
    .slice(0, 5);
};

export const POST: APIRoute = async ({ request }) => {
  let payload: {
    code?: string;
    selection?: string;
    soundContext?: { synths?: string[]; drumMachines?: string[] };
  } = {};
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse({ error: 'Invalid JSON payload.' }, 400);
  }

  const code = typeof payload.code === 'string' ? payload.code : '';
  const selection = typeof payload.selection === 'string' ? payload.selection : '';
  if (!code.trim()) {
    return jsonResponse({ error: 'Missing code.' }, 400);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'ANTHROPIC_API_KEY is not set.' }, 500);
  }

  const model = process.env.ANTHROPIC_SUGGESTIONS_MODEL || DEFAULT_MODEL;
  const maxTokens = parseMaxTokens(process.env.ANTHROPIC_SUGGESTIONS_MAX_TOKENS);

  const prompt = buildInlineSuggestionsPrompt({
    code,
    selection,
    soundContext: payload.soundContext,
  });

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.4,
        system: 'You return JSON only.',
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      }),
    });
  } catch (error) {
    return jsonResponse({ error: 'Failed to reach Claude API.' }, 502);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return jsonResponse({ error: data?.error?.message || 'Claude API error.' }, response.status);
  }

  const text = extractClaudeText(data);
  const parsed = tryParseJson(text);
  const suggestions = normalizeSuggestions(parsed?.suggestions);
  if (!suggestions.length) {
    return jsonResponse({ error: 'Claude API returned no suggestions.' }, 500);
  }

  return jsonResponse({ suggestions });
};
