import { SESSION } from '../config';

/**
 * Tracks the rules every network shares: the timer starts on the first interaction,
 * and the very first tap must never leave the ad.
 */
export class Session {
  private taps = 0;
  private startedAt: number | null = null;
  private readonly startListeners: Array<() => void> = [];
  private timeoutId: number | undefined;

  constructor(target: EventTarget = window) {
    // Capture phase: counted before any game object handles the same pointer event.
    target.addEventListener('pointerdown', () => this.onTap(), { capture: true });
  }

  /** Runs once, on the first pointerdown. Unlock audio and start timers here. */
  onStart(listener: () => void): void {
    if (this.started) listener();
    else this.startListeners.push(listener);
  }

  /** Calls `listener` when the session time limit is reached. */
  onTimeout(listener: () => void): void {
    this.onStart(() => {
      this.timeoutId = window.setTimeout(listener, SESSION.maxSeconds * 1000);
    });
  }

  cancelTimeout(): void {
    window.clearTimeout(this.timeoutId);
  }

  get started(): boolean {
    return this.startedAt !== null;
  }

  /** False during the gesture that started the session, true afterwards. */
  get canOpenStore(): boolean {
    return this.taps >= 2;
  }

  private onTap(): void {
    this.taps += 1;
    if (this.startedAt !== null) return;
    this.startedAt = performance.now();
    this.startListeners.splice(0).forEach((listener) => listener());
  }
}
