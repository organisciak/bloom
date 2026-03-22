import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Rain({ playerPos }) {
  const ref = useRef();
  const count = 300;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = Math.random() * 30;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      pos.array[i * 3 + 1] -= 0.4;
      if (pos.array[i * 3 + 1] < 0) {
        pos.array[i * 3 + 1] = 30;
        pos.array[i * 3] = playerPos[0] + (Math.random() - 0.5) * 60;
        pos.array[i * 3 + 2] = playerPos[1] + (Math.random() - 0.5) * 60;
      }
    }
    pos.needsUpdate = true;
    ref.current.position.set(0, 0, 0);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.08} transparent opacity={0.3} />
    </points>
  );
}

function Wind({ playerPos }) {
  const ref = useRef();
  const count = 100;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 80;
      arr[i * 3 + 1] = Math.random() * 5 + 0.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      pos.array[i * 3] += 0.3 + Math.sin(t + i) * 0.1;
      if (pos.array[i * 3] > playerPos[0] + 40) {
        pos.array[i * 3] = playerPos[0] - 40;
        pos.array[i * 3 + 2] = playerPos[1] + (Math.random() - 0.5) * 80;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.05} transparent opacity={0.2} />
    </points>
  );
}

function Fog({ playerPos }) {
  const ref = useRef();
  const count = 60;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = Math.random() * 3 + 0.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position;
    const t = clock.elapsedTime * 0.3;
    for (let i = 0; i < count; i++) {
      pos.array[i * 3] += Math.sin(t + i * 0.5) * 0.02;
      pos.array[i * 3 + 2] += Math.cos(t + i * 0.3) * 0.02;
    }
    pos.needsUpdate = true;
    ref.current.position.set(playerPos[0], 0, playerPos[1]);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.4} transparent opacity={0.08} />
    </points>
  );
}

function Storm({ playerPos }) {
  return (
    <>
      <Rain playerPos={playerPos} />
      <Wind playerPos={playerPos} />
    </>
  );
}

export default function Weather({ type, playerPos }) {
  switch (type) {
    case 'rain':
      return <Rain playerPos={playerPos} />;
    case 'wind':
      return <Wind playerPos={playerPos} />;
    case 'fog':
      return <Fog playerPos={playerPos} />;
    case 'storm':
      return <Storm playerPos={playerPos} />;
    default:
      return null;
  }
}
