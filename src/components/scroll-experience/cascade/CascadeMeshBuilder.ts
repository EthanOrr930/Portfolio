import * as THREE from "three";
import { cascadeVertexShader } from "../shaders/cascadeVertex.glsl";
import { cascadeFragmentShader } from "../shaders/cascadeFragment.glsl";
import { createParticleGeometry } from "../particleGeometry";

export interface CascadeAttributes {
  posA: THREE.InstancedBufferAttribute;
  posB: THREE.InstancedBufferAttribute;
  scaleA: THREE.InstancedBufferAttribute;
  scaleB: THREE.InstancedBufferAttribute;
  offset: THREE.InstancedBufferAttribute;
  spinBoost: THREE.InstancedBufferAttribute;
}

export interface CascadeCpuBuffers {
  velocities: Float32Array;
  angularVelocities: Float32Array;
  randomAxes: Float32Array;
  instanceRandoms: Float32Array;
}

export interface CascadeBundle {
  mesh: THREE.InstancedMesh;
  attrs: CascadeAttributes;
  cpu: CascadeCpuBuffers;
}

const LCG_MULTIPLIER = 16807;
const LCG_MODULUS = 2147483647;
const INITIAL_SEED = 12345;

/**
 * Builds the instanced mesh + all side-buffers the particle system needs.
 * Pure construction — holds no per-frame state. A new builder is instantiated
 * on every React mount via useCascadeInstance.
 */
export class CascadeMeshBuilder {
  constructor(
    private readonly count: number,
    private readonly uniforms: Record<string, THREE.IUniform>,
  ) {}

  build(): CascadeBundle {
    const cpu = this.createCpuBuffers();
    const geometry = createParticleGeometry("octahedron");
    const attrs = this.createInstancedAttributes(geometry, cpu.instanceRandoms);
    this.attachIndexAttribute(geometry);
    const mesh = this.createInstancedMesh(geometry);
    return { mesh, attrs, cpu };
  }

  private createCpuBuffers(): CascadeCpuBuffers {
    const n = this.count;
    const instanceRandoms = this.seedRandoms(n);
    return {
      velocities: new Float32Array(n * 3),
      angularVelocities: new Float32Array(n),
      randomAxes: this.computeRotationAxes(instanceRandoms),
      instanceRandoms,
    };
  }

  private createInstancedAttributes(
    geometry: THREE.BufferGeometry,
    instanceRandoms: Float32Array,
  ): CascadeAttributes {
    const n = this.count;
    const attrs: CascadeAttributes = {
      posA:      this.createVec3Attr(n),
      posB:      this.createVec3Attr(n),
      scaleA:    this.createScalarAttr(n, -1),
      scaleB:    this.createScalarAttr(n, -1),
      offset:    this.createDynamicVec3Attr(n),
      spinBoost: this.createDynamicScalarAttr(n),
    };
    geometry.setAttribute("positionA", attrs.posA);
    geometry.setAttribute("positionB", attrs.posB);
    geometry.setAttribute("scaleA", attrs.scaleA);
    geometry.setAttribute("scaleB", attrs.scaleB);
    geometry.setAttribute("instanceOffset", attrs.offset);
    geometry.setAttribute("instanceSpinBoost", attrs.spinBoost);
    geometry.setAttribute(
      "instanceRandom",
      new THREE.InstancedBufferAttribute(instanceRandoms, 4),
    );
    return attrs;
  }

  private attachIndexAttribute(geometry: THREE.BufferGeometry): void {
    const indices = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) indices[i] = i;
    geometry.setAttribute(
      "instanceIndex",
      new THREE.InstancedBufferAttribute(indices, 1),
    );
  }

  private createInstancedMesh(
    geometry: THREE.BufferGeometry,
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      geometry,
      this.createMaterial(),
      this.count,
    );
    this.fillIdentityMatrices(mesh);
    mesh.frustumCulled = false;
    return mesh;
  }

  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: cascadeVertexShader,
      fragmentShader: cascadeFragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      wireframe: true,
      blending: THREE.NormalBlending,
    });
  }

  private fillIdentityMatrices(mesh: THREE.InstancedMesh): void {
    const identity = new THREE.Matrix4();
    for (let i = 0; i < this.count; i++) mesh.setMatrixAt(i, identity);
    mesh.instanceMatrix.needsUpdate = true;
  }

  private createVec3Attr(n: number): THREE.InstancedBufferAttribute {
    return new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  }

  private createScalarAttr(n: number, fill: number): THREE.InstancedBufferAttribute {
    const data = new Float32Array(n).fill(fill);
    return new THREE.InstancedBufferAttribute(data, 1);
  }

  private createDynamicVec3Attr(n: number): THREE.InstancedBufferAttribute {
    const attr = this.createVec3Attr(n);
    attr.setUsage(THREE.DynamicDrawUsage);
    return attr;
  }

  private createDynamicScalarAttr(n: number): THREE.InstancedBufferAttribute {
    const attr = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    attr.setUsage(THREE.DynamicDrawUsage);
    return attr;
  }

  // Deterministic LCG so CPU + GPU see identical random values across reloads.
  private seedRandoms(n: number): Float32Array {
    const out = new Float32Array(n * 4);
    let seed = INITIAL_SEED;
    for (let i = 0; i < out.length; i++) {
      seed = (seed * LCG_MULTIPLIER) % LCG_MODULUS;
      out[i] = seed / LCG_MODULUS;
    }
    return out;
  }

  // why: must use the same normalization formula as the vertex shader, so the
  // CPU torque integrator rotates around the same axis the shader does.
  private computeRotationAxes(randoms: Float32Array): Float32Array {
    const out = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
      const i4 = i * 4;
      const ax = randoms[i4]     * 2 - 1;
      const ay = randoms[i4 + 1] * 2 - 1;
      const az = randoms[i4 + 2] * 2 - 1;
      const len = Math.hypot(ax, ay, az) || 1;
      out[i * 3]     = ax / len;
      out[i * 3 + 1] = ay / len;
      out[i * 3 + 2] = az / len;
    }
    return out;
  }
}
