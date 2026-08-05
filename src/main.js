import { SceneManager } from './scene/SceneManager.js';
import { LoadingScreen } from './ui/LoadingScreen.js';
import { HUD } from './ui/HUD.js';

async function bootstrap() {
  const canvas = document.getElementById('scene-canvas');
  const labelLayer = document.getElementById('label-layer');

  const loadingScreen = new LoadingScreen();
  const hud = new HUD();

  loadingScreen.setProgress(0.15);

  const sceneManager = new SceneManager({ canvas, labelLayer, hud });
  loadingScreen.setProgress(0.45);

  await sceneManager.loadEnvironment();
  loadingScreen.setProgress(0.85);

  // brief settle so the status text sequence reads as intentional, not instant
  await new Promise((resolve) => setTimeout(resolve, 350));
  loadingScreen.finish();

  hud.logEntry('Optical array online', 'ok');
  hud.logEntry('Container MSKU 128773 4 loaded', 'ok');

  sceneManager.start();
  sceneManager.playIntro();

  wireHeroActions(sceneManager);
}

function wireHeroActions(sceneManager) {
  const primaryBtn = document.querySelector('.btn-primary');
  if (primaryBtn) {
    primaryBtn.addEventListener('click', () => {
      sceneManager.scanBeam.timeSinceLastScan = 999; // force a scan on demand
    });
  }
}

bootstrap();
