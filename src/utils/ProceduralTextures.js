import * as THREE from 'three';

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

/**
 * Paints a weathered steel-blue hull texture: base color variance, streak
 * scratches, corner/edge wear (darkened, desaturated bands), and rust-bloom
 * corrosion patches near the base — all procedural, no image assets.
 */
export function buildHullColorTexture({ width = 1024, height = 1024, corrosion = true } = {}) {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Base coat
  ctx.fillStyle = '#33587c';
  ctx.fillRect(0, 0, width, height);

  // Subtle vertical panel shading bands (reads as corrugation lighting)
  const bands = 24;
  for (let i = 0; i < bands; i++) {
    const x = (i / bands) * width;
    const w = width / bands;
    const shade = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
    ctx.fillStyle = shade;
    ctx.fillRect(x, 0, w, height);
  }

  // Random fine scratches
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 140; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const len = 10 + Math.random() * 80;
    const ang = Math.random() * Math.PI;
    const x2 = x1 + Math.cos(ang) * len;
    const y2 = y1 + Math.sin(ang) * len;
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(10,15,20,0.3)';
    ctx.lineWidth = 0.6 + Math.random() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Edge wear — darker desaturated band along the bottom third
  const grad = ctx.createLinearGradient(0, height * 0.72, 0, height);
  grad.addColorStop(0, 'rgba(20,22,20,0)');
  grad.addColorStop(1, 'rgba(35,30,25,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, height * 0.72, width, height * 0.28);

  if (corrosion) {
    // Rust-colored corrosion blooms, biased toward the base
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * width;
      const y = height * (0.68 + Math.random() * 0.3);
      const r = 18 + Math.random() * 46;
      const bloom = ctx.createRadialGradient(x, y, 0, x, y, r);
      bloom.addColorStop(0, 'rgba(150,74,34,0.55)');
      bloom.addColorStop(0.6, 'rgba(110,55,28,0.28)');
      bloom.addColorStop(1, 'rgba(110,55,28,0)');
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Companion roughness map — rougher (brighter) where corrosion/wear is. */
export function buildHullRoughnessTexture({ width = 1024, height = 1024 } = {}) {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#5a5a5a';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 260; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = 4 + Math.random() * 30;
    const v = Math.random() * 90 + 100;
    ctx.fillStyle = `rgba(${v},${v},${v},0.4)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const grad = ctx.createLinearGradient(0, height * 0.7, 0, height);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(255,255,255,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, height * 0.7, width, height * 0.3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Paints the standard ISO container stencil markings onto a door-panel-sized
 * texture: owner code, size/type, gross/tare weight, manufacture date.
 * Returns { texture, markings } where markings is an array of
 * { text, u, v } normalized positions used by OCRSystem to place CSS2D
 * leader lines onto the exact painted location.
 */
export function buildMarkingsTexture({ width = 1024, height = 640 } = {}) {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.clearRect(0, 0, width, height);

  ctx.textBaseline = 'top';
  ctx.fillStyle = '#eef4fa';

  const markings = [];

  function stencil(text, x, y, size, weight = '700') {
    ctx.font = `${weight} ${size}px 'IBM Plex Mono', monospace`;
    ctx.fillText(text, x, y);
    markings.push({ text, u: (x + ctx.measureText(text).width / 2) / width, v: 1 - (y + size / 2) / height });
  }

  stencil('MSKU 128773 4', 40, 40, 58);
  stencil('22G1', 40, 120, 40);
  stencil('MAX GROSS  30480 KG', 40, 210, 30);
  stencil('TARE  2200 KG', 40, 254, 30);
  stencil('MFG  03-2019', 40, 298, 30);
  stencil('NET  28280 KG', 40, 342, 30);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, markings };
}

/** Simple plank-grain floor texture for the container's plywood deck. */
export function buildFloorTexture({ width = 512, height = 512 } = {}) {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#4a3626';
  ctx.fillRect(0, 0, width, height);

  const planks = 10;
  for (let i = 0; i < planks; i++) {
    const y = (i / planks) * height;
    const h = height / planks;
    const shade = 14 + Math.random() * 14;
    ctx.fillStyle = `rgb(${58 + shade}, ${40 + shade * 0.6}, ${26 + shade * 0.4})`;
    ctx.fillRect(0, y, width, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    for (let g = 0; g < 40; g++) {
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 0.5;
      const gy = y + Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy + (Math.random() - 0.5) * 6);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
