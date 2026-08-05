import * as THREE from 'three';
import { gridVertexShader, gridFragmentShader } from '../shaders/gridTransition.glsl.js';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    scene.fog = new THREE.FogExp2(0x05080d, 0.045);
    scene.background = new THREE.Color(0x05080d);

    this._buildGrid();
    this._buildPlatform();
    this._buildVolumetricBeam();

    scene.add(this.group);
  }

  _buildGrid() {
    const geometry = new THREE.PlaneGeometry(60, 60, 1, 1);
    geometry.rotateX(-Math.PI / 2);

    this.gridUniforms = {
      uColor: { value: new THREE.Color(0x2f5a78) },
      uTime: { value: 0 },
      uPulseTime: { value: 999 },
      uFade: { value: 16 }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: gridVertexShader,
      fragmentShader: gridFragmentShader,
      uniforms: this.gridUniforms,
      transparent: true,
      depthWrite: false
    });

    this.grid = new THREE.Mesh(geometry, material);
    this.grid.position.y = -1.35;
    this.group.add(this.grid);
  }

  _buildPlatform() {
    // Dark disc the container floats above, with a thin emissive ring lip.
    const discGeo = new THREE.CylinderGeometry(2.6, 2.8, 0.12, 64);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x0a1018,
      metalness: 0.6,
      roughness: 0.35,
      envMapIntensity: 0.6
    });
    this.platform = new THREE.Mesh(discGeo, discMat);
    this.platform.position.y = -1.3;
    this.platform.receiveShadow = true;
    this.group.add(this.platform);

    const ringGeo = new THREE.TorusGeometry(2.65, 0.014, 8, 128);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x29d3ff });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = -1.23;
    this.group.add(this.ring);
  }

  _buildVolumetricBeam() {
    // Soft additive cone standing in for a volumetric light shaft.
    const geo = new THREE.CylinderGeometry(0.05, 2.2, 6, 32, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x3a5f82,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.beam = new THREE.Mesh(geo, mat);
    this.beam.position.y = 1.6;
    this.group.add(this.beam);
  }

  triggerPulse() {
    this.gridUniforms.uPulseTime.value = 0;
  }

  update(delta) {
    this.gridUniforms.uTime.value += delta;
    this.gridUniforms.uPulseTime.value += delta;
    this.ring.rotation.z += delta * 0.03;
  }

  applyEnvMap(envMap) {
    this.scene.environment = envMap;
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
