import * as THREE from "three";
type ParticleShape = "cube" | "pyramid" | "octahedron" | "icosphere" | "cross" | "torus";

/** Create a unit-sized geometry for the given particle shape. */
export function createParticleGeometry(shape: ParticleShape): THREE.BufferGeometry {
  switch (shape) {
    case "cube":
      return new THREE.BoxGeometry(1, 1, 1);

    case "pyramid": {
      // Tetrahedron — 4 triangular faces
      return new THREE.TetrahedronGeometry(0.6);
    }

    case "octahedron": {
      // Diamond shape — 8 triangular faces
      return new THREE.OctahedronGeometry(0.6);
    }

    case "icosphere": {
      // Geodesic sphere — detail level 1 gives ~80 triangles (looks great wireframe)
      return new THREE.IcosahedronGeometry(0.5, 1);
    }

    case "cross": {
      // Three intersecting thin boxes — sparkly and airy
      const arm = 0.12;
      const len = 0.7;
      const merged = new THREE.BufferGeometry();
      const geos = [
        new THREE.BoxGeometry(len, arm, arm),
        new THREE.BoxGeometry(arm, len, arm),
        new THREE.BoxGeometry(arm, arm, len),
      ];
      // Merge the three arms
      const positions: number[] = [];
      const normals: number[] = [];
      const indices: number[] = [];
      let vertexOffset = 0;
      for (const geo of geos) {
        const pos = geo.getAttribute("position");
        const norm = geo.getAttribute("normal");
        const idx = geo.getIndex();
        for (let i = 0; i < pos.count; i++) {
          positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
          normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
        }
        if (idx) {
          for (let i = 0; i < idx.count; i++) {
            indices.push(idx.getX(i) + vertexOffset);
          }
        }
        vertexOffset += pos.count;
        geo.dispose();
      }
      merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      merged.setIndex(indices);
      return merged;
    }

    case "torus": {
      // Small donut — looks great wireframe
      return new THREE.TorusGeometry(0.4, 0.15, 6, 8);
    }

    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}
