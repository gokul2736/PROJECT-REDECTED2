"use client";

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls, Sky } from '@react-three/drei';

function Room() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Sky sunPosition={[100, 20, 100]} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* Desk */}
      <mesh position={[0, 0, -5]}>
        <boxGeometry args={[4, 1, 2]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Laptop Clue */}
      <mesh position={[0, 0.6, -5]} onClick={(e) => {
        e.stopPropagation();
        alert("Interacting with laptop... Dossier opening!");
      }}>
        <boxGeometry args={[1, 0.1, 0.8]} />
        <meshStandardMaterial color="#C0C0C0" />
      </mesh>

      <PointerLockControls />
    </>
  );
}

export default function Page() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas camera={{ position: [0, 2, 5] }}>
        <Room />
      </Canvas>
    </div>
  );
}