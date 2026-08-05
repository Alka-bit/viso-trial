/**
 * Tracks normalized (-1..1) pointer position and exposes a lerp-smoothed
 * reading so camera parallax never snaps, only glides.
 */
export class MouseTracker {
  constructor(damping = 0.06) {
    this.damping = damping;
    this.target = { x: 0, y: 0 };
    this.current = { x: 0, y: 0 };

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerleave', this.onPointerLeave);
  }

  onPointerMove = (event) => {
    this.target.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.target.y = (event.clientY / window.innerHeight) * 2 - 1;
  };

  onPointerLeave = () => {
    this.target.x = 0;
    this.target.y = 0;
  };

  update() {
    this.current.x += (this.target.x - this.current.x) * this.damping;
    this.current.y += (this.target.y - this.current.y) * this.damping;
    return this.current;
  }

  dispose() {
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerleave', this.onPointerLeave);
  }
}
