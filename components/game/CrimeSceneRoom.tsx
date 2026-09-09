"use client";

import { useEffect, useRef, useState } from "react";
import {
  Edges,
  Float,
  Html,
  RoundedBox,
  Text,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import type { Round1Clue } from "@/data/round1/evidence";

type Props = {
  clues: Round1Clue[];
  disabled: boolean;
  onInspect: (clue: Round1Clue) => void;
  onHover: (clue: Round1Clue | null) => void;
};

function FirstPersonController({
  disabled,
}: {
  disabled: boolean;
}) {
  const { camera, gl } = useThree();

  const keys = useRef<Set<string>>(new Set());
  const dragging = useRef(false);

  const yaw = useRef(0);
  const pitch = useRef(-0.04);

  const lastMouse = useRef({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    camera.position.set(0, 1.65, 5.3);
    camera.rotation.order = "YXZ";

    const canvas = gl.domElement;

    const keyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      keys.current.add(event.code);
    };

    const keyUp = (event: KeyboardEvent) => {
      keys.current.delete(event.code);
    };

    const blur = () => {
      keys.current.clear();
      dragging.current = false;
    };

    const pointerDown = (event: PointerEvent) => {
      if (disabled) return;

      if (event.button === 2) {
        event.preventDefault();
        dragging.current = true;

        lastMouse.current = {
          x: event.clientX,
          y: event.clientY,
        };
      }
    };

    const pointerUp = (event: PointerEvent) => {
      if (event.button === 2) {
        dragging.current = false;
      }
    };

    const pointerMove = (event: PointerEvent) => {
      if (disabled || !dragging.current) {
        return;
      }

      const dx = event.clientX - lastMouse.current.x;
      const dy = event.clientY - lastMouse.current.y;

      lastMouse.current = {
        x: event.clientX,
        y: event.clientY,
      };

      if (Math.abs(dx) > 120 || Math.abs(dy) > 120) {
        return;
      }

      yaw.current -= dx * 0.0022;
      pitch.current -= dy * 0.0017;

      pitch.current = THREE.MathUtils.clamp(
        pitch.current,
        -1.05,
        1.05,
      );
    };

    const preventContext = (event: MouseEvent) => {
      event.preventDefault();
    };

    window.addEventListener(
      "keydown",
      keyDown,
    );

    window.addEventListener(
      "keyup",
      keyUp,
    );

    window.addEventListener(
      "blur",
      blur,
    );

    canvas.addEventListener(
      "pointerdown",
      pointerDown,
    );

    canvas.addEventListener(
      "pointerup",
      pointerUp,
    );

    canvas.addEventListener(
      "pointermove",
      pointerMove,
    );

    canvas.addEventListener(
      "contextmenu",
      preventContext,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        keyDown,
      );

      window.removeEventListener(
        "keyup",
        keyUp,
      );

      window.removeEventListener(
        "blur",
        blur,
      );

      canvas.removeEventListener(
        "pointerdown",
        pointerDown,
      );

      canvas.removeEventListener(
        "pointerup",
        pointerUp,
      );

      canvas.removeEventListener(
        "pointermove",
        pointerMove,
      );

      canvas.removeEventListener(
        "contextmenu",
        preventContext,
      );

      keys.current.clear();
      dragging.current = false;
    };
  }, [camera, gl, disabled]);

  useFrame((_, delta) => {
    if (disabled) {
      keys.current.clear();
      dragging.current = false;
      return;
    }

    let forward = 0;
    let strafe = 0;

    if (
      keys.current.has("KeyW") ||
      keys.current.has("ArrowUp")
    ) {
      forward += 1;
    }

    if (
      keys.current.has("KeyS") ||
      keys.current.has("ArrowDown")
    ) {
      forward -= 1;
    }

    if (
      keys.current.has("KeyA") ||
      keys.current.has("ArrowLeft")
    ) {
      strafe -= 1;
    }

    if (
      keys.current.has("KeyD") ||
      keys.current.has("ArrowRight")
    ) {
      strafe += 1;
    }

    const move = new THREE.Vector3(
      strafe,
      0,
      -forward,
    );

    if (move.lengthSq() > 0) {
      move.normalize();

      const speed =
        keys.current.has("ShiftLeft") ||
        keys.current.has("ShiftRight")
          ? 4
          : 2.7;

      move.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        yaw.current,
      );

      camera.position.x +=
        move.x * speed * delta;

      camera.position.z +=
        move.z * speed * delta;
    }

    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x,
      -6.7,
      6.7,
    );

    camera.position.z = THREE.MathUtils.clamp(
      camera.position.z,
      -5.9,
      5.2,
    );

    camera.position.y = 1.65;

    camera.rotation.set(
      pitch.current,
      yaw.current,
      0,
    );
  });

  return null;
}

