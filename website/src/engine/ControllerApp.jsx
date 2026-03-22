import { useCallback, useState } from 'react';
import { BloomEngineProvider, useBloomEngine } from './BloomEngineContext';
import FileSystemPicker from '../components/FileSystemPicker';

// Rotary knob component
function Knob({ label, value, min, max, onChange, unit = '' }) {
  const range = max - min;
  const normalized = (value - min) / range;
  const angle = -135 + normalized * 270; // -135 to 135 degrees

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      const startY = e.clientY;
      const startVal = value;

      const onMove = (ev) => {
        const delta = (startY - ev.clientY) / 150;
        const next = Math.max(min, Math.min(max, startVal + delta * range));
        onChange(next);
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [value, min, max, range, onChange],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
      <div
        onPointerDown={handlePointerDown}
        style={{
          width: '4rem',
          height: '4rem',
          borderRadius: '50%',
          border: '2px solid var(--foreground)',
          position: 'relative',
          cursor: 'grab',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '2px',
            height: '40%',
            background: 'var(--caret)',
            transformOrigin: 'bottom center',
            transform: `translate(-50%, -100%) rotate(${angle}deg)`,
          }}
        />
      </div>
      <span style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>
        {typeof value === 'number' ? Math.round(value) : value}
        {unit}
      </span>
    </div>
  );
}

// Pad button component
function Pad({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '5rem',
        height: '5rem',
        border: `2px solid ${color || 'var(--foreground)'}`,
        borderRadius: '8px',
        background: active ? (color || 'var(--caret)') : 'transparent',
        color: active ? '#000' : 'var(--foreground)',
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: '0.65rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        transition: 'all 0.1s ease',
        padding: '0.3rem',
        lineHeight: 1.2,
      }}
    >
      {label}
    </button>
  );
}

const DIRECTIONS = [
  { id: 'minimal', label: 'go\nminimal', color: '#4fc3f7' },
  { id: 'dense', label: 'add\nlayers', color: '#ab47bc' },
  { id: 'melodic', label: 'more\nmelody', color: '#66bb6a' },
  { id: 'rhythmic', label: 'heavier\nrhythm', color: '#ef5350' },
  { id: 'ambient', label: 'drift\nambient', color: '#78909c' },
  { id: 'glitch', label: 'break\napart', color: '#ffca28' },
  { id: 'harmonic', label: 'richer\nchords', color: '#26a69a' },
  { id: 'silence', label: 'breathe\nspace', color: '#8d6e63' },
];

function ControllerUI() {
  const { started, toggle, tempo, tempoCps, setTempo, fileName, error, openFile, openWorkspace, autoUpdateEnabled, toggleAutoUpdate, autoUpdateDetected } = useBloomEngine();

  const [gain, setGain] = useState(80);
  const [filterCutoff, setFilterCutoff] = useState(100);
  const [activePad, setActivePad] = useState(null);

  const handleTempoChange = useCallback(
    (bpm) => {
      const cps = bpm / (60 * 4);
      setTempo(cps);
    },
    [setTempo],
  );

  const handlePadClick = useCallback((id) => {
    setActivePad((prev) => (prev === id ? null : id));
    // Placeholder: these will eventually send direction hints to the engine or AI
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        color: 'var(--foreground)',
        fontFamily: 'monospace',
        padding: '1.5rem',
        gap: '1.5rem',
        maxWidth: '36rem',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1rem', opacity: 0.5, margin: 0, fontWeight: 400 }}>bloom controller</h1>
        <FileSystemPicker
          fileName={fileName}
          openFile={openFile}
          openWorkspace={openWorkspace}
          autoUpdateEnabled={autoUpdateEnabled}
          toggleAutoUpdate={toggleAutoUpdate}
          autoUpdateDetected={autoUpdateDetected}
          compact
        />
      </div>

      {/* Transport */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <button
          onClick={toggle}
          style={{
            width: '3.5rem',
            height: '3.5rem',
            borderRadius: '50%',
            border: '2px solid var(--foreground)',
            background: started ? 'var(--caret)' : 'transparent',
            color: started ? '#000' : 'var(--foreground)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontFamily: 'monospace',
            flexShrink: 0,
          }}
        >
          {started ? 'stop' : 'play'}
        </button>
        {error && <span style={{ fontSize: '0.7rem', color: '#f44' }}>error</span>}
      </div>

      {/* Knobs row */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0.5rem 0' }}>
        <Knob label="tempo" value={tempo ?? 120} min={40} max={300} onChange={handleTempoChange} unit=" bpm" />
        <Knob label="gain" value={gain} min={0} max={100} onChange={setGain} unit="%" />
        <Knob label="filter" value={filterCutoff} min={0} max={100} onChange={setFilterCutoff} unit="%" />
      </div>

      {/* Direction pads */}
      <div>
        <div style={{ fontSize: '0.7rem', opacity: 0.4, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          directions (placeholder)
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
            justifyItems: 'center',
          }}
        >
          {DIRECTIONS.map((d) => (
            <Pad
              key={d.id}
              label={d.label}
              color={d.color}
              active={activePad === d.id}
              onClick={() => handlePadClick(d.id)}
            />
          ))}
        </div>
      </div>

      {/* Status footer */}
      <div style={{ marginTop: 'auto', fontSize: '0.65rem', opacity: 0.3, textAlign: 'center' }}>
        knobs and pads are UI placeholders — gain/filter will connect to Superdough params, direction pads to AI suggestions
      </div>
    </div>
  );
}

export default function ControllerApp() {
  return (
    <BloomEngineProvider>
      <ControllerUI />
    </BloomEngineProvider>
  );
}
