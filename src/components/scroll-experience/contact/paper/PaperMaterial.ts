import * as THREE from "three";

/**
 * Cream paper material. Pure factory — double-sided (you see the underside as it
 * folds) and FLAT-shaded so each triangle reads as a crisp paper facet, which is
 * what makes Active Theory's low-poly dart look sharp.
 */
export function buildPaperMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#e9e0d0"),
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
    flatShading: true,
    // Push the surface back a touch so the crease/edge lines draw cleanly on top
    // without z-fighting.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}