function EvidenceObject({
  clue,
  onInspect,
  onHover,
}: {
  clue: Round1Clue;
  onInspect: (clue: Round1Clue) => void;
  onHover: (clue: Round1Clue | null) => void;
}) {
  const [hovered, setHovered] =
    useState(false);

  return (
    <group
      position={clue.position}
      scale={[
        Math.max(clue.size[0], 0.55),
        Math.max(clue.size[1], 0.55),
        Math.max(clue.size[2], 0.4),
      ]}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        onHover(clue);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        setHovered(false);
        onHover(null);
      }}
      onClick={(event) => {
        event.stopPropagation();
        onInspect(clue);
      }}
    >
      <Float
        speed={0.8}
        rotationIntensity={0.02}
        floatIntensity={hovered ? 0.03 : 0}
      >
        <RoundedBox
          args={[0.72, 0.46, 0.28]}
          radius={0.04}
          smoothness={3}
        >
          <meshStandardMaterial
            color={clue.color}
            roughness={0.52}
            metalness={0.38}
            emissive={
              hovered ? "#f2c300" : "#000000"
            }
            emissiveIntensity={
              hovered ? 0.16 : 0
            }
          />
        </RoundedBox>

        <mesh position={[0, 0.07, 0.15]}>
          <boxGeometry
            args={[0.43, 0.13, 0.02]}
          />
          <meshStandardMaterial
            color="#ddd8ca"
            roughness={0.88}
          />
        </mesh>
      </Float>

      {hovered && (
        <>
          <Edges
            scale={1.08}
            threshold={15}
            color="#f2c300"
          />

          <Html
            center
            position={[0, 0.62, 0]}
            distanceFactor={6}
            style={{
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            <div className="rounded border border-[#f2c300]/50 bg-black/90 px-3 py-1.5 text-[9px] font-bold tracking-[0.16em] text-[#f2c300]">
              INSPECT
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

function LabDesk({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <RoundedBox
        args={[3.4, 0.18, 1.5]}
        position={[0, 1, 0]}
        radius={0.04}
        smoothness={3}
      >
        <meshStandardMaterial
          color="#382f27"
          roughness={0.82}
        />
      </RoundedBox>

      {[
        [-1.4, -0.58],
        [1.4, -0.58],
        [-1.4, 0.58],
        [1.4, 0.58],
      ].map(([x, z], i) => (
        <mesh
          key={i}
          position={[x, 0.48, z]}
        >
          <boxGeometry
            args={[0.14, 1.0, 0.14]}
          />
          <meshStandardMaterial
            color="#18191b"
            metalness={0.45}
          />
        </mesh>
      ))}

      <mesh
        position={[-0.55, 1.48, -0.15]}
      >
        <boxGeometry
          args={[1.3, 0.8, 0.06]}
        />
        <meshStandardMaterial
          color="#111315"
          metalness={0.65}
          roughness={0.25}
        />
      </mesh>

      <mesh
        position={[-0.55, 1.48, -0.11]}
      >
        <planeGeometry
          args={[1.08, 0.6]}
        />
        <meshStandardMaterial
          color="#26373c"
          emissive="#183e47"
          emissiveIntensity={0.65}
        />
      </mesh>

      <mesh
        position={[0.72, 1.22, -0.06]}
      >
        <boxGeometry
          args={[0.9, 0.07, 0.5]}
        />
        <meshStandardMaterial
          color="#25272a"
        />
      </mesh>

      {Array.from({ length: 15 }).map(
        (_, i) => (
          <mesh
            key={i}
            position={[
              0.32 + (i % 5) * 0.11,
              1.26,
              -0.16 +
                Math.floor(i / 5) * 0.09,
            ]}
          >
            <boxGeometry
              args={[0.06, 0.018, 0.04]}
            />
            <meshStandardMaterial
              color="#85888a"
            />
          </mesh>
        ),
      )}
    </group>
  );
}

function EvidenceBoard() {
  return (
    <group
      position={[0, 2.35, -7.0]}
    >
      <RoundedBox
        args={[5.3, 3.1, 0.12]}
        radius={0.035}
        smoothness={3}
      >
        <meshStandardMaterial
          color="#5a5040"
          roughness={0.98}
        />
      </RoundedBox>

      <mesh position={[0, 0, 0.08]}>
        <planeGeometry
          args={[4.82, 2.62]}
        />
        <meshStandardMaterial
          color="#272521"
          roughness={1}
        />
      </mesh>

      <Text
        position={[0, 1.08, 0.16]}
        fontSize={0.2}
        color="#e2dccd"
        anchorX="center"
        anchorY="middle"
      >
        INCIDENT BOARD // 22:17
      </Text>

      {[
        [-1.55, 0.47],
        [-0.5, 0.51],
        [0.56, 0.44],
        [1.55, 0.38],
        [-1.05, -0.35],
        [0, -0.43],
        [1.15, -0.36],
      ].map(([x, y], i) => (
        <group
          key={i}
          position={[x, y, 0.16]}
        >
          <mesh>
            <boxGeometry
              args={[
                i % 2
                  ? 0.88
                  : 0.76,
                0.46,
                0.025,
              ]}
            />
            <meshStandardMaterial
              color="#d8d1bf"
            />
          </mesh>

          <mesh
            position={[0, 0.05, 0.018]}
          >
            <sphereGeometry
              args={[0.034, 12, 12]}
            />
            <meshStandardMaterial
              color="#7f2525"
              metalness={0.2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CCTVUnit({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry
          args={[2.5, 1.55, 0.1]}
        />
        <meshStandardMaterial
          color="#111315"
          metalness={0.6}
          roughness={0.25}
        />
      </mesh>

      <mesh position={[0, 0, 0.06]}>
        <planeGeometry
          args={[2.18, 1.2]}
        />
        <meshStandardMaterial
          color="#183039"
          emissive="#123c48"
          emissiveIntensity={0.7}
        />
      </mesh>

      <Text
        position={[0, 0.38, 0.09]}
        fontSize={0.13}
        color="#b8c8c8"
        anchorX="center"
        anchorY="middle"
      >
        CCTV // CAMERA 03
      </Text>

      <Text
        position={[0, 0.04, 0.09]}
        fontSize={0.095}
        color="#87a4aa"
        anchorX="center"
        anchorY="middle"
      >
        CORRIDOR FEED
      </Text>

      <mesh
        position={[0, -0.34, 0.09]}
      >
        <boxGeometry
          args={[0.9, 0.035, 0.025]}
        />
        <meshStandardMaterial
          color="#842f2f"
          emissive="#842f2f"
          emissiveIntensity={0.7}
        />
      </mesh>
    </group>
  );
}

function StorageUnit({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <RoundedBox
        args={[2.2, 3.3, 0.65]}
        radius={0.04}
        smoothness={3}
      >
        <meshStandardMaterial
          color="#2d3033"
          metalness={0.3}
          roughness={0.68}
        />
      </RoundedBox>

      {[1.08, 0.32, -0.42, -1.15].map(
        (y, row) => (
          <mesh
            key={row}
            position={[0, y, 0.34]}
          >
            <boxGeometry
              args={[1.82, 0.05, 0.08]}
            />
            <meshStandardMaterial
              color={
                row === 0
                  ? "#817251"
                  : "#5b5e61"
              }
            />
          </mesh>
        ),
      )}

      <mesh
        position={[0, 0, 0.38]}
      >
        <boxGeometry
          args={[1.88, 0.035, 0.025]}
        />
        <meshStandardMaterial
          color="#131517"
        />
      </mesh>
    </group>
  );
}

function WallClock({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry
          args={[0.58, 0.58, 0.1, 32]}
        />
        <meshStandardMaterial
          color="#1d2022"
          metalness={0.62}
          roughness={0.28}
        />
      </mesh>

      <mesh position={[0, 0, 0.07]}>
        <cylinderGeometry
          args={[0.45, 0.45, 0.025, 32]}
        />
        <meshStandardMaterial
          color="#d8d0bd"
        />
      </mesh>

      <mesh
        position={[0, 0.11, 0.09]}
        rotation={[0, 0, Math.PI / 4]}
      >
        <boxGeometry
          args={[0.026, 0.22, 0.018]}
        />
        <meshStandardMaterial
          color="#262626"
        />
      </mesh>

      <mesh
        position={[0, -0.03, 0.09]}
        rotation={[0, 0, -Math.PI / 5]}
      >
        <boxGeometry
          args={[0.02, 0.3, 0.018]}
        />
        <meshStandardMaterial
          color="#262626"
        />
      </mesh>
    </group>
  );
}

function CeilingLighting() {
  const panels = [
    [-4.6, -1.7],
    [0, -1.7],
    [4.6, -1.7],
    [-3.0, 3.5],
    [3.0, 3.5],
  ];

  return (
    <group position={[0, 3.65, 0]}>
      {panels.map(([x, z], i) => (
        <group
          key={i}
          position={[x, 0, z]}
        >
          <mesh>
            <boxGeometry
              args={[2.05, 0.06, 0.58]}
            />
            <meshStandardMaterial
              color="#d7d1c5"
              emissive="#fff3d7"
              emissiveIntensity={1.8}
              roughness={0.3}
            />
          </mesh>

          <pointLight
            position={[0, -0.18, 0]}
            intensity={3.3}
            distance={5.5}
            color="#fff2d0"
          />
        </group>
      ))}
    </group>
  );
}

export function CrimeSceneRoom({
  clues,
  disabled,
  onInspect,
  onHover,
}: Props) {
  return (
    <>
      <FirstPersonController
        disabled={disabled}
      />

      {/* LIGHTING */}
      <ambientLight
        intensity={0.9}
        color="#fff7e7"
      />

      <hemisphereLight
        intensity={0.8}
        color="#fff7e8"
        groundColor="#383c40"
      />

      <directionalLight
        position={[0, 7, 3]}
        intensity={1.8}
        color="#fff0d0"
      />

      <directionalLight
        position={[-5, 5, 0]}
        intensity={1.0}
        color="#d8e4e8"
      />

      <pointLight
        position={[0, 2.7, 4.2]}
        intensity={2.0}
        distance={10}
        color="#ffeac0"
      />

      <pointLight
        position={[-5, 2.3, -2.8]}
        intensity={2.0}
        distance={8}
        color="#edf4f4"
      />

      <pointLight
        position={[5, 2.4, -1.8]}
        intensity={2.0}
        distance={8}
        color="#ffe9c4"
      />

      <CeilingLighting />

      {/* FLOOR */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry
          args={[18, 0.2, 15]}
        />
        <meshStandardMaterial
          color="#2d3032"
          roughness={0.9}
        />
      </mesh>

      <mesh position={[0, 0.02, 0]}>
        <planeGeometry
          args={[17.5, 14.5]}
        />
        <meshStandardMaterial
          color="#37393b"
          roughness={0.95}
        />
      </mesh>

      {/* WALLS */}
      <mesh position={[0, 3.8, -7.35]}>
        <boxGeometry
          args={[18, 7.8, 0.25]}
        />
        <meshStandardMaterial
          color="#333639"
          roughness={0.88}
        />
      </mesh>

      <mesh position={[-8.95, 3.8, 0]}>
        <boxGeometry
          args={[0.25, 7.8, 15]}
        />
        <meshStandardMaterial
          color="#303337"
          roughness={0.9}
        />
      </mesh>

      <mesh position={[8.95, 3.8, 0]}>
        <boxGeometry
          args={[0.25, 7.8, 15]}
        />
        <meshStandardMaterial
          color="#303337"
          roughness={0.9}
        />
      </mesh>

      <mesh position={[0, 7.8, 0]}>
        <boxGeometry
          args={[18, 0.22, 15]}
        />
        <meshStandardMaterial
          color="#44474a"
          roughness={0.9}
        />
      </mesh>

      {/* ROOM */}
      <LabDesk
        position={[-4.0, 0, -2.4]}
      />

      <LabDesk
        position={[3.8, 0, -2.2]}
      />

      <EvidenceBoard />

      <StorageUnit
        position={[-6.85, 1.72, -2.2]}
      />

      <CCTVUnit
        position={[4.45, 2.05, 3.15]}
      />

      <WallClock
        position={[-5.85, 2.75, -6.98]}
      />

      <group position={[-6.2, 2.65, 4.2]}>
        <RoundedBox
          args={[2.05, 1.35, 0.12]}
          radius={0.04}
          smoothness={3}
        >
          <meshStandardMaterial
            color="#25282a"
            metalness={0.25}
          />
        </RoundedBox>

        <Text
          position={[0, 0.38, 0.08]}
          fontSize={0.14}
          color="#f2c300"
          anchorX="center"
          anchorY="middle"
        >
          RESTRICTED AREA
        </Text>

        <Text
          position={[0, 0.08, 0.08]}
          fontSize={0.085}
          color="#aaa69d"
          anchorX="center"
          anchorY="middle"
        >
          AUTHORIZED PERSONNEL
        </Text>

        <Text
          position={[0, -0.19, 0.08]}
          fontSize={0.075}
          color="#777872"
          anchorX="center"
          anchorY="middle"
        >
          LAB-17 // LEVEL 03
        </Text>
      </group>

      {/* FLOOR MARKINGS */}
      {Array.from({ length: 13 }).map(
        (_, i) => (
          <mesh
            key={`v-${i}`}
            position={[
              -8 + i * 1.333,
              0.02,
              0,
            ]}
          >
            <boxGeometry
              args={[0.01, 0.005, 13.4]}
            />
            <meshStandardMaterial
              color="#4d5052"
            />
          </mesh>
        ),
      )}

      {Array.from({ length: 11 }).map(
        (_, i) => (
          <mesh
            key={`h-${i}`}
            position={[
              0,
              0.021,
              -6 + i * 1.22,
            ]}
          >
            <boxGeometry
              args={[16.7, 0.005, 0.01]}
            />
            <meshStandardMaterial
              color="#4d5052"
            />
          </mesh>
        ),
      )}

      {clues.map((clue) => (
        <EvidenceObject
          key={clue.id}
          clue={clue}
          onInspect={onInspect}
          onHover={onHover}
        />
      ))}
    </>
  );
}