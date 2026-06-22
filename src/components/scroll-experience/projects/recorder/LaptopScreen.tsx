"use client";

import { forwardRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { DashboardRoot } from "./dashboard/DashboardRoot";
import { SAMPLE_SESSION } from "./dashboard/lib/sessionData";
import { SCREEN_QUAD, DASHBOARD_PX, HTML_SCALE } from "./laptopConstants";

/** The laptop lid screen: a dark quad with the live dashboard mounted on it via
 *  a transformed drei <Html>. Pointer events stay off (`live=false`) until the
 *  laptop has settled, so the dashboard can't steal the pointer mid-flight.
 *  The outer group is forwarded so a dev gizmo can drive its transform. */
export const LaptopScreen = forwardRef<THREE.Group, { live: boolean }>(
  function LaptopScreen({ live }, ref) {
    const events = live ? "auto" : "none";
    return (
      <group
        ref={ref}
        position={SCREEN_QUAD.pos}
        rotation={SCREEN_QUAD.rot}
        scale={SCREEN_QUAD.scale}
      >
        <mesh>
          <planeGeometry args={[SCREEN_QUAD.width, SCREEN_QUAD.height]} />
          <meshBasicMaterial color="#0a0c10" toneMapped={false} />
        </mesh>
        <Html
          transform
          position={[0, 0, 0.01]}
          scale={HTML_SCALE}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: events }}
          prepend
        >
          <div style={{ width: DASHBOARD_PX.width, height: DASHBOARD_PX.height, pointerEvents: events }}>
            <DashboardRoot session={SAMPLE_SESSION} />
          </div>
        </Html>
      </group>
    );
  },
);
