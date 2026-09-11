import { Container } from 'pixi.js';
import { createApp, type PixiApp } from './core/app';
import { GameClock } from './core/clock';
import { showFallbackEndCard } from './core/fallback';
import { computeLayout } from './core/layout';
import { Session } from './core/session';
import { createNetwork, MRAID_NETWORKS } from './network';
import { DebugScene } from './scenes/DebugScene';

function hideLoader(): void {
  const loader = document.getElementById('loader');
  if (!loader) return;
  loader.classList.add('hidden');
  // transitionend never fires if the class lands before the first style pass, so use a timer.
  window.setTimeout(() => loader.remove(), 300);
}

async function boot(): Promise<void> {
  if (import.meta.env.DEV && MRAID_NETWORKS.includes(__NETWORK__)) {
    const { installMraidMock } = await import('./dev/mraidMock');
    installMraidMock();
  }

  // 1. Container ready: now it is safe to read sizes and call the network API.
  const network = createNetwork(__NETWORK__);
  await network.ready();

  const host = document.getElementById('app');
  if (!host) throw new Error('#app element is missing');

  let app: PixiApp;
  try {
    app = await createApp(host);
  } catch (error) {
    showFallbackEndCard(network, `WebGL init failed: ${String(error)}`);
    return;
  }
  app.canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    showFallbackEndCard(network, 'WebGL context lost');
  });

  // 2. Build the first frame while the loader is still visible.
  const clock = new GameClock(app.ticker);
  const session = new Session();
  const root = new Container();
  app.stage.addChild(root);

  const scene = new DebugScene({ network, session, clock });
  root.addChild(scene.view);

  const applySize = (): void => {
    const size = network.getSize();
    app.renderer.resize(size.width, size.height);
    const layout = computeLayout(size);
    root.scale.set(layout.scale);
    scene.resize(layout);
  };
  applySize();
  network.onResize(applySize);

  // Stopping the ticker also freezes GSAP, because GameClock drives it.
  network.onVisibilityChange((visible) => (visible ? app.ticker.start() : app.ticker.stop()));
  session.onTimeout(() => console.info('[session] time limit reached: the end card goes here (day 5)'));

  hideLoader();

  // 3. Ad is on screen: only now animations and gameplay may start.
  await network.viewable();
  scene.start();
}

boot().catch((error: unknown) => console.error('[boot]', error));
