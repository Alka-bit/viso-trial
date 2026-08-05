import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import gsap from 'gsap';

import { Camera } from './Camera.js';
import { Lights } from './Lights.js';
import { Environment } from './Environment.js';
import { Container } from '../components/Container.js';
import { ScanBeam } from '../components/ScanBeam.js';
import { DamageSystem } from '../components/DamageSystem.js';
import { OCRSystem } from '../components/OCRSystem.js';
import { DigitalTwin } from '../components/DigitalTwin.js';
import { ParticleSystem } from '../components/ParticleSystem.js';
import { PostProcessing } from '../utils/PostProcessing.js';
import { MouseTracker } from '../utils/MouseTracker.js';
import { AssetLoader } from '../utils/AssetLoader.js';

export class SceneManager {
  constructor({ canvas, labelLayer, hud }) {
    this.canvas = canvas;
    this.hud = hud;
    this.clock = new THREE.Clock();
    this.size = { width: window.innerWidth, height: window.innerHeight };

    this._initRenderer();
    this._initCSS2D(labelLayer);

    this.scene = new THREE.Scene();
    this.cameraRig = new Camera(this.size);
    this.mouse = new MouseTracker();

    this.lights = new Lights(this.scene);
    this.environment = new Environment(this.scene);
    this.container = new Container();
    this.scene.add(this.container.group);

    this.scanBeam = new ScanBeam(this.container);
    this.damageSystem = new DamageSystem(this.container, labelLayer);
    this.ocrSystem = new OCRSystem(this.container);
    this.digitalTwin = new DigitalTwin(this.container);
    this.particles = new ParticleSystem(this.container);

    this.damageSystem.onBurst = this.particles.emitBurst;
    this.scanBeam.onAnchorPass = (x, triggered) => {
      this.damageSystem.handleScanPass(x, triggered);
      this.ocrSystem.handleScanPass(x);
    };
    this.scanBeam.onScanStart = () => {
      this.hud.setScanning(true);
      this.hud.setConfidence(0);
      this.hud.logEntry('Scan cycle initiated', 'ok');
      this.environment.triggerPulse();
      this._animateConfidence();
    };
    this.scanBeam.onScanEnd = () => {
      this.hud.setScanning(false);
      this.hud.logEntry('Scan cycle complete — 8 regions graded', 'ok');
    };
    this.digitalTwin.onModeChange = (label) => {
      if (!this.scanBeam.active) this.hud.setMode(label);
      if (label !== 'SURFACE SCAN') {
        this.hud.logEntry(`Digital twin → ${label.toLowerCase()}`, 'warn');
      }
    };

    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.cameraRig.instance, this.size);

    this._initRaycast();
    this._bindResize();

    this.floatT = 0;
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // SMAA handles AA in the composer
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.size.width, this.size.height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _initCSS2D(labelLayer) {
    this.labelRenderer = new CSS2DRenderer({ element: labelLayer });
    this.labelRenderer.setSize(this.size.width, this.size.height);
  }

  async loadEnvironment() {
    const assetLoader = new AssetLoader(this.renderer);
    const envMap = await assetLoader.loadEnvironment();
    this.environment.applyEnvMap(envMap);
    assetLoader.dispose();
  }

  playIntro() {
    this.cameraRig.playIntro();
  }

  _animateConfidence() {
    const proxy = { v: 0 };
    gsap.to(proxy, {
      v: 92 + Math.random() * 7,
      duration: 2.2,
      ease: 'power2.out',
      onUpdate: () => this.hud.setConfidence(proxy.v)
    });
  }

  _initRaycast() {
    this.raycaster = new THREE.Raycaster();
    this.pointerNDC = new THREE.Vector2(10, 10);
    this._focused = false;

    window.addEventListener('pointermove', (e) => {
      this.pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('click', () => {
      this.raycaster.setFromCamera(this.pointerNDC, this.cameraRig.instance);
      const hits = this.raycaster.intersectObjects(
        this.damageSystem.markers.filter((m) => m.visible).map((m) => m.ring),
        false
      );
      if (hits.length > 0) {
        const worldPos = new THREE.Vector3();
        hits[0].object.getWorldPosition(worldPos);
        this.cameraRig.focusOn(worldPos);
        this._focused = true;
      } else if (this._focused) {
        this.cameraRig.resetFocus();
        this._focused = false;
      }
    });
  }

  _bindResize() {
    window.addEventListener('resize', () => {
      this.size.width = window.innerWidth;
      this.size.height = window.innerHeight;

      this.renderer.setSize(this.size.width, this.size.height);
      this.labelRenderer.setSize(this.size.width, this.size.height);
      this.cameraRig.resize(this.size);
      this.postProcessing.setSize(this.size.width, this.size.height);
    });
  }

  start() {
    this.renderer.setAnimationLoop(() => this._tick());
  }

  _tick() {
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    // Slow continuous rotation — ~1 revolution per 20s — plus gentle float
    this.container.group.rotation.y += delta * (Math.PI * 2) / 20;
    this.floatT += delta;
    this.container.group.position.y = 0.05 + Math.sin(this.floatT * 0.6) * 0.05;

    this.mouse.update();
    this.cameraRig.update(this.mouse.current);

    this.environment.update(delta);
    this.container.update(delta, elapsed);
    this.scanBeam.update(delta, elapsed);
    this.damageSystem.update(delta, elapsed);
    this.digitalTwin.update(delta, elapsed);
    this.particles.update(delta);

    this.postProcessing.render(delta);
    this.labelRenderer.render(this.scene, this.cameraRig.instance);
  }

  dispose() {
    this.mouse.dispose();
    this.lights.dispose();
    this.environment.dispose();
    this.container.dispose();
    this.scanBeam.dispose();
    this.damageSystem.dispose();
    this.ocrSystem.dispose();
    this.digitalTwin.dispose();
    this.particles.dispose();
    this.postProcessing.dispose();
    this.renderer.dispose();
  }
}
