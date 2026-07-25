import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Trail } from '@react-three/drei';

function lerp(start, end, t) {
  return start * (1 - t) + end * t;
}

function AnimatedScene({ latestEvent }) {
  const ballRef = useRef();
  const batsmanRef = useRef();
  const nonStrikerRef = useRef();
  const bowlerRef = useRef();
  const stumpsRef = useRef();

  const [animState, setAnimState] = useState({
    active: false,
    type: 'idle',
    startTime: 0,
    runs: 0,
    isWicket: false
  });

  useEffect(() => {
    if (!latestEvent) return;

    const runs = Number(latestEvent.totalRuns) || 0;
    const isWicket = latestEvent.isWicket;

    let type = 'idle';
    if (isWicket) type = 'wicket';
    else if (runs >= 4) type = 'boundary';
    else if (runs > 0) type = 'run';

    if (type !== 'idle') {
      setAnimState({
        active: true,
        type,
        startTime: Date.now(),
        runs,
        isWicket
      });

      setTimeout(() => {
        setAnimState(s => ({ ...s, active: false, type: 'idle' }));
        
        if (ballRef.current) ballRef.current.position.set(0, 0.2, 10);
        if (batsmanRef.current) batsmanRef.current.position.set(-1, 1, 9);
        if (nonStrikerRef.current) nonStrikerRef.current.position.set(1, 1, -9);
        if (stumpsRef.current) {
          stumpsRef.current.rotation.x = 0;
          stumpsRef.current.position.z = 10;
        }
      }, type === 'run' ? runs * 1500 : 3000);
    }
  }, [latestEvent]);

  useFrame(() => {
    if (!animState.active) return;
    const elapsed = (Date.now() - animState.startTime) / 1000;

    if (ballRef.current) {
       if (animState.type === 'boundary') {
          const t = Math.min(elapsed / 2.0, 1.0);
          ballRef.current.position.x = lerp(0, -30, t);
          ballRef.current.position.z = lerp(10, -40, t);
          ballRef.current.position.y = 0.2 + 25 * (1 - Math.pow(t * 2 - 1, 2));
       } else if (animState.type === 'wicket') {
          const t = Math.min(elapsed / 0.5, 1.0);
          ballRef.current.position.z = lerp(-10, 10, t);
          if (t >= 1.0 && stumpsRef.current) {
             stumpsRef.current.rotation.x = lerp(stumpsRef.current.rotation.x, -Math.PI / 3, 0.2);
             stumpsRef.current.position.z = lerp(stumpsRef.current.position.z, 10.5, 0.2);
          }
       } else if (animState.type === 'run') {
          const t = Math.min(elapsed / 1.0, 1.0);
          ballRef.current.position.x = lerp(0, 15, t);
          ballRef.current.position.z = lerp(10, -15, t);
          ballRef.current.position.y = 0.2;
       }
    }

    if (animState.type === 'run' && batsmanRef.current && nonStrikerRef.current) {
       const runs = animState.runs;
       const totalRunTime = runs * 1.5;
       if (elapsed <= totalRunTime) {
          const currentRun = Math.floor(elapsed / 1.5);
          const runProgress = (elapsed % 1.5) / 1.5;
          const t = runProgress < 0.5 ? 2 * runProgress * runProgress : -1 + (4 - 2 * runProgress) * runProgress;

          const goingToNonStrikerEnd = currentRun % 2 === 0;

          if (goingToNonStrikerEnd) {
             batsmanRef.current.position.z = lerp(9, -9, t);
             nonStrikerRef.current.position.z = lerp(-9, 9, t);
          } else {
             batsmanRef.current.position.z = lerp(-9, 9, t);
             nonStrikerRef.current.position.z = lerp(9, -9, t);
          }
       }
    }
  });

  return (
    <group>
      {/* Pitch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[3, 20]} />
        <meshStandardMaterial color="#c6b185" roughness={0.9} />
      </mesh>

      {/* Crease lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 8]}>
        <planeGeometry args={[3, 0.1]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -8]}>
        <planeGeometry args={[3, 0.1]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Field */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[60, 64]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </mesh>
      
      {/* Boundary rope */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[59.5, 60, 64]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Stumps (Striker) */}
      <group ref={stumpsRef} position={[0, 0, 10]}>
        <mesh position={[-0.2, 0.4, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.2, 0.4, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* Stumps (Non-Striker) */}
      <group position={[0, 0, -10]}>
        <mesh position={[-0.2, 0.4, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.2, 0.4, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* Batsman */}
      <mesh ref={batsmanRef} position={[-1, 1, 9]}>
        <capsuleGeometry args={[0.3, 1, 4, 8]} />
        <meshStandardMaterial color="#1f4e99" roughness={0.6} />
      </mesh>

      {/* Non-Striker */}
      <mesh ref={nonStrikerRef} position={[1, 1, -9]}>
        <capsuleGeometry args={[0.3, 1, 4, 8]} />
        <meshStandardMaterial color="#1f4e99" roughness={0.6} />
      </mesh>

      {/* Bowler */}
      <mesh ref={bowlerRef} position={[-1, 1, -12]}>
        <capsuleGeometry args={[0.3, 1, 4, 8]} />
        <meshStandardMaterial color="#a61c1c" roughness={0.6} />
      </mesh>

      {/* Ball with Trail */}
      <Trail width={0.5} length={20} color="#ff3333" attenuation={(t) => t * t}>
        <mesh ref={ballRef} position={[0, 0.2, 10]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </Trail>

    </group>
  );
}

export default function VirtualArena3D({ latestEvent }) {
  return (
    <div className="absolute inset-0">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 8, 25]} fov={50} />
        <OrbitControls 
          enablePan={false} 
          minPolarAngle={Math.PI / 4} 
          maxPolarAngle={Math.PI / 2.2} 
          minDistance={10} 
          maxDistance={40} 
        />
        
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
        <pointLight position={[-10, 15, -10]} intensity={0.8} color="#d7ff5f" />
        <pointLight position={[10, 15, 10]} intensity={0.8} color="#d7ff5f" />
        
        <fog attach="fog" args={['#0c1517', 20, 80]} />
        
        <AnimatedScene latestEvent={latestEvent} />
      </Canvas>
      
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(12,21,23,0.8)_100%)]" />
    </div>
  );
}
