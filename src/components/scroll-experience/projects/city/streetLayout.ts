import * as THREE from "three";
import { Rng } from "./CityGenerator";

/**
 * A building/debris instance pulled from the city glTF as a *cloned node*
 * (so its internal orientation/scale survive), pre-offset so its footprint is
 * centred on the local origin with its base at y=0. `size` is the world
 * bounding-box extent, used for street spacing.
 */
export interface CityItem {
  name: string;
  object: THREE.Object3D;
  size: THREE.Vector3;
}

export interface Placement {
  item: CityItem;
  position: [number, number, number];
  rotation: [number, number, number];
}

const scratchBox = new THREE.Box3();

/**
 * Clone every node whose name matches `re` (topmost match per chain),
 * override its material, and re-centre it so the footprint sits on the
 * origin with the base on the ground.
 */
export function collectItems(
  scene: THREE.Object3D,
  re: RegExp,
  material: THREE.Material,
): CityItem[] {
  const named: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (re.test(o.name) && !(o.parent && re.test(o.parent.name))) named.push(o);
  });

  return named.map((node) => {
    const object = node.clone(true);
    object.position.set(0, 0, 0);
    object.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (mesh.isMesh) mesh.material = material;
    });
    object.updateMatrixWorld(true);
    scratchBox.setFromObject(object);
    const size = scratchBox.getSize(new THREE.Vector3());
    const center = scratchBox.getCenter(new THREE.Vector3());
    // Footprint → origin, base → y=0.
    object.position.set(-center.x, -scratchBox.min.y, -center.z);
    return { name: node.name, object, size };
  });
}

const STREET_HALF_WIDTH = 14;
const BUILDING_GAP = 7;
// Outward topple — leaning rows fell away from the street centre. Subtle, and
// only applied to some buildings.
const LEAN = 0.1;
// Buildings to drop from the back so the street doesn't run too far.
const DROP_BACK = 2;
// Extra row further out on the right.
const RIGHT_ROW_OFFSET = 24;

/** Line buildings down both sides of a street into -Z. Building_14 anchored
 *  at the near front-left corner (upright); the rest sorted shortest-first so
 *  low buildings sit near the camera and tall ones recede. Both rows topple
 *  outward, plus a sparser extra row out to the right. */
export function layoutStreet(buildings: readonly CityItem[]): Placement[] {
  const hero = buildings.find((b) => /Building_14/.test(b.name));
  const rest = buildings
    .filter((b) => b !== hero)
    .sort((a, b) => a.size.y - b.size.y);
  const street = rest.slice(0, Math.max(2, rest.length - DROP_BACK));

  const placements: Placement[] = [];
  const cursor = [0, 0];
  const rng = new Rng(777);

  // ~1/8 of buildings topple outward; all get a little random yaw (up axis).
  const tilt = (sign: number, upright: boolean): [number, number, number] => {
    const lean = !upright && rng.next() < 0.125 ? LEAN : 0;
    const yaw = rng.range(-0.3, 0.3);
    return [0, yaw, sign * -lean];
  };

  const placeFront = (item: CityItem, side: number, upright = false) => {
    const sign = side === 0 ? -1 : 1;
    const depth = item.size.z;
    const zCenter = cursor[side] + depth / 2;
    placements.push({
      item,
      position: [sign * (STREET_HALF_WIDTH + item.size.x / 2), 0, -zCenter],
      rotation: tilt(sign, upright),
    });
    cursor[side] += depth + BUILDING_GAP;
  };

  if (hero) placeFront(hero, 0, true); // upright anchor
  street.forEach((item, i) => placeFront(item, i % 2 === 0 ? 1 : 0));

  // Extra row further out on the right — a shuffled, distinct selection so it
  // isn't the same models as the front row.
  const pool = shuffle(buildings.filter((b) => b !== hero), 4242);
  let rz = 4;
  for (let i = 0; i < Math.min(5, pool.length); i++) {
    const item = pool[i];
    placements.push({
      item,
      position: [STREET_HALF_WIDTH + RIGHT_ROW_OFFSET + item.size.x / 2, 0, -rz],
      rotation: tilt(1, false),
    });
    rz += item.size.z + BUILDING_GAP;
  }

  return placements;
}

function shuffle(items: readonly CityItem[], seed: number): CityItem[] {
  const out = [...items];
  const rng = new Rng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Scatter debris down the centre of the street, reused to fill the length. */
export function layoutDebris(
  debris: readonly CityItem[],
  length: number,
  seed = 91,
): Placement[] {
  if (debris.length === 0) return [];
  const rng = new Rng(seed);
  const placements: Placement[] = [];
  const taken: [number, number][] = [];
  const MIN_SEP = 3.2; // reject overlapping placements (weird shading)
  const target = Math.max(40, Math.round(length / 3.2));
  let tries = 0;
  while (placements.length < target && tries < target * 8) {
    tries++;
    const x = rng.range(-STREET_HALF_WIDTH * 0.95, STREET_HALF_WIDTH * 0.95);
    const z = -rng.range(2, length);
    if (taken.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < MIN_SEP)) continue;
    taken.push([x, z]);
    const item = debris[placements.length % debris.length];
    placements.push({
      item,
      // Sink each chunk ~30% into the rubble so none float and they read as
      // grounded, regardless of irregular geometry bases.
      position: [x, -item.size.y * 0.3, z],
      rotation: [0, rng.range(0, Math.PI * 2), 0],
    });
  }
  return placements;
}

export function streetLength(placements: readonly Placement[]): number {
  let max = 0;
  for (const p of placements) max = Math.max(max, -p.position[2]);
  return max + 10;
}
