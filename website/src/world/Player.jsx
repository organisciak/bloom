import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Player({ position, trail }) {
  const meshRef = useRef();

  // Animate player bob
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.position.set(position[0], 0.8 + Math.sin(clock.elapsedTime * 3) * 0.1, position[1]);
      meshRef.current.rotation.y = clock.elapsedTime * 0.5;
    }
  });

  // Trail as a Line object (not JSX <line> which conflicts with SVG)
  const trailLine = useMemo(() => {
    if (trail.length < 2) return null;
    const points = trail.map((p) => new THREE.Vector3(p[0], 0.05, p[1]));
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.15 });
    return new THREE.Line(geo, mat);
  }, [trail]);

  return (
    <group>
      {/* Player marker - wireframe diamond */}
      <mesh ref={meshRef} position={[position[0], 0.8, position[1]]}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial color="#ffffff" wireframe />
      </mesh>

      {/* Direction indicator */}
      <mesh position={[position[0], 0.3, position[1]]}>
        <ringGeometry args={[0.7, 0.8, 8]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.3} />
      </mesh>

      {/* Breadcrumb trail */}
      {trailLine && <primitive object={trailLine} />}
    </group>
  );
}
