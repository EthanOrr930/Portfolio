import { useMemo, useRef } from "react";
import {
  GelatinousField,
  MouseVelocityTracker,
} from "../gelatinousPhysics";
import { prefersReducedMotion } from "../motionTokens";
import { CascadeBaseResolver } from "./CascadeBaseResolver";
import { CascadeMeshBuilder, type CascadeBundle } from "./CascadeMeshBuilder";
import { CascadePhysicsDriver } from "./CascadePhysicsDriver";
import { IntroController } from "./IntroController";
import {
  CascadeUniformsSync,
  createCascadeUniforms,
  type CascadeUniformMap,
} from "./CascadeUniforms";
import { KeyframeBufferWriter } from "./KeyframeBufferWriter";
import { PARTICLE_COUNT } from "./types";

export interface CascadeInstance {
  bundle: CascadeBundle;
  uniforms: CascadeUniformMap;
  uniformsSync: CascadeUniformsSync;
  bufferWriter: KeyframeBufferWriter;
  resolver: CascadeBaseResolver;
  physics: CascadePhysicsDriver;
  tracker: MouseVelocityTracker;
  field: GelatinousField;
  intro: IntroController;
}

/**
 * Builds every object the CascadeParticles component needs exactly once.
 * All construction is memoized against the (stable) particle count; the
 * result lives for the component's whole lifetime.
 */
export function useCascadeInstance(): CascadeInstance {
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  const uniforms = useMemo(createCascadeUniforms, []);

  const bundle = useMemo(
    () => new CascadeMeshBuilder(PARTICLE_COUNT, uniforms).build(),
    [uniforms],
  );

  const trackerRef = useRef<MouseVelocityTracker | null>(null);
  const fieldRef = useRef<GelatinousField | null>(null);
  const resolverRef = useRef<CascadeBaseResolver | null>(null);
  const introRef = useRef<IntroController | null>(null);
  if (!trackerRef.current) trackerRef.current = new MouseVelocityTracker();
  if (!fieldRef.current) fieldRef.current = new GelatinousField();
  if (!resolverRef.current) resolverRef.current = new CascadeBaseResolver();
  if (!introRef.current) introRef.current = new IntroController(reducedMotion);

  const uniformsSync = useMemo(() => new CascadeUniformsSync(uniforms), [uniforms]);
  const bufferWriter = useMemo(() => new KeyframeBufferWriter(PARTICLE_COUNT), []);
  const physics = useMemo(
    () => new CascadePhysicsDriver(PARTICLE_COUNT, reducedMotion),
    [reducedMotion],
  );

  return {
    bundle,
    uniforms,
    uniformsSync,
    bufferWriter,
    resolver: resolverRef.current,
    physics,
    tracker: trackerRef.current,
    field: fieldRef.current,
    intro: introRef.current,
  };
}
