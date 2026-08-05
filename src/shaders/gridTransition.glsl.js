// Infinite floor grid. Fades radially from the platform center and pulses
// faintly outward whenever the AI scan fires (driven by uPulseTime).

export const gridVertexShader = /* glsl */ `
  varying vec2 vXz;

  void main() {
    vXz = position.xz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const gridFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uPulseTime; // time since last scan trigger, large if inactive
  uniform float uFade;

  varying vec2 vXz;

  float gridLines(vec2 p, float scale) {
    vec2 g = abs(fract(p * scale - 0.5) - 0.5) / fwidth(p * scale);
    float line = min(g.x, g.y);
    return 1.0 - min(line, 1.0);
  }

  void main() {
    float dist = length(vXz);
    float radial = 1.0 - smoothstep(0.0, uFade, dist);

    float major = gridLines(vXz, 0.1) * 0.5;
    float minor = gridLines(vXz, 0.5) * 0.18;
    float linesTotal = max(major, minor);

    // expanding ring pulse triggered by scan events
    float ring = 0.0;
    if (uPulseTime < 2.2) {
      float r = uPulseTime * 9.0;
      ring = smoothstep(1.2, 0.0, abs(dist - r)) * (1.0 - uPulseTime / 2.2);
    }

    float alpha = (linesTotal * radial * 0.8) + ring * 0.5;
    vec3 color = uColor + ring * vec3(0.3, 0.15, 0.0);
    gl_FragColor = vec4(color, alpha);
  }
`;
