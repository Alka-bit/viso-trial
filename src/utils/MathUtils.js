import * as THREE from 'three';

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/** Adds a `barycentric` attribute so non-indexed geometry can render a
 * shader-based wireframe overlay (used by the digital-twin dissolve shader).
 * Geometry must be non-indexed (call .toNonIndexed() first). */
export function addBarycentricAttribute(geometry) {
  const count = geometry.attributes.position.count;
  const barycentric = new Float32Array(count * 3);
  const pattern = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];
  for (let i = 0; i < count; i++) {
    const [x, y, z] = pattern[i % 3];
    barycentric[i * 3] = x;
    barycentric[i * 3 + 1] = y;
    barycentric[i * 3 + 2] = z;
  }
  geometry.setAttribute('barycentric', new THREE.BufferAttribute(barycentric, 3));
  return geometry;
}
