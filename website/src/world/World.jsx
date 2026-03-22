import { BloomEngineProvider, useBloomEngine } from '../engine/BloomEngineContext';
import { useWorld } from './useWorld';
import Scene from './Scene';
import './World.css';

function WorldUI() {
  const engine = useBloomEngine();
  const world = useWorld();
  const chunks = world.getVisibleChunks();

  const todLabel =
    world.timeOfDay < 0.15
      ? 'night'
      : world.timeOfDay < 0.3
        ? 'dawn'
        : world.timeOfDay < 0.5
          ? 'morning'
          : world.timeOfDay < 0.7
            ? 'afternoon'
            : world.timeOfDay < 0.85
              ? 'dusk'
              : 'night';

  return (
    <div className="world-container">
      <Scene
        playerPos={world.playerPos}
        trail={world.trail}
        chunks={chunks}
        chunkSize={world.CHUNK_SIZE}
        timeOfDay={world.timeOfDay}
        weather={world.weather}
      />

      <div className="world-hud">
        {/* Zone name */}
        <div className="world-zone-label">
          {world.currentZone.name}
          <div className="world-zone-mood">{world.currentZone.mood}</div>
        </div>

        {/* File + play controls */}
        <div className="world-file-bar">
          <button className="world-btn" onClick={world.openFile}>
            {world.fileName || 'open file'}
          </button>
          <button className={`world-btn ${engine.started ? 'active' : ''}`} onClick={engine.toggle}>
            {engine.started ? 'stop' : 'play'}
          </button>
          <button
            className={`world-btn ${world.settingsOpen ? 'active' : ''}`}
            onClick={() => world.setSettingsOpen((o) => !o)}
          >
            settings
          </button>
        </div>

        {/* Status bar */}
        <div className="world-status">
          <div className="world-status-line">
            pos: {world.playerPos[0].toFixed(0)}, {world.playerPos[1].toFixed(0)}
          </div>
          <div className="world-status-line">
            {todLabel} · {world.weather}
          </div>
          <div className="world-status-line">explored: {world.explored.size} zones</div>
          {world.fileName && <div className="world-status-line">file: {world.fileName}</div>}
        </div>

        {/* AI status indicator */}
        <div className={`world-ai-status ${world.aiStatus !== 'idle' ? 'visible' : ''}`}>
          {world.aiStatus === 'thinking' ? '· · · morphing · · ·' : world.aiStatus === 'done' ? '✓ morphed' : ''}
        </div>

        {/* Compass */}
        <div className="world-compass">
          N<br />
          W + E<br />S
        </div>

        {/* Settings panel */}
        {world.settingsOpen && (
          <div className="world-settings">
            <h3>World Settings</h3>

            <label>AI Update Frequency</label>
            <select
              value={world.settings.updateFrequency}
              onChange={(e) =>
                world.setSettings((s) => ({
                  ...s,
                  updateFrequency: Number(e.target.value),
                }))
              }
            >
              <option value={5}>5 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
            </select>

            <label>Change Intensity</label>
            <select
              value={world.settings.intensity}
              onChange={(e) =>
                world.setSettings((s) => ({
                  ...s,
                  intensity: e.target.value,
                }))
              }
            >
              <option value="subtle">subtle</option>
              <option value="moderate">moderate</option>
              <option value="drastic">drastic</option>
            </select>

            <label style={{ marginTop: 12 }}>Controls</label>
            <div style={{ opacity: 0.4, fontSize: 10, lineHeight: 1.6 }}>
              WASD / Arrow keys to move
              <br />
              Walk through zones to morph music
              <br />
              Open a .strudel file to begin
            </div>
          </div>
        )}

        {/* Minimap */}
        <canvas className="world-minimap" ref={(canvas) => {
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          canvas.width = 120;
          canvas.height = 120;
          ctx.clearRect(0, 0, 120, 120);
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, 120, 120);

          const scale = 2;
          const cx = 60;
          const cy = 60;

          // Draw explored chunks
          chunks.forEach((c) => {
            const x = cx + (c.cx * world.CHUNK_SIZE - world.playerPos[0]) * scale / world.CHUNK_SIZE;
            const y = cy + (c.cy * world.CHUNK_SIZE - world.playerPos[1]) * scale / world.CHUNK_SIZE;
            ctx.fillStyle = c.explored ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)';
            ctx.fillRect(x - scale, y - scale, scale * 2, scale * 2);
          });

          // Draw trail
          if (world.trail.length > 1) {
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            world.trail.forEach((p, i) => {
              const x = cx + (p[0] - world.playerPos[0]) * scale / world.CHUNK_SIZE;
              const y = cy + (p[1] - world.playerPos[1]) * scale / world.CHUNK_SIZE;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.stroke();
          }

          // Draw player
          ctx.fillStyle = '#fff';
          ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
        }} />
      </div>
    </div>
  );
}

export default function World() {
  return (
    <BloomEngineProvider>
      <WorldUI />
    </BloomEngineProvider>
  );
}
