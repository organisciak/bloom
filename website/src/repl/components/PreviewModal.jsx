import { useEffect } from 'react';
import cx from '@src/cx.mjs';

export function PreviewModal({ isOpen, onClose, onTry, onApply, title, code, children }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black opacity-70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex flex-col max-w-2xl max-h-[80vh] w-full mx-4 bg-background border border-foreground rounded-lg shadow-2xl fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-foreground">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-foreground opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {children || (
            <pre className="text-sm font-mono bg-lineBackground p-4 rounded border border-foreground overflow-auto">
              {code}
            </pre>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-foreground justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-foreground rounded hover:bg-lineHighlight transition-colors"
          >
            Cancel
          </button>
          {onTry && (
            <button
              onClick={() => {
                onTry();
                onClose();
              }}
              className="px-4 py-2 text-sm border border-foreground rounded hover:bg-lineHighlight transition-colors"
            >
              Try it
            </button>
          )}
          <button
            onClick={() => {
              onApply();
              onClose();
            }}
            className="px-4 py-2 text-sm bg-foreground text-background border border-foreground rounded hover:opacity-90 transition-opacity font-semibold"
          >
            Apply & Play
          </button>
        </div>
      </div>
    </div>
  );
}
