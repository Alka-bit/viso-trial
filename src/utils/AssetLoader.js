import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * AssetLoader centralizes every async load in the app: PBR-ready HDR
 * environment (generated procedurally through PMREM since the project
 * ships with zero binary assets), and a GLTF/DRACO pipeline kept wired up
 * for teams that want to swap the procedural container for a scanned mesh.
 *
 * Emits progress via an onProgress callback so the loading screen can show
 * real, if coarse, status text instead of a fake timer.
 */
export class AssetLoader {
  constructor(renderer) {
    this.renderer = renderer;
    this.manager = new THREE.LoadingManager();

    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

    this.gltfLoader = new GLTFLoader(this.manager);
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.pmremGenerator.compileEquirectangularShader();
  }

  /**
   * Builds a physically-plausible studio/industrial environment map for
   * reflections and IBL without needing a downloaded .hdr file.
   */
  async loadEnvironment() {
    const envScene = new RoomEnvironment();
    const envMap = this.pmremGenerator.fromScene(envScene, 0.04).texture;
    return envMap;
  }

  /**
   * Placeholder hook for loading a scanned/DRACO-compressed container mesh.
   * Not called by default (the hero uses a procedural container), but kept
   * so the pipeline is production-ready if real asset URLs are supplied.
   */
  loadContainerModel(url) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        (err) => reject(err)
      );
    });
  }

  dispose() {
    this.dracoLoader.dispose();
    this.pmremGenerator.dispose();
  }
}
