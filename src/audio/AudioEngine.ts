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
 * - no AudioContext exists until the first user gesture (`unlock`), so nothing can play before interaction;
 * - `setActive(false)` suspends the context when the ad is hidden or closed.
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private active = true;
  private readonly lastPlayed = new Map<string, number>();

  /** Call from inside a user gesture. Safe to call repeatedly. */
  unlock(): void {
    if (!this.context) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.context.destination);
    }
    if (this.active && this.context.state !== 'running') void this.context.resume();
  }

  setActive(active: boolean): void {
    this.active = active;
    if (!this.context) return;
    if (active) void this.context.resume();
    else void this.context.suspend();
  }

  get ready(): boolean {
    return this.context?.state === 'running' && this.active;
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
