# Visotonics — AI Container Inspection Hero

A premium, self-contained Vite + Three.js hero experience for Visotonics, a
computer-vision platform for container inspection. Built with zero binary
asset dependencies — the hull paint, corrosion, floor wood-grain, HDR
environment, and container markings are all generated procedurally at
runtime via canvas textures and `PMREMGenerator`, so the repo is pure code.

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build to /dist
npm run preview   # serve the production build locally
```

Requires Node 18+.

## What it does

- A procedurally modeled 20ft shipping container (corrugated walls extruded
  from a zigzag profile, doors with hinges/locking bars/cam handles, corner
  castings, roof bows, plywood floor) floats and slowly rotates (~20s per
  revolution) above a dark industrial platform.
- Every 6 seconds a cyan **AI scan beam** sweeps the length of the container.
  As it passes each procedurally placed damage anchor, a glowing marker
  appears with an animated confidence readout (dent, crack, corrosion, bent
  rail, roof damage, panel bow, broken locking bar, missing handle), and a
  burst of GPU-style particles streams from the damage site to a floating
  AI core.
- As the beam reaches the door end, the **OCR system** reveals the
  container's stenciled markings (owner code, size/type, gross/tare weight,
  manufacture date) as holographic `CSS2DRenderer` labels connected to the
  hull with thin leader lines.
- Every 12 seconds the hull cycles through a **digital twin** transition —
  real PBR material → wireframe → point cloud → projected grid → back to
  real — driven entirely by a single custom GLSL shader.
- Mouse movement drives a subtle camera parallax; clicking an active damage
  marker dollies the camera in and expands its detail.

## Project structure

```
index.html            Hero markup, HUD panel shells, loading screen, ticker
style.css              Design tokens, layout, HUD/loading/nav styling
src/
  main.js              Boot sequence: loading screen → scene → HUD wiring
  scene/
    SceneManager.js     Renderer, CSS2D layer, composition root, render loop
    Camera.js           Cinematic intro dolly + mouse parallax + focus tweens
    Lights.js           Key / rim / AI-accent / ambient lighting rig
    Environment.js      Fog, infinite shader grid, platform, volumetric beam
  components/
    Container.js        Procedural corrugated hull, doors, castings, floor
    ScanBeam.js          Periodic sweep controller + anchor-pass events
    DamageSystem.js      Damage markers, CSS2D labels, confidence animation
    OCRSystem.js         Marking extraction labels + leader lines
    DigitalTwin.js       Real ↔ wireframe ↔ point-cloud ↔ grid shader cycle
    ParticleSystem.js    GPU-style data-stream particles → AI core
  shaders/               Hand-written GLSL for beam, fresnel glow, dissolve,
                          grid and particle-point rendering
  utils/
    AssetLoader.js       PMREM environment + GLTF/DRACO pipeline (unused by
                          default; wired for swapping in a scanned mesh)
    ProceduralTextures.js Canvas-based hull paint, roughness, floor, markings
    PostProcessing.js    EffectComposer: bloom → SMAA → output/tone-map
    MouseTracker.js      Damped pointer tracking
    MathUtils.js         Small numeric helpers + barycentric attribute builder
  ui/
    LoadingScreen.js     Progress bar + status line sequencing
    HUD.js               Bridges scene events to the DOM HUD overlay
```

## Notes on the "no binary assets" approach

The brief calls for HDR lighting, PBR materials with scratches/edge wear,
and a highly detailed container — all of that is here, just generated in
code rather than shipped as `.hdr`/`.jpg` files:

- **Environment lighting** uses Three's `RoomEnvironment` fed through
  `PMREMGenerator`, giving physically plausible IBL reflections without a
  network fetch.
- **Hull paint, roughness and corrosion** are drawn onto `<canvas>` at
  startup (see `ProceduralTextures.js`) and used as `map` / `roughnessMap`.
- `AssetLoader.js` still wires up `GLTFLoader` + `DRACOLoader` so a team
  with a real scanned container mesh can drop in a URL and swap the
  procedural hull for it without touching the rest of the scene.

## Performance

- Post-processing is a single composer chain (Render → Bloom → SMAA →
  Output); MSAA is disabled on the renderer since SMAA handles edges.
- Particles are a single `THREE.Points` draw call with CPU-updated
  attributes (360 particles max) rather than per-particle objects.
- Geometry is built once at startup; only uniforms and a handful of
  transform properties change per frame.
