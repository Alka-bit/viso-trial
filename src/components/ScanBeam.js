import * as THREE from 'three';
import gsap from 'gsap';
import { scanBeamVertexShader, scanBeamFragmentShader } from '../shaders/scanBeam.glsl.js';

const CYCLE_INTERVAL = 6.0; // seconds between scans, per spec
const SWEEP_DURATION = 2.4;

export class ScanBeam {
  constructor(container) {
    this.container = container;
    this.active = false;
    this.timeSinceLastScan = 1.5; // stagger the very first scan a bit
    this.onScanStart = null;
    this.onAnchorPass = null;
    this.onScanEnd = null;
    this._triggeredAnchors = new Set();

    const { length, height, width } = container.dims;
    this.length = length;

    const geo = new THREE.PlaneGeometry(width + 0.3, height + 0.3, 1, 24);
    this.uniforms = {
      uColor: { value: new THREE.Color(0x29d3ff) },
      uTime: { value: 0 },
      uOpacity: { value: 0 }
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: scanBeamVertexShader,
      fragmentShader: scanBeamFragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.rotation.y = Math.PI / 2;
    this.mesh.position.x = -length / 2 - 0.4;
    container.group.add(this.mesh);
  }

  _startSweep() {
    this.active = true;
    this._triggeredAnchors.clear();
    this.uniforms.uOpacity.value = 0;
    this.onScanStart && this.onScanStart();

    const startX = -this.length / 2 - 0.15;
    const endX = this.length / 2 + 0.15;
    this.mesh.position.x = startX;

    gsap.to(this.uniforms.uOpacity, { value: 1, duration: 0.4, ease: 'power1.out' });

    gsap.to(this.mesh.position, {
      x: endX,
      duration: SWEEP_DURATION,
      ease: 'power1.inOut',
      onComplete: () => {
        gsap.to(this.uniforms.uOpacity, {
          value: 0,
          duration: 0.5,
          onComplete: () => {
            this.active = false;
            this.onScanEnd && this.onScanEnd();
          }
        });
      }
    });
  }

  update(delta, elapsed) {
    this.uniforms.uTime.value = elapsed;

    if (!this.active) {
      this.timeSinceLastScan += delta;
      if (this.timeSinceLastScan >= CYCLE_INTERVAL) {
        this.timeSinceLastScan = 0;
        this._startSweep();
      }
      return;
    }

    // Notify DamageSystem / OCRSystem exactly once as the beam crosses each anchor.
    if (this.onAnchorPass) {
      this.onAnchorPass(this.mesh.position.x, this._triggeredAnchors);
    }
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
