/**
 * Window-grid injection for the building material. Patches a standard
 * material via onBeforeCompile so each building's side faces show a grid of
 * recessed dark windows, sized by per-instance floor/column counts. Roof and
 * underside stay blank. No texture asset — the grid is computed in-shader
 * from box UVs.
 */

const VERTEX_PARS = /* glsl */ `
  attribute float aFloors;
  attribute float aCols;
  attribute float aSeed;
  varying vec2 vCityUv;
  varying vec3 vCityNormal;
  varying float vCityFloors;
  varying float vCityCols;
  varying float vCitySeed;
`;

const VERTEX_MAIN = /* glsl */ `
  vCityUv = uv;
  vCityNormal = normal;
  vCityFloors = aFloors;
  vCityCols = aCols;
  vCitySeed = aSeed;
`;

const FRAGMENT_PARS = /* glsl */ `
  varying vec2 vCityUv;
  varying vec3 vCityNormal;
  varying float vCityFloors;
  varying float vCityCols;
  varying float vCitySeed;

  // Hash for occasional lit/blown-out windows.
  float cityHash(vec2 p) {
    return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
  }
`;

const FRAGMENT_MAIN = /* glsl */ `
  // Side faces only (box normals are axis-aligned in object space).
  if (abs(vCityNormal.y) < 0.5) {
    vec2 grid = vec2(vCityUv.x * vCityCols, vCityUv.y * vCityFloors);
    vec2 cell = floor(grid);
    vec2 f = fract(grid);
    // Recessed window rectangle with a frame margin.
    float win =
      step(0.16, f.x) * step(f.x, 0.84) *
      step(0.22, f.y) * step(f.y, 0.80);
    // A few windows are punched out / dark, most are mid-dark.
    float lit = step(0.82, cityHash(cell + vCitySeed * 13.0));
    float darken = mix(0.45, 0.22, lit);
    diffuseColor.rgb *= mix(1.0, darken, win);
  }
`;

/** Inject the window grid into a standard material's shaders. */
export function patchCityWindows(material: import("three").Material): void {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_PARS}`)
      .replace("#include <uv_vertex>", `#include <uv_vertex>\n${VERTEX_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_PARS}`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>\n${FRAGMENT_MAIN}`,
      );
  };
  material.customProgramCacheKey = () => "city-windows";
}
