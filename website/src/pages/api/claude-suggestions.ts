import type { APIRoute } from 'astro';
import { buildInlineSuggestionsPrompt, stripCodeFences } from '../../repl/ai_prompt.mjs';
import { getServerEnv } from './env';
import { extractOpenAIText, withOpenAIMaxTokens, withOpenAITemperature } from './openai';
import { buildSuggestionsFromText } from './suggestions';

export const prerender = false;

const DEFAULT_MODEL = 'gpt-5-nano';
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

  const apiKey = getServerEnv('OPENAI_API_KEY');
  if (!apiKey) {
    return jsonResponse({ error: 'OPENAI_API_KEY is not set.' }, 500);
  }

  const model = getServerEnv('OPENAI_SUGGESTIONS_MODEL') || DEFAULT_MODEL;
  const maxTokens = parseMaxTokens(getServerEnv('OPENAI_SUGGESTIONS_MAX_TOKENS'));

  const prompt = buildInlineSuggestionsPrompt({
    code,
    selection,
    soundContext: payload.soundContext,
  });

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(
        withOpenAITemperature(
          withOpenAIMaxTokens(
            {
              model,
              messages: [
                { role: 'system', content: 'You return JSON only.' },
                { role: 'user', content: prompt },
              ],
            },
            model,
            maxTokens,
          ),
          model,
          0.4,
        ),
      ),
    });
  } catch (error) {
    return jsonResponse({ error: 'Failed to reach OpenAI API.' }, 502);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return jsonResponse({ error: data?.error?.message || 'OpenAI API error.' }, response.status);
  }

  const text = stripCodeFences(extractOpenAIText(data));
  const parsed = tryParseJson(text);
  const suggestions = buildSuggestionsFromText(text, parsed);
  if (!suggestions.length) {
    return jsonResponse({ suggestions: [], warning: 'OpenAI API returned no suggestions.' });
  }

  return jsonResponse({ suggestions });
};
