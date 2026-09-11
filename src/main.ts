import { Container } from 'pixi.js';
import { AudioEngine } from './audio/AudioEngine';
import { Sfx } from './audio/sfx';
import { createApp, type PixiApp } from './core/app';
import { GameClock } from './core/clock';
import { showFallbackEndCard } from './core/fallback';
import { loadFonts } from './core/fonts';
import { computeLayout } from './core/layout';
import { Session } from './core/session';
import { createNetwork, usesMraid } from './network';
import { GameScene } from './scenes/GameScene';

// Boot phases as Performance marks: visible in DevTools' Performance panel on a real device.
performance.mark('jelly:script-start');

function hideLoader(): void {
  const loader = document.getElementById('loader');
  if (!loader) return;
  loader.classList.add('hidden');
  // transitionend never fires if the class lands before the first style pass, so use a timer.
  window.setTimeout(() => loader.remove(), 300);
}

async function boot(): Promise<void> {
  if (import.meta.env.DEV && usesMraid()) {
    const { installMraidMock } = await import('./dev/mraidMock');
    installMraidMock();
  }

  // 1. Container ready: now it is safe to read sizes and call the network API.
  const network = createNetwork();
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
  performance.mark('jelly:renderer-ready');
  app.canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    showFallbackEndCard(network, 'WebGL context lost');
  });

  // 2. Build the first frame while the loader is still visible. Text needs the font first.
  await loadFonts();
  const clock = new GameClock(app.ticker);
  const session = new Session();

  // Sound exists only after the first gesture and re-unlocks on any later gesture (see AudioEngine).
  const audio = new AudioEngine();
  audio.attachUnlock();
  const root = new Container();
  app.stage.addChild(root);

  const scene = new GameScene({ network, session, clock, renderer: app.renderer, sfx: new Sfx(audio) });
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
  network.onVisibilityChange((visible) => {
    if (visible) app.ticker.start();
    else app.ticker.stop();
    audio.setActive(visible); // networks require silence when the ad is hidden or closed
  });

  hideLoader();
  performance.mark('jelly:first-frame-built');

  // 3. Ad is on screen: only now animations and gameplay may start.
  await network.viewable();
  scene.start();
  performance.mark('jelly:interactive');

  // Constant-false in ad builds, so the bundler drops the overlay from them entirely.
  if (__NETWORK__ === 'web' && new URLSearchParams(location.search).has('debug')) {
    const { mountDebugOverlay } = await import('./core/debugOverlay');
    mountDebugOverlay(app.ticker);
  }
}

boot().catch((error: unknown) => console.error('[boot]', error));
