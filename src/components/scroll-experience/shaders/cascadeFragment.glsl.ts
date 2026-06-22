export const cascadeFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    if (vAlpha < 0.01) discard;
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;
