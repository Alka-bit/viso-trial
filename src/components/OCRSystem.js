import * as THREE from 'three';
import gsap from 'gsap';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const LABEL_TAGS = {
  'MSKU 128773 4': 'OWNER / SERIAL',
  '22G1': 'SIZE / TYPE',
  'MAX GROSS  30480 KG': 'MAX GROSS',
  'TARE  2200 KG': 'TARE WEIGHT',
  'MFG  03-2019': 'MANUFACTURED',
  'NET  28280 KG': 'NET WEIGHT'
};

export class OCRSystem {
  constructor(container) {
    this.container = container;
    this.entries = [];
    this.triggered = false;

    container.markingAnchors3D.forEach((m, i) => this._createEntry(m, i));
  }

  _createEntry(marking, index) {
    const anchor = marking.localPos.clone();
    // offset the floating label outward and staggered vertically so the
    // leader lines fan out legibly rather than overlapping the stencil text
    const labelPos = anchor.clone().add(new THREE.Vector3(0.55, 0.05 - index * 0.02, 0.25));

    const el = document.createElement('div');
    el.className = 'co-label';
    el.style.opacity = '0';
    const tag = LABEL_TAGS[marking.text] || 'DETECTED TEXT';
    el.innerHTML = `${marking.text}<small>${tag} · OCR</small>`;
    const label = new CSS2DObject(el);
    label.position.copy(labelPos);
    this.container.group.add(label);

    // Thin leader line from the painted marking to the floating label
    const lineGeo = new THREE.BufferGeometry().setFromPoints([anchor, labelPos]);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x29d3ff,
      transparent: true,
      opacity: 0
    });
    const line = new THREE.Line(lineGeo, lineMat);
    this.container.group.add(line);

    this.entries.push({ el, label, line, lineMat });
  }

  reveal() {
    if (this.triggered) return;
    this.triggered = true;

    this.entries.forEach((entry, i) => {
      gsap.to(entry.lineMat, { opacity: 0.6, duration: 0.3, delay: i * 0.12 });
      gsap.to(entry.el, {
        opacity: 1,
        duration: 0.3,
        delay: i * 0.12,
        onStart: () => (entry.el.style.opacity = '1')
      });
    });

    gsap.delayedCall(4.2, () => this._hide());
  }

  _hide() {
    this.entries.forEach((entry, i) => {
      gsap.to(entry.lineMat, { opacity: 0, duration: 0.4, delay: i * 0.05 });
      gsap.to(entry.el, {
        opacity: 0,
        duration: 0.4,
        delay: i * 0.05,
        onComplete: () => {
          this.triggered = false;
        }
      });
    });
  }

  /** Called by ScanBeam every frame; fires once the beam nears the door end. */
  handleScanPass = (beamLocalX) => {
    const { length } = this.container.dims;
    if (!this.triggered && beamLocalX > length / 2 - 0.35) {
      this.reveal();
    }
  };

  dispose() {
    this.entries.forEach((entry) => {
      entry.line.geometry.dispose();
      entry.line.material.dispose();
    });
  }
}
