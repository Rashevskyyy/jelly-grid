export interface ToneOptions {
  type?: OscillatorType;
  /** Start and end frequency in Hz; the pitch glides exponentially between them. */
  from: number;
  to?: number;
  /** Seconds. */
  duration: number;
  volume: number;
  attack?: number;
  /** Seconds from now. */
  delay?: number;
}

/**
 * Tiny Web Audio synth. Every sound is generated, so audio adds no bytes to the build.
 *
 * Ad network rules it enforces:
 * - no AudioContext exists until the first user gesture, so nothing can play before interaction;
 * - `setActive(false)` suspends the context when the ad is hidden or closed.
 *
 * Mobile quirks it survives:
 * - touch browsers only count pointerup/touchend/click as a gesture that may start audio, not pointerdown;
 * - iOS only fully unlocks if something actually plays inside that gesture (a one-sample silent buffer);
 * - iOS moves the context to "interrupted" after app switches, calls or the notification shade, and only a new
 *   gesture brings it back. So `attachUnlock` keeps listening for the whole session, not just once.
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private active = true;
  private readonly lastPlayed = new Map<string, number>();

  /** Listens for gestures for the whole session and (re)unlocks audio whenever it isn't running. */
  attachUnlock(target: EventTarget = window): void {
    const onGesture = (event: Event) => {
      // A mouse press is a valid gesture everywhere; a touch press is not, its release is.
      if (event.type === 'pointerdown' && (event as PointerEvent).pointerType !== 'mouse') return;
      this.unlock();
    };
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
      target.addEventListener(type, onGesture, { capture: true, passive: true });
    }
  }

  /** Must run inside a user gesture. Cheap when audio is already running. */
  unlock(): void {
    if (!this.active) return;
    if (!this.context) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.context.destination);
    }
    // "interrupted" is an iOS-only state missing from the TypeScript union, hence the string comparison.
    if ((this.context.state as string) === 'running') return;
    void this.context.resume().catch(() => undefined);
    this.playSilence();
  }

  setActive(active: boolean): void {
    this.active = active;
    if (!this.context) return;
    // Resuming here can fail outside a gesture on iOS; the next tap retries through attachUnlock.
    if (active) void this.context.resume().catch(() => undefined);
    else void this.context.suspend().catch(() => undefined);
  }

  get ready(): boolean {
    return this.context?.state === 'running' && this.active;
  }

  private playSilence(): void {
    const context = this.context;
    if (!context) return;
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 1, 22050);
    source.connect(context.destination);
    source.start(0);
  }

  /**
   * Plays a tone unless the same `key` played less than `minGap` seconds ago.
   * Throttling keeps a 24-particle burst from turning into noise.
   */
  tone(key: string, options: ToneOptions, minGap = 0): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || !this.ready) return;

    const now = context.currentTime;
    if (minGap > 0) {
      const last = this.lastPlayed.get(key) ?? -Infinity;
      if (now - last < minGap) return;
      this.lastPlayed.set(key, now);
    }

    const { type = 'sine', from, to = from, duration, volume, attack = 0.005, delay = 0 } = options;
    const start = now + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02); // stopped nodes are garbage collected
  }
}
