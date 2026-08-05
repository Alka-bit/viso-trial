import * as THREE from 'three';
import {
  buildHullColorTexture,
  buildHullRoughnessTexture,
  buildMarkingsTexture,
  buildFloorTexture
} from '../utils/ProceduralTextures.js';
import { edgeGlowVertexShader, edgeGlowFragmentShader } from '../shaders/edgeGlow.glsl.js';

const DIMS = {
  length: 4.2,
  width: 1.7,
  height: 1.9,
  wallThickness: 0.045
};

/** Builds a single corrugated steel panel as an extruded zigzag solid. */
function buildCorrugatedGeometry(length, height, { ribWidth = 0.19, ribDepth = 0.032 } = {}) {
  const ribCount = Math.max(6, Math.round(length / ribWidth));
  const segW = length / ribCount;
  const points = [];
  for (let i = 0; i <= ribCount; i++) {
    const x = i * segW;
    const y = i % 2 === 0 ? 0 : ribDepth;
    points.push(new THREE.Vector2(x, y));
  }
  const shape = new THREE.Shape(points);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(-length / 2, -height / 2, 0);
  geometry.computeVertexNormals();
  return geometry;
}

export class Container {
  constructor() {
    this.group = new THREE.Group();
    this.dims = DIMS;
    this.damageAnchors = []; // world-local anchor points for DamageSystem
    this.markingAnchors = []; // local anchor points for OCRSystem

    this._buildMaterials();
    this._buildHull();
    this._buildDoors();
    this._buildCornerCastings();
    this._buildRoofDetails();
    this._buildFloor();
    this._buildEdgeGlow();

    this.group.position.y = 0.05; // float above the platform
  }

