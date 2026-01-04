import { formatSoundContext } from './sound_context.mjs';
import { cpsToCpm } from './tempo_utils.mjs';

const HYDRA_CONTEXT_BLOCK = [
  'Hydra visuals: call `await initHydra()` at the top to enable.',
  'Hydra chains must end with `.out()` to render; they can live alongside Strudel patterns.',
  'Use `H(pattern)` to feed a Strudel pattern into Hydra; optional `initHydra({detectAudio:true})` or `{feedStrudel:1}`.',
].join('\n');

const STRUCTURE_PREFERENCE_BLOCK = [
  'Preferred structure for full compositions:',
  '- name parts, then `let fullStack = stack(...)`',
  '- run `$: fullStack`',
  '- for visuals, you can reuse `fullStack.gain(0)` when needed',
].join('\n');

const buildGainGuidanceBlock = ({ startGainsAtZero, useGainSliders }) => {
  const lines = [];
  if (startGainsAtZero) {
    lines.push('Start all gain values at 0 so parts fade in safely.');
  }
  if (useGainSliders) {
    lines.push('When calling gain(...), wrap numeric values in slider(value, min, max, step).');
  }
  if (!lines.length) {
    return '';
  }
  return ['Gain guidance:', ...lines].join('\n');
};

export const normalizeContextFiles = (files) => {
  const list = Array.isArray(files) ? files : [];
  return list
    .map((file) => {
      const name = typeof file?.name === 'string' && file.name.trim() ? file.name.trim() : 'untitled';
      const content = typeof file?.content === 'string' ? file.content : '';
      return { name, content };
    })
    .filter((file) => file.content.trim().length > 0);
};

export const buildSoundContextBlock = (soundContext) => {
  return formatSoundContext(soundContext);
};

export const buildHydraContextBlock = () => HYDRA_CONTEXT_BLOCK;
export const buildStructurePreferenceBlock = () => STRUCTURE_PREFERENCE_BLOCK;

const formatTempoValue = (value) => {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(3)).toString();
};

export const buildTempoContextBlock = (tempoCps) => {
  if (!Number.isFinite(tempoCps)) return '';
  const cpm = cpsToCpm(tempoCps);
  const cpsLabel = formatTempoValue(tempoCps);
  const cpmLabel = formatTempoValue(cpm);
  const setcps = cpsLabel ? `setcps(${cpsLabel})` : null;
  const setcpm = cpmLabel ? `setcpm(${cpmLabel})` : null;
  const commandHint = [setcpm, setcps].filter(Boolean).join(' or ');
  return `Tempo: ${cpmLabel} cpm (${cpsLabel} cps)\nInclude ${commandHint} near the top.`;
};

export const buildInlineSuggestionsPrompt = ({ code, selection, soundContext }) => {
  const soundContextBlock = buildSoundContextBlock(soundContext);
  const hydraContextBlock = buildHydraContextBlock();
  const structureBlock = buildStructurePreferenceBlock();
  const selectionBlock = selection?.trim()
    ? `\n\nSelected section (if relevant):\n${selection}\n`
    : '\n\nSelected section: (none)\n';

  return [
    'You suggest concise edit prompts for a Strudel live-coding composition.',
    'Return JSON only in the following shape:',
    '{"suggestions":[{"title":"...","prompt":"...","why":"..."}]}',
    'Provide 3-5 suggestions that are safe, musical, and easy to apply.',
    'Each "prompt" must be a direct edit instruction that can be applied as-is.',
    'Each "why" should be a short reason for the tweak (one sentence).',
    'Do not mention AI or the model.',
    ...(soundContextBlock ? ['', 'Available instruments (use exact names in s(...)):', soundContextBlock] : []),
    ...(structureBlock ? ['', 'Composition structure:', structureBlock] : []),
    ...(hydraContextBlock ? ['', 'Hydra usage (brief):', hydraContextBlock] : []),
    '',
    'Current composition:',
    code,
    '',
    selectionBlock,
  ].join('\n');
};

export const buildComposePrompt = ({
  prompt,
  contextFiles,
  soundContext,
  tempoCps,
  startGainsAtZero = false,
  useGainSliders = false,
}) => {
  const files = normalizeContextFiles(contextFiles);
  const contextBlock = files.length
    ? files
        .map((file, index) => {
          return [`[${index + 1}] ${file.name}`, file.content.trim()].join('\n');
        })
        .join('\n\n')
    : '(none)';
  const soundContextBlock = buildSoundContextBlock(soundContext);
  const hydraContextBlock = buildHydraContextBlock();
  const structureBlock = buildStructurePreferenceBlock();
  const tempoContextBlock = buildTempoContextBlock(tempoCps);
  const gainGuidanceBlock = buildGainGuidanceBlock({ startGainsAtZero, useGainSliders });

  return [
    'You are generating a full Strudel live-coding composition.',
    'Return only the complete composition code, without markdown or commentary.',
    'Use the user request, and optionally draw inspiration from context compositions.',
    ...(soundContextBlock ? ['', 'Available instruments (use exact names in s(...)):', soundContextBlock] : []),
    ...(tempoContextBlock ? ['', 'Tempo:', tempoContextBlock] : []),
    ...(gainGuidanceBlock ? ['', gainGuidanceBlock] : []),
    ...(structureBlock ? ['', 'Composition structure:', structureBlock] : []),
    ...(hydraContextBlock ? ['', 'Hydra usage (brief):', hydraContextBlock] : []),
    '',
    'User request:',
    prompt.trim(),
    '',
    'Context compositions:',
    contextBlock,
  ].join('\n');
};

export const stripCodeFences = (text) => {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) {
    return text;
  }
  const withoutStart = trimmed.replace(/^```[a-zA-Z]*\n?/, '');
  const withoutEnd = withoutStart.replace(/```$/, '');
  return withoutEnd.trim();
};
