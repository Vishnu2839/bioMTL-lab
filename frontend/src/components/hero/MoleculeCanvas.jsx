import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function CanvasCleanup() {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    return () => {
      if (gl && typeof gl.forceContextLoss === 'function') {
        // Prevent 'context already lost' warning if browser already trashed it
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
        else gl.forceContextLoss();
      }
    };
  }, [gl]);
  return null;
}

function DNAHelix() {
  const groupRef = useRef();
  const points1 = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 200; i++) {
      const t = (i / 200) * Math.PI * 6;
      pts.push(new THREE.Vector3(Math.cos(t) * 1.2, (i / 200) * 8 - 4, Math.sin(t) * 1.2));
    }
    return pts;
  }, []);
  const points2 = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 200; i++) {
      const t = (i / 200) * Math.PI * 6 + Math.PI;
      pts.push(new THREE.Vector3(Math.cos(t) * 1.2, (i / 200) * 8 - 4, Math.sin(t) * 1.2));
    }
    return pts;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  const curve1 = new THREE.CatmullRomCurve3(points1);
  const curve2 = new THREE.CatmullRomCurve3(points2);

  return (
    <group ref={groupRef}>
      <mesh>
        <tubeGeometry args={[curve1, 200, 0.05, 8, false]} />
        <meshStandardMaterial color="#c9963a" emissive="#c9963a" emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh>
        <tubeGeometry args={[curve2, 200, 0.05, 8, false]} />
        <meshStandardMaterial color="#e8b84b" emissive="#e8b84b" emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Rungs connecting the helices */}
      {Array.from({ length: 20 }, (_, i) => {
        const t = (i / 20) * Math.PI * 6;
        const y = (i / 20) * 8 - 4;
        const x1 = Math.cos(t) * 1.2;
        const z1 = Math.sin(t) * 1.2;
        const x2 = Math.cos(t + Math.PI) * 1.2;
        const z2 = Math.sin(t + Math.PI) * 1.2;
        const midX = (x1 + x2) / 2;
        const midZ = (z1 + z2) / 2;
        const len = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
        const angle = Math.atan2(z2 - z1, x2 - x1);
        return (
          <mesh key={i} position={[midX, y, midZ]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[len, 0.03, 0.03]} />
            <meshStandardMaterial color="#f4efe6" opacity={0.6} transparent />
          </mesh>
        );
      })}
      {/* Floating particles */}
      {Array.from({ length: 40 }, (_, i) => (
        <Float key={`p-${i}`} speed={1 + Math.random() * 2} floatIntensity={0.5}>
          <mesh position={[
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 5,
          ]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="#c9963a" emissive="#c9963a" emissiveIntensity={0.5} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export default function MoleculeCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      style={{ position: 'absolute', inset: 0 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#fdf3dc" />
      <pointLight position={[-3, -3, 2]} intensity={0.5} color="#c9963a" />
      <DNAHelix />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      <CanvasCleanup />
    </Canvas>
  );
}
