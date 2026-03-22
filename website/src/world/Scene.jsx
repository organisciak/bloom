import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Terrain from './Terrain';
import Player from './Player';
import Weather from './Weather';

// 3/4 isometric camera that follows the player
function CameraRig({ playerPos }) {
  const { camera } = useThree();

  useFrame(() => {
    // 3/4 view: offset above and behind
    const targetX = playerPos[0] + 15;
    const targetZ = playerPos[1] + 15;
    const targetY = 25;

    camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.05);
    camera.lookAt(playerPos[0], 0, playerPos[1]);
  });

  return null;
}

// Day/night sky dome effect via ambient light
function DayNightCycle({ timeOfDay }) {
  // Map timeOfDay (0-1) to light intensity
  // 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
  const intensity = useMemo(() => {
    const angle = timeOfDay * Math.PI * 2;
    return Math.max(0.05, Math.sin(angle) * 0.4 + 0.3);
  }, [timeOfDay]);

  // Sun/moon position
  const sunAngle = timeOfDay * Math.PI * 2 - Math.PI / 2;
  const sunX = Math.cos(sunAngle) * 50;
  const sunY = Math.sin(sunAngle) * 50;

  const isDay = timeOfDay > 0.15 && timeOfDay < 0.85;

  return (
    <group>
      <ambientLight intensity={intensity} color="#ffffff" />
      {/* Wireframe sun or moon */}
      <mesh position={[sunX, Math.abs(sunY) + 10, -40]}>
        {isDay ? (
          <>
            <icosahedronGeometry args={[3, 1]} />
            <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.4} />
          </>
        ) : (
          <>
            <sphereGeometry args={[2, 6, 6]} />
            <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.2} />
          </>
        )}
      </mesh>
    </group>
  );
}

// Fog of war - darken unexplored areas
function FogOfWar({ chunks, chunkSize }) {
  return (
    <group>
      {chunks
        .filter((c) => !c.explored)
        .map((c) => (
          <mesh
            key={`fog-${c.key}`}
            position={[c.cx * chunkSize, 0.5, c.cy * chunkSize]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[chunkSize, chunkSize]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
        ))}
    </group>
  );
}

// Zone label as wireframe text stand-in (floating diamond with name via HTML)
function ZoneMarkers({ chunks, chunkSize }) {
  return (
    <group>
      {chunks
        .filter((c) => c.explored)
        .map((c) => (
          <mesh key={`marker-${c.key}`} position={[c.cx * chunkSize, 6, c.cy * chunkSize]}>
            <tetrahedronGeometry args={[0.4, 0]} />
            <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.2} />
          </mesh>
        ))}
    </group>
  );
}

export default function Scene({ playerPos, trail, chunks, chunkSize, timeOfDay, weather }) {
  return (
    <Canvas
      camera={{
        position: [playerPos[0] + 15, 25, playerPos[1] + 15],
        fov: 45,
        near: 0.1,
        far: 300,
      }}
      style={{ background: '#000000' }}
    >
      <CameraRig playerPos={playerPos} />
      <DayNightCycle timeOfDay={timeOfDay} />
      <Terrain chunks={chunks} chunkSize={chunkSize} />
      <Player position={playerPos} trail={trail} />
      <Weather type={weather} playerPos={playerPos} />
      <FogOfWar chunks={chunks} chunkSize={chunkSize} />
      <ZoneMarkers chunks={chunks} chunkSize={chunkSize} />
    </Canvas>
  );
}
