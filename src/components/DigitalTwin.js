import * as THREE from 'three';
import { dissolveVertexShader, dissolveFragmentShader } from '../shaders/wireframeDissolve.glsl.js';
import { addBarycentricAttribute } from '../utils/MathUtils.js';

const CYCLE_DURATION = 12; // seconds, per spec
const TRANSITION_START = 0.12;
const TRANSITION_END = 0.92;

export class DigitalTwin {
  constructor(container) {
    this.container = container;
    this.meshes = [container.wallFront, container.wallBack, container.wallLeft, container.roof];
    this.originalMaterials = this.meshes.map((m) => m.material);
    this.dissolveMaterials = this.meshes.map((m) => this._makeDissolveMaterial(m));
    this.progress = 0;
    this.modeLabel = 'SURFACE SCAN';
    this.onModeChange = null;
  }

  _makeDissolveMaterial(mesh) {
    let geo = mesh.geometry;
    if (geo.index) {
      const nonIndexed = geo.toNonIndexed();
      geo.dispose();
      geo = nonIndexed;
      mesh.geometry = geo;
    }
    if (!geo.attributes.barycentric) {
      addBarycentricAttribute(geo);
    }

    const uniforms = {
      uBaseColor: { value: new THREE.Color(0x33587c) },
      uGridColor: { value: new THREE.Color(0x29d3ff) },
      uProgress: { value: 0 },
      uTime: { value: 0 }
    };

    return new THREE.ShaderMaterial({
      vertexShader: dissolveVertexShader,
      fragmentShader: dissolveFragmentShader,
      uniforms,
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  _labelForProgress(p) {
    if (p < TRANSITION_START || p > TRANSITION_END) return 'SURFACE SCAN';
    if (p < 0.38) return 'WIREFRAME MESH';
    if (p < 0.62) return 'POINT CLOUD';
    return 'DIGITAL GRID';
  }

  update(delta, elapsed) {
    this.progress = (elapsed % CYCLE_DURATION) / CYCLE_DURATION;
    const useDissolve = this.progress > TRANSITION_START && this.progress < TRANSITION_END;

    this.meshes.forEach((mesh, i) => {
      mesh.material = useDissolve ? this.dissolveMaterials[i] : this.originalMaterials[i];
      if (useDissolve) {
        this.dissolveMaterials[i].uniforms.uProgress.value = this.progress;
        this.dissolveMaterials[i].uniforms.uTime.value = elapsed;
      }
    });

    const label = this._labelForProgress(this.progress);
    if (label !== this.modeLabel) {
      this.modeLabel = label;
      this.onModeChange && this.onModeChange(label);
    }
  }

  dispose() {
    this.dissolveMaterials.forEach((m) => m.dispose());
  }
}
