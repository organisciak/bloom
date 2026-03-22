import React from 'react';

export function Pad({ index, label, active, loading, disabled, onTrigger }) {
  const isActive = active || loading;

  return (
    <button
      className={`ctrl-pad ${isActive ? 'ctrl-pad--active' : ''} ${disabled ? 'ctrl-pad--disabled' : ''}`}
      onClick={() => !disabled && !loading && onTrigger(index)}
      disabled={disabled || loading}
      aria-label={label}
    >
      <span className="ctrl-pad-label">{label}</span>
      {loading && <span className="ctrl-pad-spinner" />}
    </button>
  );
}
