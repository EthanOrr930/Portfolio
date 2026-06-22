/**
 * Deterministic procedural layout for the ruined city. Pure data — produces
 * building specs on a jittered grid with a cleared plaza in the foreground
 * (where the debris + character sit). No three.js here; BuildingField turns
 * these specs into instanced geometry.
 */

/** Seeded LCG so the city is identical across reloads. */
export class Rng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return this.state / 2147483647;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}

export interface BuildingSpec {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  /** Window rows. */
  floors: number;
  /** Window columns per face. */
  cols: number;
  /** 0..1 — how chewed-up the top is (drives the broken cap). */
  damage: number;
  /** Per-building random for shader variation. */
  seed: number;
}

export interface CityLayout {
  buildings: BuildingSpec[];
  /** The single foreground hero building (bottom-left), more detailed. */
  hero: BuildingSpec;
}

const GRID_COLS = 12;
const GRID_ROWS = 12;
const CELL = 6.5;
// Cleared area in front-center where rubble + the character go.
const PLAZA = { x: 2, z: 9 };
const PLAZA_RADIUS = 11;

/** Build the full layout for a given seed. */
export function generateCity(seed: number): CityLayout {
  const rng = new Rng(seed);
  const buildings: BuildingSpec[] = [];

  for (let i = 0; i < GRID_COLS; i++) {
    for (let j = 0; j < GRID_ROWS; j++) {
      const cx = (i - GRID_COLS / 2) * CELL;
      const cz = (j - GRID_ROWS / 2) * CELL;
      if (inPlaza(cx, cz) && rng.next() < 0.9) continue;
      buildings.push(makeBuilding(rng, cx, cz));
    }
  }

  const hero = makeHero(rng);
  return { buildings, hero };
}

function inPlaza(x: number, z: number): boolean {
  return Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA_RADIUS;
}

function makeBuilding(rng: Rng, cx: number, cz: number): BuildingSpec {
  const width = rng.range(3.2, 5.2);
  const depth = rng.range(3.2, 5.2);
  const floors = rng.int(3, 11);
  const height = floors * rng.range(0.85, 1.05);
  return {
    x: cx + rng.range(-1.1, 1.1),
    z: cz + rng.range(-1.1, 1.1),
    width,
    depth,
    height,
    floors,
    cols: Math.max(2, Math.round(width / 1.3)),
    damage: rng.next(),
    seed: rng.next(),
  };
}

/** Tall, detailed hero building parked in the bottom-left foreground. */
function makeHero(rng: Rng): BuildingSpec {
  const width = 6.5;
  const depth = 6;
  const floors = 11;
  return {
    x: -9,
    z: 13,
    width,
    depth,
    height: floors * 1.0,
    floors,
    cols: 4,
    damage: 0.8,
    seed: rng.next(),
  };
}
