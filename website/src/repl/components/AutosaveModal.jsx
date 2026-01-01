import { useEffect } from 'react';

function formatTimestamp(value) {
  if (!value || !Number.isFinite(value)) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleString();
}

export function AutosaveModal({ isOpen, onClose, onRestore, fileLabel, autosaveTime, fileTime, code }) {
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center fade-in">
      <div className="absolute inset-0 bg-black opacity-70" onClick={onClose} />

      <div className="relative z-10 flex flex-col max-w-2xl max-h-[80vh] w-full mx-4 bg-background border border-foreground rounded-lg shadow-2xl fade-in">
        <div className="flex items-center justify-between p-4 border-b border-foreground">
          <h2 className="text-lg font-semibold">Recover autosave?</h2>
          <button
            onClick={onClose}
            className="text-foreground opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col gap-3 text-sm">
          <p>
            We found a newer autosave for <strong>{fileLabel || 'this file'}</strong>.
          </p>
          <div className="flex flex-col gap-1">
            <span>Autosave: {formatTimestamp(autosaveTime)}</span>
            <span>File saved: {formatTimestamp(fileTime)}</span>
          </div>
          <details className="border border-foreground rounded p-2">
            <summary className="cursor-pointer">Preview autosave</summary>
            <pre className="text-xs font-mono bg-lineBackground p-3 rounded mt-2 max-h-64 overflow-auto whitespace-pre-wrap">
              {code}
            </pre>
          </details>
          <p className="opacity-80">Restoring will replace the editor contents. You can still save or discard.</p>
        </div>

        <div className="flex gap-3 p-4 border-t border-foreground justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-foreground rounded hover:bg-lineHighlight transition-colors"
          >
            Keep file
          </button>
          <button
            onClick={onRestore}
            className="px-4 py-2 text-sm bg-foreground text-background border border-foreground rounded hover:opacity-90 transition-opacity font-semibold"
          >
            Restore autosave
          </button>
        </div>
      </div>
    </div>
  );
}
