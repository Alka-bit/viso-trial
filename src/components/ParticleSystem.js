import * as THREE from 'three';
import { particleVertexShader, particleFragmentShader } from '../shaders/particleGlow.glsl.js';

const MAX_PARTICLES = 360;
const PARTICLES_PER_BURST = 16;

export class ParticleSystem {
  constructor(container) {
    this.container = container;
    this.corePosition = new THREE.Vector3(0, container.dims.height / 2 + 0.85, 0);

    this._buildCore();
    this._buildParticles();
  }

  _buildCore() {
    const geo = new THREE.IcosahedronGeometry(0.11, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0d1420,
      emissive: 0xff9d3d,
      emissiveIntensity: 1.6,
      metalness: 0.4,
      roughness: 0.3,
      wireframe: false
    });
    this.core = new THREE.Mesh(geo, mat);
    this.core.position.copy(this.corePosition);
    this.container.group.add(this.core);

    const haloGeo = new THREE.IcosahedronGeometry(0.16, 1);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff9d3d,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    this.halo = new THREE.Mesh(haloGeo, haloMat);
    this.halo.position.copy(this.corePosition);
    this.container.group.add(this.halo);
  }

  _buildParticles() {
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.alphas = new Float32Array(MAX_PARTICLES);

    this.state = new Array(MAX_PARTICLES).fill(null).map(() => ({
      active: false,
      t: 0,
      duration: 1,
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
      arcHeight: 0
    }));

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: { uColor: { value: new THREE.Color(0xff9d3d) } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geometry, material);
    this.geometry = geometry;
    this.container.group.add(this.points);

    this._cursor = 0;
  }

  /** Fires a small stream of particles from a damage-site local position
   * toward the floating AI core. Called by DamageSystem on activation. */
  emitBurst = (fromLocalPos) => {
    for (let i = 0; i < PARTICLES_PER_BURST; i++) {
      const idx = this._cursor;
      this._cursor = (this._cursor + 1) % MAX_PARTICLES;
      const s = this.state[idx];
      s.active = true;
      s.t = -Math.random() * 0.4; // stagger start within the burst
      s.duration = 1.1 + Math.random() * 0.6;
      s.start.copy(fromLocalPos).addScaledVector(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5), 0.05);
      s.end.copy(this.corePosition);
      s.arcHeight = 0.3 + Math.random() * 0.3;
      this.sizes[idx] = 3 + Math.random() * 4;
    }
  };

  update(delta) {
    this.halo.rotation.y += delta * 0.6;
    this.halo.rotation.x += delta * 0.3;
    this.core.rotation.y -= delta * 0.4;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const s = this.state[i];
      if (!s.active) {
        this.alphas[i] = 0;
        continue;
      }
      s.t += delta / s.duration;
      if (s.t >= 1) {
        s.active = false;
        this.alphas[i] = 0;
        continue;
      }
      const t = Math.max(s.t, 0);
      const arc = Math.sin(t * Math.PI) * s.arcHeight;
      const x = THREE.MathUtils.lerp(s.start.x, s.end.x, t);
      const y = THREE.MathUtils.lerp(s.start.y, s.end.y, t) + arc;
      const z = THREE.MathUtils.lerp(s.start.z, s.end.z, t);
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;
      this.alphas[i] = Math.sin(Math.min(t, 1) * Math.PI); // fade in & out
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.points.material.dispose();
    this.core.geometry.dispose();
    this.core.material.dispose();
    this.halo.geometry.dispose();
    this.halo.material.dispose();
  }
}
