import * as THREE from "three";

/**
 * Launch choreography for the folded plane, in two beats:
 *
 *  1. AIM (t 0 → AIM): the dart sits in place and rotates from rest (nose +Y) to
 *     face the launch direction — "turn toward where it's going".
 *  2. TRAVEL (t AIM → 1): it flies OUT and AWAY from the camera along a cubic
 *     Bézier, nose aligned to the velocity, shrinking into the distance.
 *
 * The aim ends pointing exactly along the travel's initial tangent, so the
 * hand-off is seamless.
 */
const P0 = new THREE.Vector3(0, 0, 0);
const P1 = new THREE.Vector3(0, 0.8, -3); // initial travel dir (the aim target)
const P2 = new THREE.Vector3(0.5, 2.2, -10); // accelerate away
const P3 = new THREE.Vector3(1.2, 3.6, -19); // off into the distance, away from camera

const NOSE = new THREE.Vector3(0, 1, 0); // the dart points +Y in mesh space
const AIM = 0.18; // fraction of flight spent turning to aim

export interface FlightState {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

export function makeFlightState(): FlightState {
  return { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
}

const _aimDir = new THREE.Vector3().copy(P1).normalize();
const _qAim = new THREE.Quaternion().setFromUnitVectors(NOSE, _aimDir);
const _id = new THREE.Quaternion();
const _tan = new THREE.Vector3();
const _bank = new THREE.Quaternion();

export function flightState(t: number, out: FlightState): void {
  const tt = clamp01(t);
  if (tt <= AIM) {
    out.position.copy(P0);
    out.quaternion.copy(_id).slerp(_qAim, easeOut(tt / AIM));
    return;
  }
  const u = easeOut((tt - AIM) / (1 - AIM)); // launch fast, glide into distance
  bezier(out.position, u);
  bezierTangent(_tan, u);
  if (_tan.lengthSq() < 1e-8) _tan.copy(_aimDir);
  else _tan.normalize();
  out.quaternion.setFromUnitVectors(NOSE, _tan);
  _bank.setFromAxisAngle(_tan, 0.4 * easeIn((tt - AIM) / (1 - AIM)));
  out.quaternion.premultiply(_bank);
}

function bezier(out: THREE.Vector3, u: number): void {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  out.set(
    a * P0.x + b * P1.x + c * P2.x + d * P3.x,
    a * P0.y + b * P1.y + c * P2.y + d * P3.y,
    a * P0.z + b * P1.z + c * P2.z + d * P3.z,
  );
}

function bezierTangent(out: THREE.Vector3, u: number): void {
  const v = 1 - u;
  const a = 3 * v * v;
  const b = 6 * v * u;
  const c = 3 * u * u;
  out.set(
    a * (P1.x - P0.x) + b * (P2.x - P1.x) + c * (P3.x - P2.x),
    a * (P1.y - P0.y) + b * (P2.y - P1.y) + c * (P3.y - P2.y),
    a * (P1.z - P0.z) + b * (P2.z - P1.z) + c * (P3.z - P2.z),
  );
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function easeIn(x: number): number {
  return x * x * x;
}
function easeOut(x: number): number {
  return 1 - Math.pow(1 - x, 2);
}
