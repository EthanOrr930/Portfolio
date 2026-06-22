"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { HoldDragArbiter } from "./HoldDragArbiter";
import { TrackballRotationController } from "./TrackballRotationController";
import type { RecorderApi } from "./recorderApi";

interface InteractionRefs {
  groupRef: React.RefObject<THREE.Group | null>;
  apiRef: React.RefObject<RecorderApi | null>;
  /** Gate: interaction only live once true (after spin-in settles). */
  enabledRef: React.RefObject<boolean>;
  onFirstDrag?: () => void;
  /** Dev-only: fully unbind so a TransformControls gizmo owns the pointer. */
  disabled?: boolean;
}

/**
 * Wires the hold/tap/drag arbiter to the canvas and applies trackball rotation
 * (with momentum) to the device group. Hold on screen → record; tap on screen →
 * cycle session; drag anywhere → rotate. Returns the rotation controller so the
 * caller can drive the spin-in settle.
 */
export function useRecorderInteraction({
  groupRef,
  apiRef,
  enabledRef,
  onFirstDrag,
  disabled = false,
}: InteractionRefs): TrackballRotationController {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const rot = useMemo(() => new TrackballRotationController(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  const hitTest = useCallback(
    (x: number, y: number): boolean => {
      const mesh = apiRef.current?.getScreenMesh();
      if (!mesh) return false;
      const r = gl.domElement.getBoundingClientRect();
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObject(mesh, false).length > 0;
    },
    [apiRef, gl, camera, raycaster, ndc],
  );

  const arbiter = useMemo(
    () =>
      new HoldDragArbiter(
        {
          onHoldStart: () => liveSm(apiRef, enabledRef)?.beginHold(),
          onHoldCancel: () => apiRef.current?.sm.cancelHold(),
          onTap: () => enabledRef.current && apiRef.current?.cycleSession(),
          onDragStart: () => {
            if (!enabledRef.current) return;
            rot.beginDrag();
            onFirstDrag?.();
          },
          onDragDelta: (dx, dy) => enabledRef.current && rot.addDelta(dx, dy),
          onDragEnd: () => rot.endDrag(),
        },
        hitTest,
      ),
    [apiRef, enabledRef, hitTest, onFirstDrag, rot],
  );

  useEffect(() => {
    if (disabled) return;
    return arbiter.bind(gl.domElement);
  }, [arbiter, gl, disabled]);

  useFrame((_, dt) => {
    if (disabled) return;
    arbiter.update(performance.now());
    if (groupRef.current) rot.update(dt, groupRef.current.quaternion);
  });

  return rot;
}

function liveSm(
  apiRef: React.RefObject<RecorderApi | null>,
  enabledRef: React.RefObject<boolean>,
) {
  if (!enabledRef.current || !apiRef.current?.isPowered()) return null;
  return apiRef.current.sm;
}
