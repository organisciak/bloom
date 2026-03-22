import { useMemo } from 'react';
import * as THREE from 'three';

function seededRandom(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 1013904223) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

// Pyramid mesh for mountains
function Pyramid({ position, scale = 1 }) {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(scale * 2, scale * 4, 4);
    return g;
  }, [scale]);
  return (
    <mesh position={position} geometry={geo}>
      <meshBasicMaterial color="#ffffff" wireframe />
    </mesh>
  );
}

// Cylinder mesh for trees
function Tree({ position, scale = 1 }) {
  return (
    <group position={position}>
      <mesh position={[0, scale * 1.5, 0]}>
        <cylinderGeometry args={[0.1 * scale, 0.2 * scale, scale * 3, 6]} />
        <meshBasicMaterial color="#ffffff" wireframe />
      </mesh>
      <mesh position={[0, scale * 3.5, 0]}>
        <coneGeometry args={[scale * 1.2, scale * 2.5, 5]} />
        <meshBasicMaterial color="#ffffff" wireframe />
      </mesh>
    </group>
  );
}

// Cube mesh for buildings
function Building({ position, scale = 1 }) {
  const height = scale * (2 + seededRandom(position[0], position[2], 99) * 4);
  return (
    <mesh position={[position[0], height / 2, position[2]]}>
      <boxGeometry args={[scale * 2, height, scale * 2]} />
      <meshBasicMaterial color="#ffffff" wireframe />
    </mesh>
  );
}

// Icosahedron for crystals
function Crystal({ position, scale = 1 }) {
  return (
    <mesh position={[position[0], scale * 1.5, position[2]]}>
      <icosahedronGeometry args={[scale * 1.5, 0]} />
      <meshBasicMaterial color="#ffffff" wireframe />
    </mesh>
  );
}

// Torus for garden arches
function GardenArch({ position, scale = 1 }) {
  return (
    <mesh position={[position[0], scale * 2, position[2]]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[scale * 2, 0.15, 4, 8]} />
      <meshBasicMaterial color="#ffffff" wireframe />
    </mesh>
  );
}

// Cylinder stack for industrial
function Chimney({ position, scale = 1 }) {
  return (
    <group position={position}>
      <mesh position={[0, scale * 3, 0]}>
        <cylinderGeometry args={[scale * 0.5, scale * 0.8, scale * 6, 6]} />
        <meshBasicMaterial color="#ffffff" wireframe />
      </mesh>
    </group>
  );
}

function generateChunkObjects(cx, cy, zone, chunkSize) {
  const objects = [];
  const count = 5 + Math.floor(seededRandom(cx, cy, 42) * 10);

  for (let i = 0; i < count; i++) {
    const lx = (seededRandom(cx * 100 + i, cy * 200 + i, 1) - 0.5) * chunkSize * 0.9;
    const ly = (seededRandom(cx * 300 + i, cy * 400 + i, 2) - 0.5) * chunkSize * 0.9;
    const wx = cx * chunkSize + lx;
    const wy = cy * chunkSize + ly;
    const scale = 0.5 + seededRandom(cx + i, cy + i, 3) * 1.0;

    objects.push({ type: zone.terrain, pos: [wx, 0, wy], scale, key: `${cx},${cy},${i}` });
  }
  return objects;
}

function TerrainObject({ type, pos, scale }) {
  switch (type) {
    case 'forest':
      return <Tree position={pos} scale={scale} />;
    case 'city':
    case 'market':
      return <Building position={pos} scale={scale} />;
    case 'mountain':
      return <Pyramid position={pos} scale={scale} />;
    case 'cave':
      return <Crystal position={pos} scale={scale} />;
    case 'garden':
      return <GardenArch position={pos} scale={scale} />;
    case 'industrial':
      return <Chimney position={pos} scale={scale} />;
    case 'desert':
      return <Pyramid position={[pos[0], pos[1], pos[2]]} scale={scale * 0.6} />;
    case 'water':
      return (
        <mesh position={[pos[0], 0.1, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[scale * 0.5, scale * 1.5, 6]} />
          <meshBasicMaterial color="#ffffff" wireframe />
        </mesh>
      );
    case 'plains':
    default:
      return (
        <mesh position={[pos[0], 0.2, pos[2]]}>
          <octahedronGeometry args={[scale * 0.5, 0]} />
          <meshBasicMaterial color="#ffffff" wireframe />
        </mesh>
      );
  }
}

export default function Terrain({ chunks, chunkSize }) {
  const allObjects = useMemo(() => {
    return chunks.flatMap((c) => generateChunkObjects(c.cx, c.cy, c.zone, chunkSize));
  }, [chunks, chunkSize]);

  return (
    <group>
      {/* Ground grid */}
      <gridHelper args={[400, 80, '#222222', '#111111']} position={[0, -0.01, 0]} />
      {/* Terrain objects */}
      {allObjects.map((obj) => (
        <TerrainObject key={obj.key} type={obj.type} pos={obj.pos} scale={obj.scale} />
      ))}
      {/* Zone boundary indicators */}
      {chunks.map((c) => (
        <mesh key={`zone-${c.key}`} position={[c.cx * chunkSize, -0.02, c.cy * chunkSize]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[chunkSize * 0.45, chunkSize * 0.47, 4]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={c.explored ? 0.08 : 0.02} />
        </mesh>
      ))}
    </group>
  );
}