  _buildMaterials() {
    const colorMap = buildHullColorTexture();
    const roughnessMap = buildHullRoughnessTexture();
    colorMap.repeat.set(1, 1);

    this.hullMaterial = new THREE.MeshStandardMaterial({
      map: colorMap,
      roughnessMap,
      metalness: 0.75,
      roughness: 0.55,
      envMapIntensity: 1.1,
      flatShading: true
    });

    this.trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c1420,
      metalness: 0.7,
      roughness: 0.4
    });

    const { texture: markingsMap, markings } = buildMarkingsTexture();
    this.markingAnchors = markings;
    this.doorMaterial = new THREE.MeshStandardMaterial({
      map: this._compositeDoorTexture(markingsMap),
      metalness: 0.7,
      roughness: 0.5,
      flatShading: true
    });
  }

  /** Bakes stenciled markings on top of a fresh hull-colored base for the door panel. */
  _compositeDoorTexture(markingsTexture) {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size * 0.62;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#33587c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(markingsTexture.image, 0, 0, canvas.width, canvas.height);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _buildHull() {
    const { length, width, height, wallThickness } = this.dims;

    // Long side walls (corrugated), front (+Z, facing camera) and back (-Z)
    const sideGeo = buildCorrugatedGeometry(length, height);
    this.wallFront = new THREE.Mesh(sideGeo, this.hullMaterial);
    this.wallFront.position.set(0, 0, width / 2);
    this.wallFront.castShadow = true;
    this.group.add(this.wallFront);

    this.wallBack = new THREE.Mesh(sideGeo.clone(), this.hullMaterial);
    this.wallBack.position.set(0, 0, -width / 2);
    this.wallBack.rotation.y = Math.PI;
    this.group.add(this.wallBack);

    // Left end wall (closed, corrugated) — right end holds the doors
    const endGeo = buildCorrugatedGeometry(width, height, { ribWidth: 0.17, ribDepth: 0.028 });
    this.wallLeft = new THREE.Mesh(endGeo, this.hullMaterial);
    this.wallLeft.rotation.y = -Math.PI / 2;
    this.wallLeft.position.set(-length / 2, 0, 0);
    this.group.add(this.wallLeft);

    // Base rail (bottom structural steel frame, visually grounds the hull)
    const railGeo = new THREE.BoxGeometry(length + 0.06, 0.08, width + 0.06);
    this.baseRail = new THREE.Mesh(railGeo, this.trimMaterial);
    this.baseRail.position.y = -height / 2 - 0.04;
    this.group.add(this.baseRail);

    // Top rail
    const topRailGeo = new THREE.BoxGeometry(length + 0.06, 0.06, width + 0.06);
    this.topRail = new THREE.Mesh(topRailGeo, this.trimMaterial);
    this.topRail.position.y = height / 2 + 0.03;
    this.group.add(this.topRail);

    // Damage anchor points spread across the hull for DamageSystem to use
    this.damageAnchors = [
      { pos: new THREE.Vector3(-0.9, 0.35, width / 2 + 0.02), normal: new THREE.Vector3(0, 0, 1), type: 'dent' },
      { pos: new THREE.Vector3(0.6, -0.4, width / 2 + 0.02), normal: new THREE.Vector3(0, 0, 1), type: 'corrosion' },
      { pos: new THREE.Vector3(1.4, 0.1, width / 2 + 0.02), normal: new THREE.Vector3(0, 0, 1), type: 'crack' },
      { pos: new THREE.Vector3(0, height / 2 + 0.02, 0.3), normal: new THREE.Vector3(0, 1, 0), type: 'roofDamage' },
      { pos: new THREE.Vector3(-1.6, 0, width / 2 + 0.02), normal: new THREE.Vector3(0, 0, 1), type: 'panelBow' },
      { pos: new THREE.Vector3(length / 2 - 0.05, -0.55, 0), normal: new THREE.Vector3(1, 0, 0), type: 'brokenLockingBar' },
      { pos: new THREE.Vector3(length / 2 - 0.05, 0.5, width / 2 - 0.1), normal: new THREE.Vector3(1, 0, 0), type: 'missingHandle' },
      { pos: new THREE.Vector3(-length / 2 + 0.05, 0.2, 0), normal: new THREE.Vector3(-1, 0, 0), type: 'bentRail' }
    ];
  }

  _buildDoors() {
    const { length, width, height } = this.dims;
    const doorWidth = width / 2 - 0.02;
    const doorHeight = height - 0.05;

    this.doorGroup = new THREE.Group();
    this.doorGroup.position.set(length / 2, 0, 0);
    this.group.add(this.doorGroup);

    // Convert the baked marking positions (normalized u/v on the door
    // texture) into local-space anchors on the right-hand door panel, so
    // OCRSystem can draw leader lines straight to the painted text.
    this.markingAnchors3D = this.markingAnchors.map((m) => ({
      text: m.text,
      localPos: new THREE.Vector3(
        length / 2 + 0.05,
        (m.v - 0.5) * doorHeight,
        (m.u - 0.5) * doorWidth + (doorWidth / 2 + 0.01)
      )
    }));

    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1;
      const doorGeo = new THREE.BoxGeometry(0.05, doorHeight, doorWidth);
      const door = new THREE.Mesh(doorGeo, this.doorMaterial);
      door.position.set(0.02, 0, side * (doorWidth / 2 + 0.01));
      this.doorGroup.add(door);

      // Hinges
      for (let h = -1; h <= 1; h += 2) {
        const hingeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.09, 10);
        const hinge = new THREE.Mesh(hingeGeo, this.trimMaterial);
        hinge.position.set(0.04, h * (doorHeight / 2 - 0.15), side * (doorWidth + 0.02));
        hinge.rotation.x = Math.PI / 2;
        this.doorGroup.add(hinge);
      }

      // Vertical locking bars with cam handles
      const barGeo = new THREE.BoxGeometry(0.03, doorHeight * 0.82, 0.03);
      const bar = new THREE.Mesh(barGeo, this.trimMaterial);
      bar.position.set(0.05, 0, side * (doorWidth * 0.28));
      this.doorGroup.add(bar);

      const camGeo = new THREE.TorusGeometry(0.06, 0.012, 8, 16);
      const cam = new THREE.Mesh(camGeo, this.trimMaterial);
      cam.position.set(0.06, doorHeight * 0.3, side * (doorWidth * 0.28));
      this.doorGroup.add(cam);

      const handleGeo = new THREE.BoxGeometry(0.06, 0.16, 0.02);
      const handle = new THREE.Mesh(handleGeo, this.trimMaterial);
      handle.position.set(0.07, doorHeight * 0.3, side * (doorWidth * 0.28 + 0.05));
      this.doorGroup.add(handle);
    }
  }

  _buildCornerCastings() {
    const { length, width, height } = this.dims;
    const castingGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const holeGeo = new THREE.TorusGeometry(0.03, 0.008, 6, 12);

    this.castings = new THREE.Group();
    const xs = [-length / 2 - 0.02, length / 2 + 0.02];
    const ys = [-height / 2 - 0.02, height / 2 + 0.02];
    const zs = [-width / 2 - 0.02, width / 2 + 0.02];

    xs.forEach((x) => {
      ys.forEach((y) => {
        zs.forEach((z) => {
          const casting = new THREE.Mesh(castingGeo, this.trimMaterial);
          casting.position.set(x, y, z);
          this.castings.add(casting);

          const hole = new THREE.Mesh(holeGeo, this.trimMaterial);
          hole.position.set(x, y, z);
          this.castings.add(hole);
        });
      });
    });

    this.group.add(this.castings);
  }

  _buildRoofDetails() {
    const { length, width, height } = this.dims;

    // Roof panel: reuse the corrugation helper oriented flat (ribs run along Z)
    const roofGeo = buildCorrugatedGeometry(width, length, { ribWidth: 0.2, ribDepth: 0.022 });
    roofGeo.rotateX(Math.PI / 2);
    roofGeo.rotateY(Math.PI / 2);
    this.roof = new THREE.Mesh(roofGeo, this.hullMaterial);
    this.roof.position.y = height / 2 + 0.001;
    this.group.add(this.roof);

    // Roof bows (transverse structural ribs visible from below/edge)
    for (let i = -1; i <= 1; i++) {
      const bowGeo = new THREE.BoxGeometry(0.04, 0.03, width - 0.05);
      const bow = new THREE.Mesh(bowGeo, this.trimMaterial);
      bow.position.set(i * (length / 3), height / 2 - 0.02, 0);
      this.group.add(bow);
    }
  }

  _buildFloor() {
    const { length, width } = this.dims;
    const floorTex = buildFloorTexture();
    floorTex.repeat.set(2, 1);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.85,
      metalness: 0.05
    });
    const floorGeo = new THREE.BoxGeometry(length - 0.05, 0.05, width - 0.05);
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.position.y = -this.dims.height / 2 + 0.02;
    this.group.add(this.floor);
  }

  /** Thin additive rim-light shell that traces the hull silhouette. */
  _buildEdgeGlow() {
    const { length, width, height } = this.dims;
    const geo = new THREE.BoxGeometry(length + 0.1, height + 0.1, width + 0.1);
    this.edgeUniforms = {
      uColor: { value: new THREE.Color(0x29d3ff) },
      uIntensity: { value: 0.35 },
      uPower: { value: 3.2 },
      uTime: { value: 0 },
      uPulse: { value: 0 }
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: edgeGlowVertexShader,
      fragmentShader: edgeGlowFragmentShader,
      uniforms: this.edgeUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending
    });
    this.edgeShell = new THREE.Mesh(geo, mat);
    this.group.add(this.edgeShell);
  }

  update(delta, elapsed) {
    this.edgeUniforms.uTime.value = elapsed;
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
