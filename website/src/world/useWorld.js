import { useState, useRef, useCallback, useEffect } from 'react';

// --- Zone definitions ---
const ZONE_TYPES = [
  { name: 'The Quiet Forest', mood: 'chill', color: '#446644', terrain: 'forest' },
  { name: 'Neon City', mood: 'energetic', color: '#6644aa', terrain: 'city' },
  { name: 'The Void Plains', mood: 'dark', color: '#333344', terrain: 'plains' },
  { name: 'Crystal Caverns', mood: 'ambient', color: '#445566', terrain: 'cave' },
  { name: 'Storm Ridge', mood: 'chaotic', color: '#664433', terrain: 'mountain' },
  { name: 'Sunken Gardens', mood: 'dreamy', color: '#335544', terrain: 'garden' },
  { name: 'Machine Yard', mood: 'industrial', color: '#555544', terrain: 'industrial' },
  { name: 'Ember Wastes', mood: 'intense', color: '#663322', terrain: 'desert' },
  { name: 'Whisper Lake', mood: 'melancholy', color: '#334455', terrain: 'water' },
  { name: 'The Bazaar', mood: 'playful', color: '#554466', terrain: 'market' },
];

const WEATHER_TYPES = ['clear', 'rain', 'wind', 'fog', 'storm'];
const WEATHER_MOODS = { clear: 'open', rain: 'melancholy', wind: 'restless', fog: 'mysterious', storm: 'intense' };

const CHUNK_SIZE = 40;
const ZONE_RADIUS = 20;

// Seeded random for deterministic chunk generation
function seededRandom(x, y) {
  let h = (x * 374761393 + y * 668265263 + 1013904223) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

function getChunkZone(cx, cy) {
  const r = seededRandom(cx, cy);
  const idx = Math.floor(r * ZONE_TYPES.length);
  return { ...ZONE_TYPES[idx], chunkX: cx, chunkY: cy };
}

function posToChunk(x, y) {
  return [Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE)];
}

function chunkKey(cx, cy) {
  return `${cx},${cy}`;
}

// Classify path shape from recent breadcrumbs
function classifyPath(trail) {
  if (trail.length < 10) return 'still';
  const recent = trail.slice(-30);
  // Check for loops: did we return near start?
  const start = recent[0];
  const end = recent[recent.length - 1];
  const dist = Math.hypot(end[0] - start[0], end[1] - start[1]);
  if (dist < 3 && recent.length > 15) return 'loop';
  // Check for zigzags: count direction changes
  let turns = 0;
  for (let i = 2; i < recent.length; i++) {
    const dx1 = recent[i - 1][0] - recent[i - 2][0];
    const dy1 = recent[i - 1][1] - recent[i - 2][1];
    const dx2 = recent[i][0] - recent[i - 1][0];
    const dy2 = recent[i][1] - recent[i - 1][1];
    const cross = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(cross) > 0.3) turns++;
  }
  if (turns > recent.length * 0.4) return 'zigzag';
  return 'straight';
}

