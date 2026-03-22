import { BloomEngineProvider, useBloomEngine } from './BloomEngineContext';

function HeadlessUI() {
  const { started, toggle, tempo, fileName, code, error, openFile, autoUpdateEnabled, toggleAutoUpdate, autoUpdateDetected } =
    useBloomEngine();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--foreground)',
        fontFamily: 'monospace',
        gap: '1.5rem',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '1.2rem', opacity: 0.5, margin: 0, fontWeight: 400 }}>bloom headless</h1>

      <button
        onClick={toggle}
        style={{
          width: '5rem',
          height: '5rem',
          borderRadius: '50%',
          border: '2px solid var(--foreground)',
          background: started ? 'var(--caret)' : 'transparent',
          color: started ? '#000' : 'var(--foreground)',
          fontSize: '1rem',
          cursor: 'pointer',
          fontFamily: 'monospace',
          transition: 'all 0.15s ease',
        }}
      >
        {started ? 'stop' : 'play'}
      </button>

      {tempo != null && (
        <div style={{ fontSize: '2rem', fontVariantNumeric: 'tabular-nums' }}>
          {tempo} <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>bpm</span>
        </div>
      )}

      {fileName && (
        <div style={{ fontSize: '0.9rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {fileName}
          {autoUpdateDetected && <span style={{ color: 'var(--caret)' }}>syncing</span>}
        </div>
      )}

      {error && (
        <div style={{ fontSize: '0.8rem', color: '#f44', maxWidth: '30rem', textAlign: 'center' }}>
          {error?.message || String(error)}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <button onClick={openFile} style={linkStyle}>
          open file
        </button>
        <button onClick={toggleAutoUpdate} style={linkStyle}>
          auto-update: {autoUpdateEnabled ? 'on' : 'off'}
        </button>
      </div>

      {code && (
        <pre
          style={{
            fontSize: '0.7rem',
            opacity: 0.3,
            maxWidth: '40rem',
            maxHeight: '8rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'pre-wrap',
            textAlign: 'center',
            margin: 0,
          }}
        >
          {code.slice(0, 500)}
        </pre>
      )}
    </div>
  );
}

const linkStyle = {
  background: 'none',
  border: '1px solid var(--foreground)',
  color: 'var(--foreground)',
  padding: '0.4rem 0.8rem',
  borderRadius: '4px',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: '0.8rem',
  opacity: 0.7,
};

export default function HeadlessApp() {
  return (
    <BloomEngineProvider>
      <HeadlessUI />
    </BloomEngineProvider>
  );
}
