"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { RecorderApi } from "./recorderApi";
import { calloutForState } from "./recorderTutorialSteps";
import { CalloutFade } from "./CalloutFade";

const LEAD_DIST = 110; // px the label sits out from the anchor, leading outward
const SCREEN_LEAD = 240; // screen leads further (sideways, clearing the display)
const EDGE_PAD = 18; // keep the label this far inside the viewport
const SCREEN_UP = 0.4; // screen leader's slight upward bias (rest is sideways)

export interface CalloutDom {
  circle: React.RefObject<SVGCircleElement | null>;
  dot: React.RefObject<SVGCircleElement | null>;
  line: React.RefObject<SVGLineElement | null>;
  label: React.RefObject<HTMLDivElement | null>;
}

interface CalloutDriverProps {
  apiRef: React.RefObject<RecorderApi | null>;
  deviceRef: React.RefObject<THREE.Object3D | null>;
  dom: CalloutDom;
  /** Gate: callouts stay hidden until true (set after the intro spin settles). */
  gateRef?: React.RefObject<boolean>;
}

interface Placement {
  lx: number;
  ly: number;
}

interface CalloutData {
  x: number;
  y: number;
  place: Placement;
  text: string;
  rect: DOMRect;
}

interface Scratch {
  v: THREE.Vector3;
  dc: THREE.Vector3;
  dir: THREE.Vector3;
  ray: THREE.Raycaster;
}

/**
 * Projects the active tutorial anchor (switch/screen) to screen space each frame
 * and writes the DOM callout (leader + label). Leaders fade in/out via CalloutFade
 * when the target changes; the label is left-justified unless it would hit the
 * right edge. Depth-occludes when the anchor is hidden behind the device.
 */
export function CalloutDriver({ apiRef, deviceRef, dom, gateRef }: CalloutDriverProps) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const fade = useMemo(() => new CalloutFade(), []);
  const scratch = useMemo<Scratch>(
    () => ({ v: new THREE.Vector3(), dc: new THREE.Vector3(), dir: new THREE.Vector3(), ray: new THREE.Raycaster() }),
    [],
  );

  useFrame(() => {
    const open = !gateRef || gateRef.current;
    const data = open ? projectCallout(apiRef.current, deviceRef.current, camera, gl, scratch) : null;
    const decision = fade.step(performance.now(), data ? data.text : null);
    if (!data || decision === "hide") return setVisible(dom, false);
    writeCallout(dom, data);
    setVisible(dom, true);
  });

  return null;
}

function projectCallout(
  api: RecorderApi | null,
  device: THREE.Object3D | null,
  camera: THREE.Camera,
  gl: THREE.WebGLRenderer,
  s: Scratch,
): CalloutData | null {
  if (!api) return null;
  const cfg = calloutForState(api.sm.state, api.isPowered(), api.sm.elapsedSec);
  if (!cfg) return null;
  const anchor = cfg.anchor === "switch" ? api.getSwitchAnchor() : api.getScreenMesh();
  if (!anchor) return null;
  anchor.getWorldPosition(s.v);
  if (isOccluded(s.v, camera, device, s.ray, s.dir)) return null;
  s.v.project(camera);
  if (s.v.z > 1) return null; // behind the camera
  const rect = gl.domElement.getBoundingClientRect();
  const x = rect.left + (s.v.x * 0.5 + 0.5) * rect.width;
  const y = rect.top + (-s.v.y * 0.5 + 0.5) * rect.height;
  const center = projectCenter(device, camera, s.dc, rect);
  const place = leadOutward(x, y, center.cx, center.cy, rect, cfg.anchor === "screen");
  return { x, y, place, text: cfg.text, rect };
}

function isOccluded(
  world: THREE.Vector3,
  camera: THREE.Camera,
  device: THREE.Object3D | null,
  ray: THREE.Raycaster,
  dir: THREE.Vector3,
): boolean {
  if (!device) return false;
  const camPos = camera.position;
  dir.copy(world).sub(camPos);
  const anchorDist = dir.length();
  ray.set(camPos, dir.normalize());
  const hits = ray.intersectObject(device, true);
  return hits.length > 0 && hits[0].distance < anchorDist - 0.4;
}

/** Device origin in page coords (the outward-lead reference point). */
function projectCenter(
  device: THREE.Object3D | null,
  camera: THREE.Camera,
  dc: THREE.Vector3,
  rect: DOMRect,
): { cx: number; cy: number } {
  if (!device) return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
  device.getWorldPosition(dc).project(camera);
  return {
    cx: rect.left + (dc.x * 0.5 + 0.5) * rect.width,
    cy: rect.top + (-dc.y * 0.5 + 0.5) * rect.height,
  };
}

/** Lead the label out from the anchor. The screen leads sideways into whichever
 *  margin has more room (so it sits beside, not over, the display); other anchors
 *  lead radially out from the device centre. */
function leadOutward(x: number, y: number, cx: number, cy: number, rect: DOMRect, screen: boolean): Placement {
  let dx: number;
  let dy: number;
  if (screen) {
    dx = rect.right - x >= x - rect.left ? 1 : -1; // toward the roomier side
    dy = -SCREEN_UP;
  } else {
    dx = x - cx;
    dy = y - cy;
  }
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  const dist = screen ? SCREEN_LEAD : LEAD_DIST;
  return {
    lx: clamp(x + dx * dist, rect.left + EDGE_PAD, rect.right - EDGE_PAD),
    ly: clamp(y + dy * dist, rect.top + EDGE_PAD, rect.bottom - EDGE_PAD),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

function writeCallout(dom: CalloutDom, d: CalloutData): void {
  const label = dom.label.current;
  if (label) {
    if (label.textContent !== d.text) label.textContent = d.text;
    // The leader meets the label edge nearest the anchor, so the text always
    // runs away from the device: lead-left → right-justify, lead-right → left.
    const w = label.offsetWidth;
    let rightAlign = d.place.lx < d.x;
    if (!rightAlign && d.place.lx + w + EDGE_PAD > d.rect.right) rightAlign = true; // overflow right
    if (rightAlign && d.place.lx - w - EDGE_PAD < d.rect.left) rightAlign = false; // overflow left
    label.style.left = `${d.place.lx}px`;
    label.style.top = `${d.place.ly}px`;
    label.style.transform = `translateY(-50%)${rightAlign ? " translateX(-100%)" : ""}`;
  }
  const line = dom.line.current;
  if (line) {
    line.setAttribute("x1", String(d.x));
    line.setAttribute("y1", String(d.y));
    line.setAttribute("x2", String(d.place.lx));
    line.setAttribute("y2", String(d.place.ly));
  }
}

function setVisible(dom: CalloutDom, shown: boolean): void {
  const o = shown ? "1" : "0";
  if (dom.line.current) dom.line.current.style.opacity = o;
  if (dom.label.current) dom.label.current.style.opacity = o;
  if (dom.circle.current) dom.circle.current.style.opacity = "0"; // ring/dot retired
  if (dom.dot.current) dom.dot.current.style.opacity = "0";
}
