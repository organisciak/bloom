export const DEFAULT_TAP_WINDOW = 6;
export const DEFAULT_TAP_TIMEOUT = 2000;

export const clampTempo = (cps, minCps = 0.1, maxCps = 8) => {
  if (!Number.isFinite(cps)) return null;
  return Math.min(maxCps, Math.max(minCps, cps));
};

export const cpsToCpm = (cps) => (Number.isFinite(cps) ? cps * 60 : null);

export const createTapTempo = ({ windowSize = DEFAULT_TAP_WINDOW, timeoutMs = DEFAULT_TAP_TIMEOUT } = {}) => {
  let taps = [];

  const registerTap = (timestamp = Date.now()) => {
    if (taps.length && timestamp - taps[taps.length - 1] > timeoutMs) {
      taps = [];
    }
    taps = [...taps, timestamp].slice(-windowSize);
    if (taps.length < 2) return null;
    const intervals = taps.slice(1).map((tap, index) => tap - taps[index]);
    const avg = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    if (!Number.isFinite(avg) || avg <= 0) return null;
    return 1000 / avg;
  };

  const reset = () => {
    taps = [];
  };

  const count = () => taps.length;

  return { registerTap, reset, count };
};
