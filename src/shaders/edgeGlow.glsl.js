// Fresnel rim-light shader. Used as an additive overlay on the container
// hull (subtle) and on damage marker shells (strong, colored by severity).

export const edgeGlowVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const edgeGlowFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  uniform float uTime;
  uniform float uPulse;

  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float fresnel = 1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
    fresnel = pow(fresnel, uPower);

    float pulse = 1.0;
    if (uPulse > 0.5) {
      pulse = 0.7 + 0.3 * sin(uTime * 3.0);
    }

    vec3 color = uColor * fresnel * uIntensity * pulse;
    gl_FragColor = vec4(color, fresnel * uIntensity);
  }
`;
