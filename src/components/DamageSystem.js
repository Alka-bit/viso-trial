import * as THREE from 'three';
import gsap from 'gsap';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const DAMAGE_LABELS = {
  dent: { name: 'Dent', severity: 'Moderate' },
  crack: { name: 'Crack', severity: 'High' },
  corrosion: { name: 'Corrosion', severity: 'Moderate' },
  bentRail: { name: 'Bent Rail', severity: 'High' },
  roofDamage: { name: 'Roof Damage', severity: 'Severe' },
  panelBow: { name: 'Panel Bow', severity: 'Low' },
  brokenLockingBar: { name: 'Broken Locking Bar', severity: 'Severe' },
  missingHandle: { name: 'Missing Handle', severity: 'Low' }
};

function randomSize(type) {
  const ranges = {
    dent: [4, 14],
    crack: [8, 26],
    corrosion: [10, 40],
    bentRail: [20, 60],
    roofDamage: [15, 45],
    panelBow: [30, 80],
    brokenLockingBar: [10, 20],
    missingHandle: [5, 10]
  };
  const [min, max] = ranges[type] || [5, 20];
  return (min + Math.random() * (max - min)).toFixed(1);
}

export class DamageSystem {
  constructor(container, labelLayer) {
    this.container = container;
    this.markers = [];
    this.onBurst = null; // (localPos) => void, wired to ParticleSystem by main.js

    container.damageAnchors.forEach((anchor) => this._createMarker(anchor));
  }

  _createMarker(anchor) {
    const info = DAMAGE_LABELS[anchor.type] || { name: 'Anomaly', severity: 'Unknown' };
    const confidence = 82 + Math.random() * 16;
    const size = randomSize(anchor.type);

    // Glow ring marker
    const ringGeo = new THREE.RingGeometry(0.045, 0.06, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff9d3d,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(anchor.pos);
    ring.lookAt(anchor.pos.clone().add(anchor.normal));
    this.container.group.add(ring);

    // CSS2D label (starts hidden)
    const el = document.createElement('div');
    el.className = 'co-label co-label--damage';
    el.style.opacity = '0';
    el.innerHTML = `${info.name}<small>${confidence.toFixed(0)}% · ${info.severity} · ${size}cm</small>`;
    const label = new CSS2DObject(el);
    label.position.copy(anchor.pos);
    this.container.group.add(label);

    this.markers.push({
      anchor,
      ring,
      label,
      el,
      confidence,
      info,
      size,
      triggered: false,
      visible: false
    });
  }

  /** Called every frame by ScanBeam while a sweep is active. */
  handleScanPass = (beamLocalX, triggeredSet) => {
    this.markers.forEach((marker, idx) => {
      if (triggeredSet.has(idx)) return;
      if (Math.abs(marker.anchor.pos.x - beamLocalX) < 0.12) {
        triggeredSet.add(idx);
        this._activateMarker(marker);
      }
    });
  };

  _activateMarker(marker) {
    marker.visible = true;
    gsap.to(marker.ring.material, { opacity: 0.9, duration: 0.3 });
    gsap.to(marker.el, { opacity: 1, duration: 0.3, onStart: () => (marker.el.style.opacity = '1') });

    // animate confidence count-up text
    const counter = { v: 0 };
    gsap.to(counter, {
      v: marker.confidence,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        marker.el.innerHTML = `${marker.info.name}<small>${counter.v.toFixed(0)}% · ${marker.info.severity} · ${marker.size}cm</small>`;
      }
    });

    this.onBurst && this.onBurst(marker.anchor.pos);

    // fade after a dwell period
    gsap.to(marker.ring.material, { opacity: 0, duration: 0.6, delay: 3.4 });
    gsap.to(marker.el, {
      opacity: 0,
      duration: 0.6,
      delay: 3.4,
      onComplete: () => {
        marker.visible = false;
      }
    });
  }

  update(delta, elapsed) {
    this.markers.forEach((marker) => {
      if (marker.visible) {
        marker.ring.rotation.z += delta * 0.6;
      }
    });
  }

  dispose() {
    this.markers.forEach((m) => {
      m.ring.geometry.dispose();
      m.ring.material.dispose();
    });
  }
}
