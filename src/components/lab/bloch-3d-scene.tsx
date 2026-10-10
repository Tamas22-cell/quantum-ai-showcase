/**
 * WebGL Bloch sphere (react-three-fiber). Browser-only: import lazily after hydration.
 * Physics axes → three.js axes: x → +Z (towards viewer), y → +X (right), z → +Y (up).
 */
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import type { BlochVec } from "@/lib/quantum/bloch-zxz";

// WebGL materials can't read CSS tokens; these mirror the site's cyan/navy palette.
const CYAN = "#2dd4bf";
const AXIS = "#64748b";
const TRAIL = "#38bdf8";

const toThree = (v: BlochVec) => new THREE.Vector3(v.y, v.z, v.x);

export type BlochSceneHandle = { resetCamera: () => void };

function StateArrow({ target }: { target: BlochVec }) {
  const group = useRef<THREE.Group>(null);
  const current = useRef(new THREE.Vector3(0, 1, 0));
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const goal = toThree(target);
    // Frame-rate independent easing towards the exact target.
    current.current.lerp(goal, 1 - Math.exp(-14 * dt));
    if (current.current.lengthSq() > 1e-6) current.current.normalize();
    const g = group.current;
    if (g) g.quaternion.setFromUnitVectors(up, current.current.clone().normalize());
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0.44, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.88, 16]} />
        <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 0.94, 0]}>
        <coneGeometry args={[0.06, 0.13, 24]} />
        <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function Label({ position, children }: { position: [number, number, number]; children: string }) {
  return (
    <Html position={position} center style={{ pointerEvents: "none" }}>
      <span className="whitespace-nowrap rounded-sm bg-background/80 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
        {children}
      </span>
    </Html>
  );
}

function Axis({ to, color }: { to: [number, number, number]; color: string }) {
  return (
    <Line
      points={[[-to[0], -to[1], -to[2]], to]}
      color={color}
      lineWidth={1.2}
      transparent
      opacity={0.75}
    />
  );
}

export const BlochScene = forwardRef<
  BlochSceneHandle,
  { vector: BlochVec; trail: BlochVec[] }
>(function BlochScene({ vector, trail }, ref) {
  const controls = useRef<OrbitControlsImpl>(null);
  useImperativeHandle(ref, () => ({ resetCamera: () => controls.current?.reset() }), []);
  const trailPoints = useMemo(
    () => trail.map((p) => toThree(p).toArray() as [number, number, number]),
    [trail],
  );

  return (
    <Canvas
      camera={{ position: [1.9, 1.3, 2.4], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      aria-label="3D Bloch sphere"
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.2} />
      <mesh>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial color={CYAN} transparent opacity={0.08} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.001, 24, 16]} />
        <meshBasicMaterial color={CYAN} wireframe transparent opacity={0.12} />
      </mesh>
      {/* Equator */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.004, 8, 96]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.5} />
      </mesh>
      <Axis to={[0, 0, 1.25]} color="#f87171" />
      <Axis to={[1.25, 0, 0]} color="#4ade80" />
      <Axis to={[0, 1.25, 0]} color={AXIS} />
      <Label position={[0, 1.38, 0]}>|0⟩ +Z</Label>
      <Label position={[0, -1.38, 0]}>|1⟩ −Z</Label>
      <Label position={[0, 0, 1.4]}>|+⟩ +X</Label>
      <Label position={[0, 0, -1.4]}>|−⟩ −X</Label>
      <Label position={[1.4, 0, 0]}>|+i⟩ +Y</Label>
      <Label position={[-1.4, 0, 0]}>|−i⟩ −Y</Label>
      {trailPoints.length > 1 ? (
        <Line points={trailPoints} color={TRAIL} lineWidth={2} transparent opacity={0.7} />
      ) : null}
      <StateArrow target={vector} />
      <OrbitControls
        ref={controls}
        enablePan={false}
        enableDamping
        minDistance={1.8}
        maxDistance={6}
      />
    </Canvas>
  );
});
