import { gsap } from 'gsap';
import type { Ticker } from 'pixi.js';

/** Longest frame we accept. Longer gaps (tab switch, GC pause) don't fast-forward animations. */
const MAX_FRAME_SECONDS = 0.1;

/**
 * One loop for rendering and tweens: GSAP is driven by the Pixi ticker instead of its own rAF.
 * Stopping the ticker pauses everything, and `timeScale` gives us global slow-mo and hit-stop.
 */
export class GameClock {
  /** 1 = normal speed, 0 = frozen (hit-stop), 0.3 = slow-mo. */
  timeScale = 1;
  private elapsed = 0;
  private frozenUntil = 0;
  private readonly listeners: Array<(dt: number) => void> = [];

  constructor(ticker: Ticker) {
    gsap.ticker.remove(gsap.updateRoot);
    ticker.add(({ deltaMS }) => {
      const scale = performance.now() < this.frozenUntil ? 0 : this.timeScale;
      const dt = Math.min(deltaMS / 1000, MAX_FRAME_SECONDS) * scale;
      this.elapsed += dt;
      gsap.updateRoot(this.elapsed);
      for (const listener of this.listeners) listener(dt);
    });
  }

  /** Per-frame game-time delta in seconds. Frozen by hit-stop and slowed by `timeScale`, like the tweens. */
  onUpdate(listener: (dt: number) => void): void {
    this.listeners.push(listener);
  }

  /** Freeze all tweens for a few real-time milliseconds: the classic impact pause. */
  hitStop(ms: number): void {
    this.frozenUntil = Math.max(this.frozenUntil, performance.now() + ms);
  }

  get seconds(): number {
    return this.elapsed;
  }
}
