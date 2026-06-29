export const RIPPLE_TRAIL_SIZE = 32;

export const cascadeVertexShader = /* glsl */ `
  // ── Rotation matrix from axis + angle ─────────────────────────────
  mat3 rotationMatrix(vec3 axis, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat3(
      oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
      oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
      oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
    );
  }

  // ── GLSL simplex noise (3D) ───────────────────────────────────────
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 105.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // ── Attributes ────────────────────────────────────────────────────
  attribute vec3 positionA;       // keyframe A position (xyz)
  attribute vec3 positionB;       // keyframe B position (xyz)
  attribute float scaleA;         // keyframe A baked scale
  attribute float scaleB;         // keyframe B baked scale
  attribute vec3 instanceOffset;  // CPU-driven physics displacement (model space)
  attribute vec4 instanceRandom;
  attribute float instanceIndex;
  attribute float instanceSpinBoost; // CPU-driven extra rotation angle (radians)

  // ── Uniforms ──────────────────────────────────────────────────────
  uniform float u_time;

  // Load intro — 1 = figure assembled, 0 = particles scattered outward + spun.
  // Driven once on first load, then exactly 1 forever after (no effect).
  uniform float u_introProgress;

  // Cascade
  uniform float u_transitionProgress;
  uniform float u_cascadeSpread;
  uniform vec3 u_cascadeDir;
  uniform int u_cascadeMode; // 0=source pos, 1=dest pos, 2=random
  uniform int u_positionEasing;   // 0=smoothstep, 1=ease-in-cubic, 2=ease-out-cubic, 3=ease-in-out-cubic, 4=ease-out-elastic, 5=linear

  // Per-keyframe depth fade (interpolated between A and B)
  uniform float u_depthFarA;
  uniform float u_depthNearA;
  uniform float u_depthFarB;
  uniform float u_depthNearB;

  // Fall-off — drives particles down and out of frame. 0 = settled,
  // 1 = fully fallen. Uses its own cascade direction so the wave can
  // propagate in a different axis than the main cascade (e.g. bottom-up).
  uniform float u_falloffProgress;
  uniform float u_falloffDistance;
  uniform vec3 u_fallCascadeDir;
  uniform int u_fallCascadeMode;

  // Debug
  uniform bool u_debugNoDepthScale;

  // ── Varyings ──────────────────────────────────────────────────────
  varying vec3 vColor;
  varying float vAlpha;

  // ── Easing functions ───────────────────────────────────────────────
  float easeInCubic(float t) { return t * t * t; }
  float easeOutCubic(float t) { float u = 1.0 - t; return 1.0 - u * u * u; }
  float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }
  float easeOutElastic(float t) {
    if (t <= 0.0) return 0.0;
    if (t >= 1.0) return 1.0;
    return pow(2.0, -10.0 * t) * sin((t * 10.0 - 0.75) * 2.0943951) + 1.0;
  }

  // Damped spring — overshoots target then oscillates back and forth, settling.
  // Driven purely by scroll position (t), not time.
  float dampedSpring(float t) {
    if (t <= 0.0) return 0.0;
    if (t >= 1.0) return 1.0;
    float damping = 24.0;    // how fast oscillations decay (higher = smaller bounces)
    float bounces = 10.5;    // ~number of half-oscillations visible
    float pi = 3.14159265;
    return 1.0 - exp(-damping * t) * cos(bounces * pi * t);
  }
  float applyEasing(float t, int mode) {
    if (mode == 1) return easeInCubic(t);
    if (mode == 2) return easeOutCubic(t);
    if (mode == 3) return easeInOutCubic(t);
    if (mode == 4) return easeOutElastic(t);
    if (mode == 5) return t; // linear
    return smoothstep(0.0, 1.0, t); // 0 = smoothstep (default)
  }

  // ── Constants ─────────────────────────────────────────────────────
  uniform float u_particleScale;
  const float NOISE_FREQ = 1.0;
  const float COLOR_MIN = 0.25;
  const float COLOR_MAX = 0.55;
  // Load-intro scatter: how far out (model units) particles begin, and how
  // many radians they spiral around Y on the way in.
  const float INTRO_DISTANCE = 1.0;
  const float INTRO_SWIRL = 1.4;

  void main() {
    // ── Cascade: compute per-particle timing ──────────────────
    float cascadeCoord;
    if (u_cascadeMode == 2) {
      // Random: use per-instance random value
      cascadeCoord = instanceRandom.x;
    } else {
      // Spatial: project position onto cascade direction
      vec3 cascadePos = u_cascadeMode == 1 ? positionB : positionA;
      float rawProj = dot(normalize(u_cascadeDir), cascadePos);
      // Map from typical model range [-1, 1] to [0, 1]
      cascadeCoord = clamp(rawProj * 0.5 + 0.5, 0.0, 1.0);
    }

    // Each particle starts at a staggered time based on cascade spread.
    // windowSize is how long each particle takes to transition.
    // particleStart is scaled so the LAST particle finishes exactly at progress=1.0.
    float windowSize = max(1.0 - u_cascadeSpread, 0.6);
    float maxStart = 1.0 - windowSize; // latest a particle can start and still finish by 1.0
    float particleStart = cascadeCoord * maxStart;
    float particleProgress = clamp(
      (u_transitionProgress - particleStart) / windowSize,
      0.0, 1.0
    );
    particleProgress = applyEasing(particleProgress, u_positionEasing);

    // ── Blend between keyframe A and B, then apply CPU physics offset ─
    // particleProgress is already shaped by applyEasing above, so using
    // it directly means the morph occupies the full cascade window
    // instead of saturating in the first ~20%. instanceOffset is the
    // per-particle displacement driven by the gelatinous integrator.
    vec3 morphPos = mix(positionA, positionB, particleProgress);
    vec3 pos = morphPos + instanceOffset;

    // ── Load intro: fly in from an outward, swirling scatter ──────────
    // introAmt 1 → 0 over the one-shot load. Each particle starts pushed
    // radially out from the figure's centre and spiralled around Y, then
    // homes onto its rest position. Exactly 0 at u_introProgress == 1, so
    // everything downstream (drift, fall, scroll) is untouched afterwards.
    // introAmt 1 → 0, but dips slightly negative on the overshoot (particles
    // sail past their rest spot before settling), so test the magnitude.
    float introAmt = 1.0 - u_introProgress;
    if (abs(introAmt) > 0.0001) {
      vec3 introJitter = instanceRandom.xyz * 2.0 - 1.0;
      vec3 introDir = normalize(morphPos + introJitter * 0.35 + vec3(0.0, 0.0001, 0.0));
      float introReach = INTRO_DISTANCE * (0.55 + instanceRandom.w * 0.9);
      vec3 introVec = introDir * introReach;
      float introTwist = introAmt * INTRO_SWIRL * (0.6 + instanceRandom.w * 0.8);
      introVec = rotationMatrix(vec3(0.0, 1.0, 0.0), introTwist) * introVec;
      pos += introVec * introAmt;
    }

    // ── Ambient float: position-seeded phase → clustered drift ──
    // Phase is keyed off the *current* morph position (not the raw keyframe
    // attribute), so it stays continuous across keyframe boundaries — no
    // snap when positionA/B are rewritten — and the drift pattern flows
    // across the figure as it morphs/scrolls. Neighbouring particles share
    // a phase and drift in soft clusters; a small per-instance offset
    // desyncs them just enough to feel alive, not rigid.
    float driftPhaseA = dot(morphPos, vec3(1.6, 0.9, 1.3));
    float driftPhaseB = dot(morphPos, vec3(-1.1, 1.4, 0.7));
    float driftDesync = instanceRandom.x * 1.2;
    vec3 ambientDrift = vec3(
      sin(u_time * 0.34 + driftPhaseA + driftDesync),
      sin(u_time * 0.29 + driftPhaseB + driftDesync * 0.8),
      sin(u_time * 0.39 + driftPhaseA * 0.6 + driftDesync)
    ) * 0.028;
    pos += ambientDrift;

    // ── Fall transition — same cascade system as the first transition ─
    //
    // Uses the SAME projection + window math as the main cascade (just
    // with u_fallCascadeDir instead of u_cascadeDir) so the gradient
    // wave has identical visual quality. Each particle gets a random 3D
    // impulse (XZ scatter + upward bump) modulated by a damped spring
    // step response. Gravity provides sustained downward pull on top.
    // Everything is exactly 0 at fallT=0 — no instant particle bumps.

    // Fall cascade coord — same projection as lines 141-152 above
    float fallCascadeCoord;
    if (u_fallCascadeMode == 2) {
      fallCascadeCoord = instanceRandom.x;
    } else {
      vec3 fallCascadePos = u_fallCascadeMode == 1 ? positionB : positionA;
      float fallRawProj = dot(normalize(u_fallCascadeDir), fallCascadePos);
      fallCascadeCoord = clamp(fallRawProj * 0.5 + 0.5, 0.0, 1.0);
    }

    // Same window math as the main cascade
    float fallWindowSize = max(1.0 - u_cascadeSpread, 0.6);
    float fallMaxStart = 1.0 - fallWindowSize;
    float fallParticleStart = fallCascadeCoord * fallMaxStart;
    float fallT = clamp(
      (u_falloffProgress - fallParticleStart) / fallWindowSize,
      0.0, 1.0
    );

    // Per-particle random impulse direction (XZ scatter + upward bump)
    vec2 scatterDir = normalize(vec2(
      instanceRandom.x * 2.0 - 1.0,
      instanceRandom.z * 2.0 - 1.0
    ));
    float scatterMag = 0.5 + instanceRandom.w * 0.5;
    vec3 impulseDir = normalize(vec3(
      scatterDir.x * scatterMag,
      0.35,
      scatterDir.y * scatterMag
    ));

    // Damped spring step response applied to the impulse MAGNITUDE.
    // s(t) = 1 - exp(-zeta*t)*cos(omega*t). Exactly 0 at t=0, one
    // visible overshoot (~3%), then settles to 1.
    float springT = fallT * 3.5;
    float springEnvelope = 1.0 - exp(-1.8 * springT) * cos(4.5 * springT);

    // Gravity: quadratic ramp on Y only — gentle lift first, then pull
    float gravityPull = fallT * fallT * 1.8;

    // Compose: spring drives the impulse scatter, gravity overlays on Y.
    // XZ scatter kept tight (0.15), Y impulse subtle (0.1), gravity dominates.
    pos.x += impulseDir.x * springEnvelope * u_falloffDistance * 0.15;
    pos.y += impulseDir.y * springEnvelope * u_falloffDistance * 0.1
           - gravityPull * u_falloffDistance;
    pos.z += impulseDir.z * springEnvelope * u_falloffDistance * 0.15;
    // Skip unused particle slots (scale < 0 means no data)
    if (scaleA < 0.0 || scaleB < 0.0) {
      gl_Position = vec4(0.0, 0.0, -999.0, 1.0);
      vAlpha = 0.0;
      vColor = vec3(0.0);
      return;
    }
    float baseScale = mix(scaleA, scaleB, particleProgress);
    if (baseScale <= 0.0) baseScale = 0.8;

    // ── Per-instance rotation ───────────────────────────────────
    // Base rotation: random axis + linear time-driven spin.
    // instanceSpinBoost adds the CPU-integrated torque angle so cursor
    // pushes spin particles up further before angular drag bleeds it off.
    vec3 rotAxis = normalize(instanceRandom.xyz * 2.0 - 1.0);
    float rotSpeed = 0.3 + instanceRandom.w * 0.3;
    mat3 cubeRot = rotationMatrix(rotAxis, u_time * rotSpeed + instanceSpinBoost * 1.5);

    // ── Depth-based scale (from un-warped world position) ───────
    // Softer falloff than the original cube — square gives a gentler
    // shrink, and a small floor keeps the back-of-cluster particles
    // visible instead of collapsing to dots.
    vec4 mvCenter = modelViewMatrix * vec4(pos, 1.0);
    float depth = -mvCenter.z;
    float depthFar = mix(u_depthFarA, u_depthFarB, particleProgress);
    float depthNear = mix(u_depthNearA, u_depthNearB, particleProgress);
    float depthRaw = smoothstep(depthFar, depthNear, depth);
    float depthScale = u_debugNoDepthScale
      ? 1.0
      : max(depthRaw * depthRaw, 0.18);

    float totalScale = baseScale * depthScale;

    // ── Noise colors ────────────────────────────────────────────
    float n1 = snoise(pos * NOISE_FREQ + vec3(0.0, 0.0, 0.0));
    float n2 = snoise(pos * NOISE_FREQ + vec3(100.0, 100.0, 100.0));
    float n3 = snoise(pos * NOISE_FREQ + vec3(200.0, 200.0, 200.0));
    vColor = vec3(
      COLOR_MIN + (n1 + 1.0) * 0.5 * (COLOR_MAX - COLOR_MIN),
      COLOR_MIN + (n2 + 1.0) * 0.5 * (COLOR_MAX - COLOR_MIN),
      COLOR_MIN + (n3 + 1.0) * 0.5 * (COLOR_MAX - COLOR_MIN)
    );

    // Alpha uses the un-floored fade so distant particles still gracefully
    // dissolve at the far edge, but with a square (not cubic) curve so the
    // dropoff matches the gentler size shrink.
    vAlpha = u_debugNoDepthScale ? 1.0 : depthRaw;

    // ── Final vertex ────────────────────────────────────────────
    vec3 localPos = cubeRot * (position * u_particleScale * totalScale);
    vec4 mvPosition = modelViewMatrix * vec4(localPos + pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;
