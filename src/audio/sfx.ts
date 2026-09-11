import type { AudioEngine } from './AudioEngine';

/** Major pentatonic from C5: any subset sounds pleasant, so combos can climb it freely. */
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

/** ±3% pitch variation, so repeated sounds don't feel mechanical. */
const vary = (frequency: number) => frequency * (0.97 + Math.random() * 0.06);

/** Every sound in the game, designed in one place. */
export class Sfx {
  private readonly audio: AudioEngine;

  constructor(audio: AudioEngine) {
    this.audio = audio;
  }

  pickUp(): void {
    this.audio.tone('pickUp', { type: 'sine', from: vary(520), to: 820, duration: 0.09, volume: 0.22 });
  }

  land(): void {
    this.audio.tone('land', { type: 'triangle', from: vary(240), to: 90, duration: 0.14, volume: 0.35 });
  }

  bounceBack(): void {
    this.audio.tone('bounceBack', { type: 'triangle', from: vary(200), to: 150, duration: 0.18, volume: 0.2 });
  }

  /** @param index position in the pop order: later pops go slightly higher */
  pop(index: number): void {
    const base = 620 + Math.min(index, 24) * 22;
    this.audio.tone('pop', { type: 'triangle', from: vary(base), to: base * 0.45, duration: 0.07, volume: 0.13 }, 0.03);
  }

  /** @param fill jar level 0..1: the jar sings higher as it fills */
  collect(fill: number): void {
    const frequency = 900 + fill * 900;
    this.audio.tone('collect', { type: 'sine', from: vary(frequency), to: frequency * 1.04, duration: 0.1, volume: 0.1 }, 0.04);
  }

  /** Rising arpeggio: one note per cleared line, plus one. */
  combo(lines: number): void {
    for (let note = 0; note <= Math.min(lines, 4); note++) {
      const frequency = SCALE[note * 2] ?? SCALE[SCALE.length - 1];
      this.audio.tone(`combo${note}`, { type: 'triangle', from: frequency, duration: 0.22, volume: 0.16, delay: note * 0.07 });
    }
  }

  win(): void {
    [0, 2, 4, 5, 7].forEach((step, note) => {
      this.audio.tone(`win${note}`, {
        type: 'triangle',
        from: SCALE[step],
        duration: note === 4 ? 0.6 : 0.18,
        volume: 0.18,
        delay: note * 0.09,
      });
    });
  }

  lose(): void {
    [4, 2, 0].forEach((step, note) => {
      this.audio.tone(`lose${note}`, { type: 'sine', from: SCALE[step], to: SCALE[step] * 0.97, duration: 0.28, volume: 0.15, delay: note * 0.14 });
    });
  }
}
