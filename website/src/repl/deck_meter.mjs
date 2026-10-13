/*
deck_meter.mjs - measure how loud each slide of a deck is, without listening.

Renders every slide offline for a couple of cycles and reports peak and RMS
level in dBFS, so clipping (peak above 0 dB) and big jumps between slides show
up as numbers. Visual-only lines (Hydra) are left out of the render.

In dev builds the REPL exposes it as `await window.bloomMeterDeck()`.
*/
import { parseDeck, splitDeck } from '@strudel/transpiler';

export const toDb = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

// channels: Float32Array per channel -> { peakDb, rmsDb } over all samples
export function levelStats(channels) {
  let peak = 0;
  let sumSquares = 0;
  let count = 0;
  for (const data of channels) {
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
      sumSquares += v * v;
    }
    count += data.length;
  }
  const rms = count ? Math.sqrt(sumSquares / count) : 0;
  return { peakDb: round(toDb(peak)), rmsDb: round(toDb(rms)) };
}

function round(db) {
  return Number.isFinite(db) ? Math.round(db * 10) / 10 : db;
}

// A slide's full code minus Hydra lines (initHydra(), `.out(...)` chains)
export function audioOnlyCode(code) {
  const { slides, error } = splitDeck(code);
  if (error || !slides.length) return code;
  return slides[0].statements
    .filter((st) => st.key !== 'initHydra()' && !st.key?.startsWith('out:'))
    .map((st) => st.text)
    .join('\n');
}

// Flag slides that clip, are near-silent, or jump a lot from the slide before
export function flagLevels(rows, { jumpDb = 8, silentDb = -45 } = {}) {
  return rows.map((row, i) => {
    const flags = [];
    if (row.peakDb > 0) flags.push('clips');
    if (row.rmsDb < silentDb) flags.push('near silent');
    const prev = rows[i - 1];
    if (prev && Number.isFinite(prev.rmsDb) && Math.abs(row.rmsDb - prev.rmsDb) >= jumpDb) {
      flags.push(`${row.rmsDb > prev.rmsDb ? '+' : ''}${round(row.rmsDb - prev.rmsDb)} dB jump`);
    }
    return { ...row, flags };
  });
}

/*
Browser only. repl: the StrudelMirror's repl; render: renderPatternBuffer from
@strudel/webaudio; onDone: restores live audio afterwards (initAudio).
*/
export async function meterDeck({ source, repl, render, onDone, cycles = 2, from = 0, to = Infinity }) {
  const { slides, error } = parseDeck(source);
  if (error) throw error;
  const rows = [];
  try {
    for (let i = from; i < Math.min(to, slides.length); i++) {
      await repl.evaluate(audioOnlyCode(slides[i].code), false);
      const { pattern } = repl.state;
      const cps = repl.scheduler.cps;
      const buffer = await render(pattern, cps, 0, cycles, 44100, 128, false);
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
      rows.push({ slide: i + 1, title: slides[i].title, ...levelStats(channels) });
    }
  } finally {
    await onDone?.();
  }
  return flagLevels(rows);
}
