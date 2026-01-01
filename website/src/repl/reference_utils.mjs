import { normalizeSoundContext } from './sound_context.mjs';

const isPatternMethod = (entry) =>
  entry?.memberof === 'Pattern' || entry?.longname?.startsWith('Pattern.') || entry?.longname?.startsWith('Pattern#');

const getParamNames = (entry) => entry?.params?.map((param) => param.name).filter(Boolean) ?? [];

const quoteString = (value) => JSON.stringify(String(value));

const pickSoundHint = (soundContext, prefer = 'synths') => {
  const normalized = normalizeSoundContext(soundContext);
  const synths = normalized.synths;
  const drums = normalized.drumMachines;
  if (prefer === 'drumMachines') {
    if (drums.length) return drums[0];
    if (synths.length) return synths[0];
  } else {
    if (synths.length) return synths[0];
    if (drums.length) return drums[0];
  }
  return null;
};

const buildSoundPattern = (soundContext) => {
  const normalized = normalizeSoundContext(soundContext);
  const pool = normalized.drumMachines.length ? normalized.drumMachines : normalized.synths;
  if (!pool.length) return null;
  const names = pool.slice(0, 3).join(' ');
  return `s(${quoteString(names)})`;
};

const getStrudelParamValue = (name, index, soundContext) => {
  const lower = name.toLowerCase();
  if (lower.includes('sample')) {
    const hint = pickSoundHint(soundContext, 'drumMachines');
    return hint ? quoteString(hint) : '"bd"';
  }
  if (lower.includes('sound')) {
    const hint = pickSoundHint(soundContext, 'synths');
    return hint ? quoteString(hint) : '"bd"';
  }
  if (lower.includes('note') || lower === 'n') return '"c3"';
  if (lower.includes('pattern') || lower.includes('pat') || lower.includes('seq')) return 's("bd")';
  if (lower.includes('gain') || lower.includes('amp') || lower.includes('level') || lower.includes('amount'))
    return '0.8';
  if (lower.includes('pan')) return '0.2';
  if (lower.includes('prob') || lower.includes('chance')) return '0.7';
  if (lower.includes('freq') || lower.includes('cutoff')) return '800';
  if (lower.includes('speed') || lower.includes('rate') || lower.includes('factor')) return '2';
  if (lower.includes('time') || lower.includes('dur')) return '0.5';
  if (lower.includes('room') || lower.includes('size')) return '0.6';
  if (lower.includes('mix')) return '0.3';
  if (lower.includes('steps')) return '16';
  return index % 2 === 0 ? '0.5' : '2';
};

const getHydraParamValue = (name, index) => {
  const lower = name.toLowerCase();
  if (lower.includes('input') || lower.includes('texture')) return 'osc(10, 0.1, 1)';
  if (lower.includes('buffer')) return 'o0';
  if (lower === 'r') return '0.8';
  if (lower === 'g') return '0.5';
  if (lower === 'b') return '0.3';
  if (lower.includes('frequency')) return '10';
  if (lower.includes('speed')) return '0.1';
  if (lower.includes('angle')) return '0.2';
  if (lower.includes('radius') || lower.includes('size')) return '0.6';
  if (lower.includes('scale')) return '1.2';
  if (lower.includes('offset')) return '0.3';
  if (lower.includes('scroll')) return '0.2';
  if (lower.includes('repeat') || lower.includes('reps') || lower.includes('sides')) return '4';
  if (lower.includes('pixel')) return '8';
  if (lower === 'x' || lower === 'y' || lower.includes('x') || lower.includes('y')) return '0.5';
  if (lower.includes('amount') || lower.includes('threshold') || lower.includes('tolerance')) return '0.5';
  return index % 2 === 0 ? '0.5' : '0.25';
};

