import React, { useRef, useCallback } from 'react';

const ROTATION_RANGE = 270; // degrees of rotation
const DRAG_SENSITIVITY = 200; // pixels for full range

export function Knob({ name, label, value, range, onChange }) {
  const dragRef = useRef(null);

  const displayValue = range?.toValue?.(value) ?? Math.round(value * 100);
  const unit = range?.unit ?? '';
  const rotation = -135 + value * ROTATION_RANGE;

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      const startY = e.clientY;
      const startValue = value;
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);

      const onMove = (ev) => {
        const dy = startY - ev.clientY;
        const delta = dy / DRAG_SENSITIVITY;
        onChange(name, Math.max(0, Math.min(1, startValue + delta)));
      };

      const onUp = () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
      };

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
    },
    [name, value, onChange],
  );

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const delta = -e.deltaY / 1000;
      onChange(name, Math.max(0, Math.min(1, value + delta)));
    },
    [name, value, onChange],
  );

  return (
    <div className="ctrl-knob-wrapper">
      <div
        className="ctrl-knob"
        ref={dragRef}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
        role="slider"
        aria-label={label}
        aria-valuenow={displayValue}
        tabIndex={0}
      >
        <div className="ctrl-knob-body">
          <div className="ctrl-knob-indicator" style={{ transform: `rotate(${rotation}deg)` }}>
            <div className="ctrl-knob-tick" />
          </div>
          <div className="ctrl-knob-ring" />
        </div>
      </div>
      <div className="ctrl-knob-value">
        {displayValue}
        {unit ? <span className="ctrl-knob-unit">{unit}</span> : null}
      </div>
      <div className="ctrl-knob-label">{label}</div>
    </div>
  );
}
