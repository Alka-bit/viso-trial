// Scan beam shader — a thin glowing volumetric slab that sweeps along the
// container's local Y axis. Intensity falls off from a hard core to soft
// edges, with a fine scanline texture layered on top for a "sensor" feel.

export const scanBeamVertexShader = /* glsl */ `
  varying vec3 vPos;
  varying vec2 vUv;

  void main() {
    vPos = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const scanBeamFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOpacity;

  varying vec3 vPos;
  varying vec2 vUv;

  void main() {
    // distance from the vertical center of the beam plane (0..0.5)
    float d = abs(vUv.x - 0.5) * 2.0;

    // hard bright core, soft falloff to the edges
    float core = smoothstep(0.16, 0.0, d);
    float glow = smoothstep(1.0, 0.0, d);
    float intensity = core * 1.4 + glow * 0.6;

    // fine horizontal scanlines traveling upward for a sensor-sweep feel
    float lines = sin((vUv.y * 140.0) - uTime * 6.0) * 0.5 + 0.5;
    lines = pow(lines, 6.0) * 0.35;

    float alpha = clamp(intensity + lines * core, 0.0, 1.0) * uOpacity;

    vec3 col = uColor * (1.0 + core * 0.8);
    gl_FragColor = vec4(col, alpha);
  }
`;
