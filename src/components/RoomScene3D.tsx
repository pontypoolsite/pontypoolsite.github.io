import { Component, type ErrorInfo, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type RoomSceneProps = {
  temperature: number;
  brightness: number;
  fixture: string;
};

type SceneErrorState = { failed: boolean };

class SceneErrorBoundary extends Component<
  { children: ReactNode },
  SceneErrorState
> {
  state: SceneErrorState = { failed: false };

  static getDerivedStateFromError(): SceneErrorState {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {}

  render() {
    if (this.state.failed) {
      return (
        <div className="room-scene-loading" role="status">
          The 3D room preview is unavailable in this browser.
        </div>
      );
    }

    return this.props.children;
  }
}

function Pendant({ color, intensity }: { color: THREE.ColorRepresentation; intensity: number }) {
  return (
    <group position={[0, 1.7, -0.15]}>
      <mesh>
        <cylinderGeometry args={[0.012, 0.012, 0.62, 12]} />
        <meshStandardMaterial color="#564633" metalness={0.45} roughness={0.55} />
      </mesh>
      <mesh position={[0, -0.37, 0]}>
        <cylinderGeometry args={[0.12, 0.38, 0.22, 32, 1, true]} />
        <meshStandardMaterial color="#b18b54" metalness={0.72} roughness={0.27} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.49, 0]}>
        <sphereGeometry args={[0.065, 20, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} />
      </mesh>
      <pointLight position={[0, -0.5, 0]} color={color} intensity={intensity} distance={6} decay={2} />
    </group>
  );
}

function Chandelier({ color, intensity }: { color: THREE.ColorRepresentation; intensity: number }) {
  return (
    <group position={[0, 1.7, -0.15]}>
      <mesh>
        <cylinderGeometry args={[0.012, 0.012, 0.56, 12]} />
        <meshStandardMaterial color="#564633" metalness={0.45} roughness={0.55} />
      </mesh>
      <mesh position={[0, -0.3, 0]}>
        <torusGeometry args={[0.34, 0.035, 12, 32]} />
        <meshStandardMaterial color="#b18b54" metalness={0.78} roughness={0.24} />
      </mesh>
      {[0, 1, 2, 3].map((index) => {
        const angle = (index / 4) * Math.PI * 2;
        const x = Math.cos(angle) * 0.32;
        const z = Math.sin(angle) * 0.32;
        return (
          <group key={index} position={[x, -0.38, z]}>
            <mesh>
              <sphereGeometry args={[0.055, 16, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
            </mesh>
            <pointLight color={color} intensity={intensity / 3} distance={4} decay={2} />
          </group>
        );
      })}
    </group>
  );
}

function WallLight({ color, intensity }: { color: THREE.ColorRepresentation; intensity: number }) {
  return (
    <group position={[1.72, 0.28, -1.05]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh>
        <boxGeometry args={[0.24, 0.34, 0.08]} />
        <meshStandardMaterial color="#b18b54" metalness={0.62} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.19, 0.06]}>
        <sphereGeometry args={[0.11, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} />
      </mesh>
      <pointLight position={[0, 0.2, 0.22]} color={color} intensity={intensity} distance={4} decay={2} />
    </group>
  );
}

function Room({ temperature, brightness, fixture }: RoomSceneProps) {
  const warm = temperature <= 3500;
  const lightColor = warm ? "#ffc477" : "#fff3d4";
  const intensity = 0.5 + brightness / 25;

  return (
    <>
      <color attach="background" args={["#ded7ca"]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[-3, 5, 4]} intensity={1.4} color="#fff4e3" />

      <mesh position={[0, 0.8, -1.55]}>
        <boxGeometry args={[4.5, 3.8, 0.12]} />
        <meshStandardMaterial color="#eae4d8" roughness={0.95} />
      </mesh>
      <mesh position={[0, -1.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial color="#897965" roughness={0.88} />
      </mesh>
      <mesh position={[0, -1.135, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 2.2]} />
        <meshStandardMaterial color="#bba98d" roughness={0.95} />
      </mesh>

      <group position={[-0.45, -0.65, -0.28]}>
        <mesh position={[0, -0.16, 0]}>
          <boxGeometry args={[1.45, 0.34, 0.68]} />
          <meshStandardMaterial color="#7b6552" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.18, -0.22]}>
          <boxGeometry args={[1.45, 0.72, 0.24]} />
          <meshStandardMaterial color="#8f7963" roughness={0.9} />
        </mesh>
        {[-0.64, 0.64].map((x) => (
          <mesh key={x} position={[x, -0.05, 0]}>
            <boxGeometry args={[0.18, 0.58, 0.72]} />
            <meshStandardMaterial color="#725d4b" roughness={0.9} />
          </mesh>
        ))}
        {[-0.35, 0.1, 0.45].map((x) => (
          <mesh key={x} position={[x, 0.24, -0.075]} rotation={[0.08, 0, -0.05]}>
            <boxGeometry args={[0.32, 0.34, 0.07]} />
            <meshStandardMaterial color="#c5b39a" roughness={0.92} />
          </mesh>
        ))}
      </group>

      <group position={[0.55, -0.76, 0.48]}>
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.47, 0.53, 0.12, 48]} />
          <meshStandardMaterial color="#6e5237" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.055, 0.07, 0.32, 12]} />
          <meshStandardMaterial color="#6e5237" roughness={0.55} />
        </mesh>
      </group>

      <group position={[-1.42, 0.62, -1.45]}>
        <mesh>
          <boxGeometry args={[0.82, 0.9, 0.08]} />
          <meshStandardMaterial color="#c4b397" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[0.68, 0.76, 0.025]} />
          <meshStandardMaterial color="#d5c8ae" roughness={0.92} />
        </mesh>
      </group>

      {fixture === "Chandelier"
        ? <Chandelier color={lightColor} intensity={intensity} />
        : fixture === "Wall light"
          ? <WallLight color={lightColor} intensity={intensity} />
          : <Pendant color={lightColor} intensity={intensity} />}

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 3.3}
        maxPolarAngle={Math.PI / 2.05}
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
        target={[0, 0.05, -0.1]}
      />
    </>
  );
}

export default function RoomScene3D(props: RoomSceneProps) {
  return (
    <SceneErrorBoundary>
      <Canvas
        camera={{ position: [0, 1.15, 5.6], fov: 36 }}
        dpr={[1, 1.35]}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
      >
        <Room {...props} />
      </Canvas>
    </SceneErrorBoundary>
  );
}
