import * as THREE from 'three';
import gsap from 'gsap';

export class Camera {
  constructor(size) {
    this.instance = new THREE.PerspectiveCamera(38, size.width / size.height, 0.1, 100);

    // Cinematic start position, dollies in to the resting pose on load.
    this.restPosition = new THREE.Vector3(0, 1.4, 8.2);
    this.introPosition = new THREE.Vector3(0, 3.2, 13.5);
    this.instance.position.copy(this.introPosition);
    this.instance.lookAt(0, 0.6, 0);

    this.lookTarget = new THREE.Vector3(0, 0.6, 0);
    this.parallaxStrength = 0.55;
  }

  playIntro(onComplete) {
    gsap.to(this.instance.position, {
      x: this.restPosition.x,
      y: this.restPosition.y,
      z: this.restPosition.z,
      duration: 3.2,
      ease: 'power3.out',
      onComplete
    });
  }

  /** Applies subtle parallax from smoothed mouse coords without fighting
   * the intro tween (both write to position, gsap wins during intro since
   * parallax offset is small and additive after rest is reached). */
  update(mouse) {
    const offsetX = mouse.x * this.parallaxStrength;
    const offsetY = -mouse.y * (this.parallaxStrength * 0.5);

    this.instance.position.x = THREE.MathUtils.lerp(this.instance.position.x, this.restPosition.x + offsetX, 0.04);
    this.instance.position.y = THREE.MathUtils.lerp(this.instance.position.y, this.restPosition.y + offsetY, 0.04);

    this.instance.lookAt(this.lookTarget);
  }

  focusOn(worldPos) {
    gsap.to(this.lookTarget, {
      x: worldPos.x,
      y: worldPos.y,
      z: worldPos.z,
      duration: 1.0,
      ease: 'power2.inOut'
    });
  }

  resetFocus() {
    this.focusOn(new THREE.Vector3(0, 0.6, 0));
  }

  resize(size) {
    this.instance.aspect = size.width / size.height;
    this.instance.updateProjectionMatrix();
  }
}
