import * as THREE from 'three';

export class Lights {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // Key light — cool white, simulates overhead terminal floodlight
    this.key = new THREE.DirectionalLight(0xdfe9f5, 2.4);
    this.key.position.set(4, 6, 3);
    this.group.add(this.key);

    // Rim light — cyan, traces the container's silhouette
    this.rim = new THREE.DirectionalLight(0x29d3ff, 1.6);
    this.rim.position.set(-5, 2.5, -4);
    this.group.add(this.rim);

    // AI accent — warm amber up-fill from the digital platform
    this.aiAccent = new THREE.PointLight(0xff9d3d, 4.0, 8, 2);
    this.aiAccent.position.set(0, -0.4, 0.5);
    this.group.add(this.aiAccent);

    // Very low ambient so shadows never crush fully black
    this.ambient = new THREE.AmbientLight(0x223344, 0.5);
    this.group.add(this.ambient);

    scene.add(this.group);
  }

  /** Pulses the amber accent in sync with the AI scan sweep. */
  pulseAccent(intensity) {
    this.aiAccent.intensity = 4.0 + intensity * 5.0;
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
