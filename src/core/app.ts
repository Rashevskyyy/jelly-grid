// Only the Pixi features this playable uses. The rest is stubbed out at build time (build/pixiLean.ts).
import 'pixi.js/events';
import 'pixi.js/graphics';
import 'pixi.js/text';
import { Container, Ticker, UPDATE_PRIORITY, WebGLRenderer } from 'pixi.js';
import { THEME } from '../config';

export interface PixiApp {
  readonly renderer: WebGLRenderer;
  readonly stage: Container;
  readonly ticker: Ticker;
  readonly canvas: HTMLCanvasElement;
}

/**
 * A lean stand-in for `Application`. Creating the WebGL renderer directly skips
 * `autoDetectRenderer`, so the WebGPU and Canvas renderers never enter the bundle.
 */
export async function createApp(host: HTMLElement): Promise<PixiApp> {
  const renderer = new WebGLRenderer();
  await renderer.init({
    skipExtensionImports: true,
    antialias: false,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2), // 3x screens cost fill-rate for no visible gain
    background: THEME.background,
    powerPreference: 'high-performance',
  });

  const stage = new Container();
  const ticker = new Ticker();
  // LOW priority: game logic and GSAP (NORMAL) update first, then we draw the frame.
  ticker.add(() => renderer.render(stage), undefined, UPDATE_PRIORITY.LOW);
  ticker.start();

  host.appendChild(renderer.canvas);
  return { renderer, stage, ticker, canvas: renderer.canvas };
}
