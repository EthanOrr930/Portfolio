"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, TransformControls, Edges } from "@react-three/drei";
import * as THREE from "three";
import type { AnimationEditorState } from "../state/useAnimationEditor";
import { interpolateTransform } from "@/lib/animation/interpolation";

interface TransformPreviewModeProps {
  editor: AnimationEditorState;
  meshRef: React.MutableRefObject<THREE.Mesh | null>;
}

export function TransformPreviewMode({
  editor,
  meshRef,
}: TransformPreviewModeProps) {
  const orbitRef = useRef<any>(null);
  const selectedKf = editor.getSelectedTransformKeyframe();
  const [mode, setMode] = useState<"translate" | "rotate" | "scale">(
    "translate",
  );

  // Update cube transform when selected keyframe changes via inspector
  useEffect(() => {
    if (!meshRef.current || !selectedKf) return;
    meshRef.current.position.set(...selectedKf.position);
    meshRef.current.rotation.set(...selectedKf.rotation);
    meshRef.current.scale.setScalar(selectedKf.scale);
  }, [selectedKf, meshRef]);

  // When no keyframe is selected, interpolate based on currentVh
  useFrame(() => {
    if (!meshRef.current || selectedKf) return;
    const interp = interpolateTransform(
      editor.sceneData.transform.keyframes,
      editor.currentVh,
    );
    meshRef.current.position.set(...interp.position);
    meshRef.current.rotation.set(...interp.rotation);
    meshRef.current.scale.setScalar(interp.scale);
  });

  // Sync transform controls changes back to keyframe data
  const handleTransformChange = useCallback(() => {
    if (!meshRef.current || !selectedKf) return;
    const m = meshRef.current;
    if (editor.selection.type === "transform-keyframe") {
      editor.updateTransformKeyframe(editor.selection.id, {
        position: [m.position.x, m.position.y, m.position.z],
        rotation: [m.rotation.x, m.rotation.y, m.rotation.z],
        scale: m.scale.x,
      });
    }
  }, [meshRef, selectedKf, editor]);

  // Keyboard shortcuts for transform mode
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "g" || e.key === "w") setMode("translate");
      if (e.key === "r" || e.key === "e") setMode("rotate");
      if (e.key === "s") setMode("scale");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <OrbitControls
        ref={orbitRef}
        makeDefault
        enableDamping
        dampingFactor={0.1}
        zoomSpeed={0.5}
        minDistance={0.05}
        panSpeed={1}
      />
      <gridHelper args={[10, 10, "#333333", "#222222"]} />
      <axesHelper args={[0.5]} />

      {/* Cube with fill + bold edges — all on the same mesh so they move together */}
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.08} />
        <Edges linewidth={2} color="#2563eb" />
      </mesh>

      {/* Transform controls gizmo — only when a keyframe is selected */}
      {selectedKf && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode={mode}
          onObjectChange={handleTransformChange}
          onMouseDown={() => {
            if (orbitRef.current) orbitRef.current.enabled = false;
          }}
          onMouseUp={() => {
            if (orbitRef.current) orbitRef.current.enabled = true;
          }}
        />
      )}
    </>
  );
}
