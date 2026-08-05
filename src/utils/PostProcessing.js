import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Wraps the EffectComposer chain: geometry pass -> bloom (isolates the
 * cyan/amber HUD & scan-beam glow via a bright-pass threshold) -> SMAA ->
 * output/tone-map. Kept as its own class so SceneManager can resize/dispose
 * it without knowing pass internals.
 */
export class PostProcessing {
  constructor(renderer, scene, camera, size) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.85,  // strength
      0.55,  // radius
      0.22   // threshold — only very bright emissive/glow elements bloom
    );
    this.composer.addPass(this.bloomPass);

    const pixelRatio = renderer.getPixelRatio();
    this.smaaPass = new SMAAPass(size.width * pixelRatio, size.height * pixelRatio);
    this.composer.addPass(this.smaaPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  setSize(width, height) {
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
    const pixelRatio = this.renderer.getPixelRatio();
    this.smaaPass.setSize(width * pixelRatio, height * pixelRatio);
  }

  render(delta) {
    this.composer.render(delta);
  }

  dispose() {
    this.composer.passes.forEach((pass) => pass.dispose && pass.dispose());
  }
}
