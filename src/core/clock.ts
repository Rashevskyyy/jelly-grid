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

  constructor(ticker: Ticker) {
    gsap.ticker.remove(gsap.updateRoot);
    ticker.add(({ deltaMS }) => {
      const scale = performance.now() < this.frozenUntil ? 0 : this.timeScale;
      this.elapsed += Math.min(deltaMS / 1000, MAX_FRAME_SECONDS) * scale;
      gsap.updateRoot(this.elapsed);
    });
  }

  /** Freeze all tweens for a few real-time milliseconds: the classic impact pause. */
  hitStop(ms: number): void {
    this.frozenUntil = Math.max(this.frozenUntil, performance.now() + ms);
  }

  get seconds(): number {
    return this.elapsed;
  }
}
