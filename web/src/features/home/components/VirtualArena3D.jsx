import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Trail } from '@react-three/drei';

const RUN_SEGMENT_SECONDS = 1.35;
const STRIKER_START = [-1, 1, 9];
const NON_STRIKER_START = [1, 1, -9];
const BALL_AT_BAT = [0, 0.2, 10];
const BALL_FROM_BOWLER = [0, 0.2, -10];

function lerp(start, end, t) {
  return start * (1 - t) + end * t;
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function getNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getEventKey(event) {
  return String(
    event?._id
      || event?.id
      || `${event?.innings ?? ''}:${event?.over ?? ''}:${event?.ball ?? ''}:${event?.createdAt ?? ''}:${event?.totalRuns ?? ''}:${event?.isWicket ?? ''}`
  );
}

function getRunningRuns(event) {
  const batterRuns = getNumber(event?.batterRuns ?? event?.runs ?? event?.totalRuns);
  const extras = getNumber(event?.extras);
  const extraType = event?.extraType || 'NONE';

  if (['BYE', 'LEG_BYE'].includes(extraType)) {
    return batterRuns + extras;
  }

  return batterRuns;
}

function getAnimationForEvent(event) {
  const shotRuns = getNumber(event?.batterRuns ?? event?.runs ?? event?.totalRuns);
  const runningRuns = Math.max(0, Math.min(Math.round(getRunningRuns(event)), 6));
  const totalRuns = getNumber(event?.totalRuns ?? shotRuns + getNumber(event?.extras));
  const isWicket = Boolean(event?.isWicket);

  if (isWicket) {
    return { type: 'wicket', runningRuns, shotRuns, durationMs: 2600 };
  }

  if (shotRuns === 4 || shotRuns === 6) {
    return { type: 'boundary', runningRuns, shotRuns, durationMs: 3000 };
  }

  if (runningRuns > 0) {
    return {
      type: 'run',
      runningRuns,
      shotRuns,
      durationMs: Math.round((runningRuns * RUN_SEGMENT_SECONDS + 0.45) * 1000),
    };
  }

  if (totalRuns > 0) {
    return { type: 'extra', runningRuns, shotRuns, durationMs: 1500 };
  }

  return { type: 'idle', runningRuns: 0, shotRuns: 0, durationMs: 0 };
}

function AnimatedScene({ latestEvent }) {
  const ballRef = useRef();
  const batsmanRef = useRef();
  const nonStrikerRef = useRef();
  const bowlerRef = useRef();
  const stumpsRef = useRef();
  const finishTimeoutRef = useRef(null);
  const lastEventKeyRef = useRef('');

  const [animState, setAnimState] = useState({
    active: false,
    type: 'idle',
    startTime: 0,
    runningRuns: 0,
    shotRuns: 0,
    isWicket: false,
  });

  function setPosition(ref, position) {
    if (ref.current) {
      ref.current.position.set(position[0], position[1], position[2]);
    }
  }

  function resetScene(type = 'idle') {
    setPosition(ballRef, type === 'wicket' || type === 'extra' ? BALL_FROM_BOWLER : BALL_AT_BAT);
    setPosition(batsmanRef, STRIKER_START);
    setPosition(nonStrikerRef, NON_STRIKER_START);

    if (stumpsRef.current) {
      stumpsRef.current.rotation.set(0, 0, 0);
      stumpsRef.current.position.set(0, 0, 10);
    }
  }

  function settleRunners(runs) {
    const swappedEnds = runs % 2 === 1;
    setPosition(batsmanRef, swappedEnds ? [-1, 1, -9] : STRIKER_START);
    setPosition(nonStrikerRef, swappedEnds ? [1, 1, 9] : NON_STRIKER_START);
  }

  useEffect(() => () => {
    if (finishTimeoutRef.current) {
      window.clearTimeout(finishTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!latestEvent) return;

    const eventKey = getEventKey(latestEvent);
    if (eventKey === lastEventKeyRef.current) return;
    lastEventKeyRef.current = eventKey;

    if (finishTimeoutRef.current) {
      window.clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }

    const animation = getAnimationForEvent(latestEvent);
    if (animation.type === 'idle') {
      resetScene('idle');
      setAnimState((current) => ({ ...current, active: false, type: 'idle' }));
      return;
    }

    resetScene(animation.type);

    setAnimState({
      active: true,
      type: animation.type,
      startTime: performance.now(),
      runningRuns: animation.runningRuns,
      shotRuns: animation.shotRuns,
      isWicket: animation.type === 'wicket',
    });

    finishTimeoutRef.current = window.setTimeout(() => {
      if (animation.type === 'run') {
        settleRunners(animation.runningRuns);
      }

      setAnimState((current) => ({ ...current, active: false, type: 'idle' }));
      finishTimeoutRef.current = null;
    }, animation.durationMs);
  }, [latestEvent]);

  useFrame(() => {
    if (!animState.active) return;
    const elapsed = (performance.now() - animState.startTime) / 1000;

    if (ballRef.current) {
       if (animState.type === 'boundary') {
          const t = Math.min(elapsed / 2.0, 1.0);
          ballRef.current.position.x = lerp(0, -30, t);
          ballRef.current.position.z = lerp(10, -40, t);
          ballRef.current.position.y = 0.2 + (animState.shotRuns === 6 ? 25 : 5) * Math.sin(Math.PI * t);
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
       } else if (animState.type === 'extra') {
          const t = Math.min(elapsed / 1.0, 1.0);
          ballRef.current.position.x = lerp(0, 1.35, t);
          ballRef.current.position.z = lerp(-10, 12, t);
          ballRef.current.position.y = 0.2;
       }
    }

    if (animState.type === 'run' && batsmanRef.current && nonStrikerRef.current) {
       const runs = animState.runningRuns;
       const totalRunTime = runs * RUN_SEGMENT_SECONDS;
       if (elapsed < totalRunTime) {
          const currentRun = Math.floor(elapsed / RUN_SEGMENT_SECONDS);
          const runProgress = (elapsed % RUN_SEGMENT_SECONDS) / RUN_SEGMENT_SECONDS;
          const t = easeInOutQuad(runProgress);

          const goingToNonStrikerEnd = currentRun % 2 === 0;

          if (goingToNonStrikerEnd) {
             batsmanRef.current.position.z = lerp(9, -9, t);
             nonStrikerRef.current.position.z = lerp(-9, 9, t);
          } else {
             batsmanRef.current.position.z = lerp(-9, 9, t);
             nonStrikerRef.current.position.z = lerp(9, -9, t);
          }

          const runnerBounce = Math.sin(runProgress * Math.PI * 2) * 0.08;
          batsmanRef.current.position.y = 1 + runnerBounce;
          nonStrikerRef.current.position.y = 1 - runnerBounce;
       } else {
          settleRunners(runs);
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
