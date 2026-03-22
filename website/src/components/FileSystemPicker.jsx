/*
FileSystemPicker - Shared file/workspace selection UI for Bloom mini-apps.
Provides open file, open workspace, auto-update toggle, and file name display.
Consumes values from useBloomEngine().
*/

const buttonStyle = {
  background: 'none',
  border: '1px solid var(--foreground)',
  color: 'var(--foreground)',
  padding: '0.3rem 0.6rem',
  borderRadius: '4px',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: '0.75rem',
  opacity: 0.7,
};

export default function FileSystemPicker({
  fileName,
  openFile,
  openWorkspace,
  autoUpdateEnabled,
  toggleAutoUpdate,
  autoUpdateDetected,
  compact = false,
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? '0.4rem' : '0.75rem',
        flexWrap: 'wrap',
      }}
    >
      <button onClick={openFile} style={buttonStyle}>
        open file
      </button>
      <button onClick={openWorkspace} style={buttonStyle}>
        workspace
      </button>
      {toggleAutoUpdate && (
        <button onClick={toggleAutoUpdate} style={buttonStyle}>
          auto-update: {autoUpdateEnabled ? 'on' : 'off'}
        </button>
      )}
      {fileName && (
        <span
          style={{
            fontSize: '0.8rem',
            opacity: 0.6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '12rem',
          }}
        >
          {fileName}
          {autoUpdateDetected && (
            <span style={{ color: 'var(--caret)', marginLeft: '0.4rem' }}>syncing</span>
          )}
        </span>
      )}
    </div>
  );
}
