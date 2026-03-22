import React, { useEffect, useState } from 'react';
import { useController } from './useController';
import { Knob } from './Knob';
import { Pad } from './Pad';
import './Controller.css';

const KNOB_ORDER = ['tempo', 'gain', 'cutoff', 'swing', 'reverb', 'delay'];

const KNOB_LABELS = {
  tempo: 'Tempo',
  gain: 'Gain',
  cutoff: 'Cutoff',
  swing: 'Swing',
  reverb: 'Reverb',
  delay: 'Delay',
};

export function Controller() {
  const {
    params,
    setParam,
    code,
    fileName,
    status,
    errorMsg,
    activePad,
    openFile,
    triggerPad,
    suggestions,
    paramRanges,
  } = useController();

  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (errorMsg) {
      setShowError(true);
      const t = setTimeout(() => setShowError(false), 4000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const hasFile = !!fileName;
  const isLoading = status === 'loading';

  return (
    <div className="ctrl-root">
      <header className="ctrl-header">
        <div className="ctrl-logo">bloom</div>
        <div className="ctrl-file-bar">
          {fileName && <span className="ctrl-file-name">{fileName}</span>}
          <span className={`ctrl-status ctrl-status--${status}`}>{status}</span>
          <button className="ctrl-open-btn" onClick={openFile}>
            Open file
          </button>
        </div>
      </header>

      <main className="ctrl-body">
        {/* Knobs section */}
        <section>
          <div className="ctrl-section-label">Parameters</div>
          <div className="ctrl-knobs">
            {KNOB_ORDER.map((name) => (
              <Knob
                key={name}
                name={name}
                label={KNOB_LABELS[name]}
                value={params[name]}
                range={paramRanges[name]}
                onChange={setParam}
              />
            ))}
          </div>
        </section>

        {/* Pads section */}
        <section>
          <div className="ctrl-section-label">Suggestions</div>
          {hasFile ? (
            <div className="ctrl-pads">
              {suggestions.map((s, i) => (
                <Pad
                  key={i}
                  index={i}
                  label={s.label}
                  active={activePad === i}
                  loading={activePad === i && isLoading}
                  disabled={isLoading && activePad !== i}
                  onTrigger={triggerPad}
                />
              ))}
            </div>
          ) : (
            <div className="ctrl-empty-hint">
              Open a .strudel file to enable pads.
              <br />
              Tap a pad to apply a suggestion via the API.
            </div>
          )}
        </section>

        {/* Code preview */}
        {code && (
          <section>
            <div className="ctrl-section-label">Current pattern</div>
            <pre className="ctrl-code-preview">{code}</pre>
          </section>
        )}
      </main>

      {showError && errorMsg && <div className="ctrl-error">{errorMsg}</div>}
    </div>
  );
}
