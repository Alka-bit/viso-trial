// Digital twin transition shader. Renders the container hull passing through
// four states driven by a single uProgress uniform (0..1, looped by
// DigitalTwin.js): 0 = real material, 0.33 = wireframe, 0.66 = point cloud,
// 1.0 = grid / real material. Rather than physically switching geometry
// each frame, we fade a barycentric wireframe overlay and a dissolve mask
// over the base color so the transition can be driven entirely by a shader
// uniform.

export const dissolveVertexShader = /* glsl */ `
  attribute vec3 barycentric;
  varying vec3 vBarycentric;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vBarycentric = barycentric;
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const dissolveFragmentShader = /* glsl */ `
  uniform vec3 uBaseColor;
  uniform vec3 uGridColor;
  uniform float uProgress; // 0..1 looping cycle
  uniform float uTime;

  varying vec3 vBarycentric;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  float edgeFactor() {
    vec3 d = fwidth(vBarycentric);
    vec3 a3 = smoothstep(vec3(0.0), d * 1.5, vBarycentric);
    return 1.0 - min(min(a3.x, a3.y), a3.z);
  }

  void main() {
    // simple lambert term so the "real material" phase still reads as lit
    vec3 lightDir = normalize(vec3(0.4, 0.8, 0.5));
    float lambert = max(dot(normalize(vNormal), lightDir), 0.0) * 0.7 + 0.3;
    vec3 realColor = uBaseColor * lambert;

    // wireframe phase: 0.20 - 0.46
    float wireAmt = smoothstep(0.15, 0.28, uProgress) * (1.0 - smoothstep(0.42, 0.50, uProgress));
    // point-cloud phase: 0.46 - 0.72 -> discard fragment centers, keep vertex-ish dots via barycentric extremes
    float pointAmt = smoothstep(0.46, 0.55, uProgress) * (1.0 - smoothstep(0.68, 0.76, uProgress));
    // grid phase: 0.72 - 0.98
    float gridAmt = smoothstep(0.72, 0.80, uProgress) * (1.0 - smoothstep(0.94, 1.0, uProgress));

    float wire = edgeFactor();

    vec3 color = realColor;

    // Wireframe overlay: darken fill, brighten edges in cyan
    vec3 wireColor = mix(realColor * 0.15, uGridColor, wire);
    color = mix(color, wireColor, wireAmt);

    // Point cloud: show only near-vertex fragments as bright dots
    float dotMask = 1.0 - smoothstep(0.0, 0.06, min(min(vBarycentric.x, vBarycentric.y), vBarycentric.z));
    vec3 pointColor = uGridColor * dotMask * 2.0;
    color = mix(color, pointColor, pointAmt);
    float pointAlpha = mix(1.0, dotMask, pointAmt);

    // Grid overlay: world-space grid lines projected onto the hull
    float gx = abs(fract(vWorldPos.x * 2.0 + vUv.y * 0.0) - 0.5);
    float gy = abs(fract(vWorldPos.y * 2.0) - 0.5);
    float gridLine = 1.0 - smoothstep(0.0, 0.04, min(gx, gy));
    vec3 gridColor = mix(realColor * 0.2, uGridColor, gridLine);
    color = mix(color, gridColor, gridAmt);

    float alpha = mix(1.0, pointAlpha, pointAmt);
    gl_FragColor = vec4(color, alpha);
  }
`;
