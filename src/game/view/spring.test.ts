import { describe, expect, it } from 'vitest';
import { isAtRest, stepSpring, type SpringState } from './spring';
import { JELLY_SQUASH } from './jellyTuning';

function simulate(state: SpringState, seconds: number, fps: number, target = 0): number[] {
  const samples: number[] = [];
  const frames = Math.round(seconds * fps); // integer frame count: accumulating 1/fps drifts
  for (let frame = 0; frame < frames; frame++) {
    stepSpring(state, JELLY_SQUASH, 1 / fps, target);
    samples.push(state.value);
  }
  return samples;
}

describe('stepSpring', () => {
  it('overshoots at least twice before settling: that wobble is the jelly', () => {
    const samples = simulate({ value: 0, velocity: 4.5 }, 2, 60);
    const signChanges = samples.slice(1).filter((value, i) => Math.sign(value) !== Math.sign(samples[i])).length;
    expect(signChanges).toBeGreaterThanOrEqual(3);
  });

  it('is visually settled within a second: under 1% squash left', () => {
    const state = { value: 0, velocity: 4.5 };
    const samples = simulate(state, 1, 60);
    expect(Math.max(...samples.slice(-6).map(Math.abs))).toBeLessThan(0.01);
  });

  it('reports rest once motion is gone', () => {
    const state = { value: 0, velocity: 4.5 };
    expect(isAtRest(state)).toBe(false);
    simulate(state, 3, 60);
    expect(isAtRest(state)).toBe(true);
  });

  it('gives the same motion at 20 fps as at 120 fps', () => {
    const slow = { value: 0, velocity: 4.5 };
    const fast = { value: 0, velocity: 4.5 };
    simulate(slow, 0.5, 20);
    simulate(fast, 0.5, 120);
    expect(slow.value).toBeCloseTo(fast.value, 2);
  });

  it('does not explode on a long frame', () => {
    const state = { value: 0, velocity: 4.5 };
    stepSpring(state, JELLY_SQUASH, 0.5);
    expect(Math.abs(state.value)).toBeLessThan(1);
  });

  it('settles on a non-zero target', () => {
    const state = { value: 0, velocity: 0 };
    simulate(state, 2, 60, 0.3);
    expect(state.value).toBeCloseTo(0.3, 3);
  });
});
