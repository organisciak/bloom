import type { APIRoute } from 'astro';
import { buildHydraContextBlock, buildSoundContextBlock } from '../../repl/ai_prompt.mjs';

export const prerender = false;

const DEFAULT_MODEL = 'claude-3-5-sonnet-20240620';
const DEFAULT_MAX_TOKENS = 2048;

const buildUserPrompt = ({
  code,
  prompt,
  selection,
  soundContext,
}: {
  code: string;
  prompt: string;
  selection?: string;
  soundContext?: { synths?: string[]; drumMachines?: string[] };
}) => {
  const selectionBlock = selection?.trim()
    ? `\n\nSelected section (if relevant):\n${selection}\n`
    : '\n\nSelected section: (none)\n';
  const soundContextBlock = buildSoundContextBlock(soundContext);
  const hydraContextBlock = buildHydraContextBlock();
  return [
    'You are editing a Strudel live-coding composition.',
    'Apply the user request by changing only the relevant part of the code.',
    'Keep everything else identical, including formatting and comments.',
    'Return ONLY the full updated code, without markdown or commentary.',
    ...(soundContextBlock ? ['', 'Available instruments (use exact names in s(...)):', soundContextBlock] : []),
    ...(hydraContextBlock ? ['', 'Hydra usage (brief):', hydraContextBlock] : []),
    '',
    'Full composition:',
    code,
    '',
    'User request:',
    prompt,
    selectionBlock,
  ].join('\n');
};

export const POST: APIRoute = async ({ request }) => {
  let payload: {
    code?: string;
    prompt?: string;
    selection?: string;
    soundContext?: { synths?: string[]; drumMachines?: string[] };
  } = {};
  try {
    payload = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const code = typeof payload.code === 'string' ? payload.code : '';
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  const selection = typeof payload.selection === 'string' ? payload.selection : '';
  const soundContext = payload.soundContext;
  if (!code || !prompt) {
    return new Response(JSON.stringify({ error: 'Missing code or prompt.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not set.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const maxTokens = Number(process.env.ANTHROPIC_MAX_TOKENS || DEFAULT_MAX_TOKENS);

  const body = {
    model,
    max_tokens: Number.isFinite(maxTokens) ? maxTokens : DEFAULT_MAX_TOKENS,
    temperature: 0.2,
    system: 'You are a precise code editor for Strudel.',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: buildUserPrompt({ code, prompt, selection, soundContext }),
          },
        ],
      },
    ],
  };

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to reach Claude API.' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  let data: any = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    return new Response(JSON.stringify({ error: data?.error?.message || 'Claude API error.' }), {
      status: response.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const content = Array.isArray(data?.content) ? data.content : [];
  const text = content.map((part: { text?: string }) => part?.text || '').join('').trim();
  if (!text) {
    return new Response(JSON.stringify({ error: 'Claude API returned empty content.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ code: text }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
