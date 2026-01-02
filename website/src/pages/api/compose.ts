import type { APIRoute } from 'astro';
import { buildComposePrompt, normalizeContextFiles, stripCodeFences } from '../../repl/ai_prompt.mjs';

export const prerender = false;

const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';
const DEFAULT_OPENAI_MODEL = 'gpt-5-mini';
const DEFAULT_MAX_TOKENS = 2048;

const parseMaxTokens = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : DEFAULT_MAX_TOKENS;
};

const jsonError = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const readJson = async (request: Request) => {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
};

const extractClaudeText = (data: any) => {
  const content = Array.isArray(data?.content) ? data.content : [];
  return content.map((part: { text?: string }) => part?.text || '').join('').trim();
};

const extractOpenAIText = (data: any) => {
  return data?.choices?.[0]?.message?.content?.trim() ?? '';
};

export const POST: APIRoute = async ({ request }) => {
  const payload = await readJson(request);
  if (!payload) {
    return jsonError('Invalid JSON payload.');
  }

  const provider = typeof payload.provider === 'string' ? payload.provider.toLowerCase() : 'claude';
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!prompt) {
    return jsonError('Missing prompt.');
  }

  const contextFiles = normalizeContextFiles(payload.contextFiles);
  const soundContext = payload.soundContext;
  const tempoCpsValue = Number(payload.tempoCps);
  const tempoCps = Number.isFinite(tempoCpsValue) ? tempoCpsValue : null;
  const promptText = buildComposePrompt({ prompt, contextFiles, soundContext, tempoCps });

  if (provider === 'claude') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return jsonError('ANTHROPIC_API_KEY is not set.', 500);
    }

    const model = process.env.ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL;
    const maxTokens = parseMaxTokens(process.env.ANTHROPIC_MAX_TOKENS);

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
          temperature: 0.7,
          system: 'You generate complete Strudel compositions.',
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: promptText }],
            },
          ],
        }),
      });
    } catch (error) {
      return jsonError('Failed to reach Claude API.', 502);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return jsonError(data?.error?.message || 'Claude API error.', response.status);
    }
    const text = stripCodeFences(extractClaudeText(data));
    if (!text) {
      return jsonError('Claude API returned empty content.', 500);
    }
    return new Response(JSON.stringify({ code: text }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError('OPENAI_API_KEY is not set.', 500);
    }
    const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    const maxTokens = parseMaxTokens(process.env.OPENAI_MAX_TOKENS);

    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.7,
          messages: [
            { role: 'system', content: 'You generate complete Strudel compositions.' },
            { role: 'user', content: promptText },
          ],
        }),
      });
    } catch (error) {
      return jsonError('Failed to reach OpenAI API.', 502);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return jsonError(data?.error?.message || 'OpenAI API error.', response.status);
    }
    const text = stripCodeFences(extractOpenAIText(data));
    if (!text) {
      return jsonError('OpenAI API returned empty content.', 500);
    }
    return new Response(JSON.stringify({ code: text }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  return jsonError('Unknown provider. Use "claude" or "openai".');
};
