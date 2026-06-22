/** A single unit cube in the voxel grid. Integer coords; hex color string. */
export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: string;
}

/** A voxel model document — the on-disk JSON shape the editor reads/writes
 *  and the renderer loads. */
export interface VoxelDoc {
  voxels: Voxel[];
}

/** Stable key for a grid cell, for occupancy lookups. */
export function voxelKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}
