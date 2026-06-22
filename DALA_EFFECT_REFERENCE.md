# Dala Website Effect - Technical Reference

Source: Downloaded from dala.craftedbygc.com

## Rendering Stack

- **Three.js** with WebGL
- **GPGPU** (General-Purpose GPU) via FBO ping-pong for physics simulation
- **GSAP** for JS-side animation tweening
- Post-processing via Three.js `EffectComposer`

## Core Effect: Instanced 3D Mesh Particles Forming a Shape

10,000 tiny **pyramid** mesh instances (7,000 on mobile) arranged into a larger form using GPGPU simulation with spring physics.

Each particle is an `InstancedMesh` where the base geometry is a small pyramid model loaded from a `.glb` file.

## Pre-Baked Data Textures

Images are NOT displayed as flat textures. Instead, they encode per-particle properties:

- **Position texture** (`.exr`): 3D positions encoded as pixel colors. Texture divided into 4 UV quadrants (0-0.5 and 0.5-1.0) holding 4 different position states that particles transition between via `u_progress`.
- **Scale texture** (`.png`): Per-particle scale values, also 4 quadrants for transitions.
- **Color texture** (`.png`): Per-particle colors in 4 quadrants. Fragment shader samples all 4 and mixes based on `u_progress`.
- **Noise/grain textures**: For film grain overlay and simplex noise distortion.

Each particle has an `a_id` attribute mapping it to a specific pixel in these textures.

## GPGPU Spring Physics (runs every frame)

Two FBO ping-pong passes per frame:

### Velocity Shader (Fragment)
- Computes target position from position texture (with 4-quadrant blending)
- Calculates displacement: `dx = pos.x - target.x`
- Applies spring: `ax = dx * spring` (spring constant = **0.006**)
- Updates velocity: `vx = velocity.x + ax`
- Applies friction: `vx *= friction` (friction = **0.892**)
- Outputs velocity as color

### Position Shader (Fragment)
- Reads original position from `t_oPos`
- Adds velocity from `t_velocity`
- On first frame: reads base positions from `t_position`, scales by radius factor
- Uses quintic ease in/out for show/hide animation
- Outputs `gl_FragColor = vec4(pos, 1.0)`

## Particle Render Vertex Shader (Key Shader)

Injected via Three.js `onBeforeCompile`, replacing `#include <project_vertex>`:

1. **Reads simulated position** from `t_simulation` FBO texture using `a_id`
2. **Mouse interaction**: `smoothstep` computes proximity to mouse position. Nearby particles displace outward with oscillating sine/cosine motion based on mouse delta
3. **Simplex noise rotation**: `float n = snoise(pos * u_amplitude)` drives a rotation matrix per instance
4. **Per-instance scale**: Read from `t_scale` texture, blended across 4 states, amplified near mouse cursor (scale up by **0.75**)
5. **Instance matrix**: Translation + noise-based rotation (or billboard on mobile) + scale
6. **Scroll-driven offset**: `u_offset` and `u_rotation` driven by `sectionProgress`
7. **Depth output**: `v_pos.z` for depth-based alpha fadeout

Attributes: `a_index`, `a_order`, `a_id` (vec2), `a_angle` (vec4), `a_random` (vec4)
Helpers: `rotationMatrix()`, `calcLookAtMatrix()`, `snoise()` (3D simplex noise)

## Particle Render Fragment Shader

- Samples color from `t_color` at 4 UV quadrants, blends via `u_progress`
- Mouse hover brightening: `col = mix(col, vec3(0.45), max(0., v_hover - u_explode))`
- Depth-based alpha: `float alpha = diffuseColor.a * smoothstep(-4.5, 4., v_pos.z)`

## Mouse Interaction

- `onMousemove(e)` captures normalized mouse position into `_mTg`
- `_updateMouse()` applies eased interpolation (lerp factor **0.075**) for smooth following
- Mouse delta (velocity) computed as difference between frames, clamped to **[-2, 2]** (desktop) or **[-0.1, 0.1]** (mobile)
- In vertex shader: `smoothstep` proximity check. Nearby particles:
  - **Push outward** with sin/cos oscillation
  - **Scale up** by 0.75

## Scroll Interaction

`sectionProgress` (float, range ~0-6+) drives:

- **Y-axis rotation**: Piecewise mapping of progress to rotation angles (e.g., 0-1 -> 0 to -PI/2)
- **X/Z position offset**: Complex piecewise mapping moving cloud through 3D space
- **`u_progress`**: Transitions between 4 baked position/color/scale states
- **`u_explode`**: Scatter/explode animation at specific scroll ranges
- **Camera position**: Also scroll-driven

## Post-Processing Pipeline

1. Render main particle scene
2. Render front particle layer (additive, no clear, clear depth)
3. **Bloom** (threshold 0.159, strength 0.4, radius 1)
4. **Bokeh DOF** (desktop only - focal depth 0.125, focal length 27, 4 rings, 6 samples)
5. **Vignette** (offset 0.3, darkness 4)

## Film Grain Overlay Shader

Separate fullscreen overlay:
- Pattern-based grain using `sin(point.x) * sin(point.y)` crosshatch
- Random noise per fragment
- Vignette via `smoothstep` on distance from center
- DPI-aware alpha/brightness values

## Gradient Blob Background Shader

2D simplex noise with two colored circles (`uPosA`/`uPosB`, `uColorA`/`uColorB`), animated over time.

## Key Constants

| Parameter | Value |
|-----------|-------|
| Particle count (desktop) | 10,000 |
| Particle count (mobile) | 7,000 |
| Spring constant | 0.006 |
| Friction | 0.892 |
| Mouse lerp factor | 0.075 |
| Mouse delta clamp (desktop) | [-2, 2] |
| Mouse delta clamp (mobile) | [-0.1, 0.1] |
| Mouse scale boost | 0.75 |
| Bloom threshold | 0.159 |
| Bloom strength | 0.4 |
| Bloom radius | 1 |
| DOF focal depth | 0.125 |
| DOF focal length | 27 |
| DOF rings | 4 |
| DOF samples | 6 |
| Vignette offset | 0.3 |
| Vignette darkness | 4 |
