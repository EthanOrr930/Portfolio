"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface FreeFlyControlsProps {
  /** Units/second at base speed (Shift = 3×). */
  speed?: number;
  /** Radians of look per pixel dragged. */
  lookSpeed?: number;
  /** Called each frame with the live camera so a HUD can read it. */
  onChange?: (camera: THREE.Camera) => void;
}

/**
 * Minimal free-fly camera for framing: WASD to move on the view plane, Q/E
 * down/up, Shift to sprint, click-drag to look. No external deps — just key
 * state + pointer drag integrated in useFrame.
 */
export function FreeFlyControls({
  speed = 60,
  lookSpeed = 0.0026,
  onChange,
}: FreeFlyControlsProps) {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const drag = useRef({ active: false, x: 0, y: 0 });
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  useEffect(() => {
    euler.current.setFromQuaternion(camera.quaternion);
    const el = gl.domElement;

    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      keys.current[e.code] = down;
    };
    const kd = onKey(true);
    const ku = onKey(false);

    const md = (e: MouseEvent) => {
      drag.current = { active: true, x: e.clientX, y: e.clientY };
    };
    const mu = () => {
      drag.current.active = false;
    };
    const mm = (e: MouseEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
      euler.current.y -= dx * lookSpeed;
      euler.current.x -= dy * lookSpeed;
      euler.current.x = Math.max(-1.5, Math.min(1.5, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };

    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    el.addEventListener("mousedown", md);
    window.addEventListener("mouseup", mu);
    window.addEventListener("mousemove", mm);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      el.removeEventListener("mousedown", md);
      window.removeEventListener("mouseup", mu);
      window.removeEventListener("mousemove", mm);
    };
  }, [camera, gl, lookSpeed]);

  useFrame((_, dt) => {
    const k = keys.current;
    const step = speed * (k["ShiftLeft"] || k["ShiftRight"] ? 3 : 1) * dt;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    const right = new THREE.Vector3()
      .crossVectors(fwd, camera.up)
      .normalize();
    if (k["KeyW"]) camera.position.addScaledVector(fwd, step);
    if (k["KeyS"]) camera.position.addScaledVector(fwd, -step);
    if (k["KeyD"]) camera.position.addScaledVector(right, step);
    if (k["KeyA"]) camera.position.addScaledVector(right, -step);
    if (k["KeyE"]) camera.position.y += step;
    if (k["KeyQ"]) camera.position.y -= step;
    onChange?.(camera);
  });

  return null;
}