export function useWorld() {
  const [playerPos, setPlayerPos] = useState([0, 0]);
  const [currentZone, setCurrentZone] = useState(getChunkZone(0, 0));
  const [trail, setTrail] = useState([[0, 0]]);
  const [explored, setExplored] = useState(new Set(['0,0']));
  const [timeOfDay, setTimeOfDay] = useState(0.25); // 0-1, 0.25 = sunrise
  const [weather, setWeather] = useState('clear');
  const [weatherTimer, setWeatherTimer] = useState(0);
  const [aiStatus, setAiStatus] = useState('idle'); // idle | thinking | done
  const [settings, setSettings] = useState({
    updateFrequency: 15, // seconds
    intensity: 'moderate', // subtle | moderate | drastic
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [code, setCode] = useState('');
  const [fileName, setFileName] = useState('');

  const fileHandleRef = useRef(null);
  const lastAiCallRef = useRef(0);
  const keysRef = useRef({});
  const stepCountRef = useRef(0);
  const aiCooldownRef = useRef(false);

  // File System Access
  const openFile = useCallback(async () => {
    if (typeof window === 'undefined' || !window.showOpenFilePicker) return;
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Strudel files', accept: { 'text/plain': ['.strudel', '.js', '.txt'] } }],
      });
      fileHandleRef.current = handle;
      setFileName(handle.name);
      const file = await handle.getFile();
      setCode(await file.text());
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
  }, []);

  const writeFile = useCallback(async (newCode) => {
    const handle = fileHandleRef.current;
    if (!handle) return;
    try {
      const writable = await handle.createWritable();
      await writable.write(newCode);
      await writable.close();
      setCode(newCode);
    } catch (e) {
      console.error('Write failed:', e);
    }
  }, []);

  // Poll file for external changes
  useEffect(() => {
    if (!fileHandleRef.current) return;
    const poll = async () => {
      try {
        const file = await fileHandleRef.current.getFile();
        const text = await file.text();
        setCode((prev) => (text !== prev ? text : prev));
      } catch {}
    };
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [fileName]);

  // Movement
  const movePlayer = useCallback((dx, dy) => {
    setPlayerPos((prev) => {
      const nx = prev[0] + dx;
      const ny = prev[1] + dy;
      const [cx, cy] = posToChunk(nx, ny);
      const key = chunkKey(cx, cy);

      setCurrentZone(getChunkZone(cx, cy));
      setExplored((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      setTrail((prev) => {
        const next = [...prev, [nx, ny]];
        return next.length > 200 ? next.slice(-200) : next;
      });

      stepCountRef.current++;
      // Advance time of day with steps
      setTimeOfDay((t) => (t + 0.0005) % 1);
      // Weather changes every ~200 steps
      setWeatherTimer((wt) => {
        const next = wt + 1;
        if (next > 200) {
          setWeather(WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)]);
          return 0;
        }
        return next;
      });

      return [nx, ny];
    });
  }, []);

  // Keyboard input
  useEffect(() => {
    const onDown = (e) => {
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const onUp = (e) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Game loop for movement
  useEffect(() => {
    const speed = 0.3;
    const interval = setInterval(() => {
      const k = keysRef.current;
      let dx = 0,
        dy = 0;
      if (k['w'] || k['arrowup']) dy -= speed;
      if (k['s'] || k['arrowdown']) dy += speed;
      if (k['a'] || k['arrowleft']) dx -= speed;
      if (k['d'] || k['arrowright']) dx += speed;
      if (dx !== 0 || dy !== 0) {
        // Normalize diagonal
        if (dx !== 0 && dy !== 0) {
          dx *= 0.707;
          dy *= 0.707;
        }
        movePlayer(dx, dy);
      }
    }, 33); // ~30fps
    return () => clearInterval(interval);
  }, [movePlayer]);

  // Claude AI integration
  const triggerAi = useCallback(async () => {
    if (!code || aiCooldownRef.current) return;
    aiCooldownRef.current = true;
    setAiStatus('thinking');

    const pathShape = classifyPath(trail);
    const isNewTerritory = explored.size > 0 && explored.size % 5 === 0;
    const tod = timeOfDay < 0.25 ? 'night' : timeOfDay < 0.5 ? 'morning' : timeOfDay < 0.75 ? 'afternoon' : 'evening';

    const intensityMap = { subtle: 'Make only small, subtle changes.', moderate: 'Make moderate changes.', drastic: 'Make bold, dramatic changes.' };

    const prompt = [
      `The player is walking through "${currentZone.name}" (mood: ${currentZone.mood}).`,
      `Time of day: ${tod}. Weather: ${weather} (mood: ${WEATHER_MOODS[weather] || 'neutral'}).`,
      `Walking pattern: ${pathShape} (loop=repetitive feel, zigzag=chaotic energy, straight=droning meditation, still=ambient pause).`,
      isNewTerritory ? 'The player just entered unexplored territory — be more adventurous.' : '',
      intensityMap[settings.intensity],
      'Morph the music to match the atmosphere. Keep it as valid Strudel code.',
    ]
      .filter(Boolean)
      .join(' ');

    try {
      const res = await fetch('/api/claude-api', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, prompt }),
      });
      const data = await res.json();
      if (res.ok && data.code) {
        await writeFile(data.code);
        setAiStatus('done');
        setTimeout(() => setAiStatus('idle'), 2000);
      } else {
        setAiStatus('idle');
      }
    } catch {
      setAiStatus('idle');
    }

    setTimeout(() => {
      aiCooldownRef.current = false;
    }, settings.updateFrequency * 1000);
  }, [code, trail, currentZone, weather, timeOfDay, settings, explored, writeFile]);

  // Auto-trigger AI on interval
  useEffect(() => {
    if (!code) return;
    const id = setInterval(() => {
      triggerAi();
    }, settings.updateFrequency * 1000);
    return () => clearInterval(id);
  }, [triggerAi, settings.updateFrequency, code]);

  // Generate chunks around player
  const getVisibleChunks = useCallback(() => {
    const [cx, cy] = posToChunk(playerPos[0], playerPos[1]);
    const chunks = [];
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        const x = cx + dx;
        const y = cy + dy;
        chunks.push({
          key: chunkKey(x, y),
          cx: x,
          cy: y,
          zone: getChunkZone(x, y),
          explored: explored.has(chunkKey(x, y)),
        });
      }
    }
    return chunks;
  }, [playerPos, explored]);

  return {
    playerPos,
    currentZone,
    trail,
    explored,
    timeOfDay,
    weather,
    aiStatus,
    settings,
    setSettings,
    settingsOpen,
    setSettingsOpen,
    code,
    fileName,
    openFile,
    triggerAi,
    getVisibleChunks,
    movePlayer,
    CHUNK_SIZE,
  };
}