const buildStrudelExample = (entry, soundContext) => {
  const name = entry.name;
  const params = getParamNames(entry);
  if (name === 's' || name === 'sound') {
    return buildSoundPattern(soundContext) ?? `s("bd hh sd hh")`;
  }
  if (name === 'note' || name === 'n') {
    return `note("c a f e")`;
  }
  if (isPatternMethod(entry)) {
    const args = params.map((param, index) => getStrudelParamValue(param, index, soundContext)).join(', ');
    return `s("bd hh sd hh").${name}(${args})`;
  }
  if (params.length) {
    const args = params.map((param, index) => getStrudelParamValue(param, index, soundContext)).join(', ');
    return `${name}(${args})`;
  }
  return `${name}()`;
};

const buildHydraExample = (entry) => {
  const name = entry.name;
  const params = getParamNames(entry);
  const args = params.map(getHydraParamValue).join(', ');
  const call = `${name}(${args})`;
  const base = 'osc(10, 0.1, 1)';
  if (name === 'out') return `${base}.out()`;
  if (name === 'render') return 'render(o0)';
  if (name === 'hush') return 'hush()';
  if (name === 'src') return 'src(o0).out()';
  if (entry.meta?.category === 'Global variables') {
    if (name === 'time') return `${base}.rotate(time).out()`;
    if (name === 'mouse') return `${base}.scrollX(mouse.x).out()`;
    return `${base}.out()`;
  }
  if (entry.meta?.category === 'Sources') {
    return `${call}.out()`;
  }
  return `${base}.${call}.out()`;
};

const getEasyWins = (entry, soundContext) => {
  if (entry.examples?.length) {
    return entry.examples.slice(0, 2);
  }
  const fallback = entry.source === 'hydra' ? buildHydraExample(entry) : buildStrudelExample(entry, soundContext);
  return [fallback];
};

const getQuickTips = (entry) => {
  const tips = [];
  const paramNames = getParamNames(entry);
  if (entry.source === 'hydra') {
    if (entry.meta?.category === 'Sources') {
      tips.push('Use it as a base visual source, then chain modifiers and finish with .out().');
    } else {
      tips.push('Apply it to a source like osc() or shape() and finish with .out().');
    }
    if (paramNames.length) {
      tips.push(`Start with small values for ${paramNames[0]} and nudge slowly.`);
    } else {
      tips.push('Small values go a long way when you stack multiple modifiers.');
    }
  } else {
    if (isPatternMethod(entry)) {
      tips.push('Chain it after a pattern like s("bd") or note("c").');
    } else {
      tips.push('Use it as a source or helper, then chain pattern modifiers.');
    }
    if (paramNames.length) {
      tips.push(`Treat ${paramNames[0]} as a knob and keep changes subtle.`);
    } else {
      tips.push('Combine it with fast/slow or gain/pan to feel the effect.');
    }
  }
  return tips;
};

const getPairWith = (entry) => {
  const name = entry.name;
  if (entry.source === 'hydra') {
    const base = ['rotate(0.2)', 'color(1, 0.8, 0.6)', 'modulate(osc(2, 0.1, 1))'];
    return base.filter((item) => !item.startsWith(name)).slice(0, 3);
  }
  const base = ['fast(2)', 'slow(2)', 'gain(0.8)', 'pan(0.2)'];
  return base.filter((item) => !item.startsWith(name)).slice(0, 3);
};

const getLiveTweak = (entry) => {
  const paramNames = getParamNames(entry);
  if (entry.source === 'hydra') {
    if (paramNames.length) {
      return `Try sweeping ${paramNames[0]} between 0.1 and 0.8 while it plays.`;
    }
    return 'Try adding or removing it live to accent a transition.';
  }
  if (paramNames.length) {
    return `Try nudging ${paramNames[0]} live by small steps while the groove loops.`;
  }
  return 'Try toggling it on and off every few cycles to hear the contrast.';
};

export {
  buildHydraExample,
  buildStrudelExample,
  getEasyWins,
  getLiveTweak,
  getPairWith,
  getQuickTips,
  getParamNames,
  getHydraParamValue,
  getStrudelParamValue,
  isPatternMethod,
};
