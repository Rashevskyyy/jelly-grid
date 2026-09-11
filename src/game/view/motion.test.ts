import { describe, expect, it } from 'vitest';
import { addTrauma, quadraticBezier, smoothNoise, stepShake, type ShakeConfig } from './motion';

const SHAKE: ShakeConfig = { maxOffset: 20, maxRotation: 0.02, decayPerSecond: 1.5, frequency: 30 };

describe('quadraticBezier', () => {
  const from = { x: 0, y: 100 };
  const control = { x: 50, y: -100 };
  const to = { x: 100, y: 100 };

  it('starts and ends on the endpoints', () => {
    expect(quadraticBezier(from, control, to, 0, { x: 0, y: 0 })).toEqual(from);
    expect(quadraticBezier(from, control, to, 1, { x: 0, y: 0 })).toEqual(to);
  });

  it('bends towards the control point', () => {
    const mid = quadraticBezier(from, control, to, 0.5, { x: 0, y: 0 });
    expect(mid.x).toBeCloseTo(50);
    expect(mid.y).toBeCloseTo(0); // halfway between the endpoints' 100 and the control's -100
  });
});

describe('screen shake', () => {
  it('does not move without trauma', () => {
    const offset = stepShake({ trauma: 0, time: 1.23 }, SHAKE, 1 / 60);
    // toBeCloseTo, not toEqual: zero times a negative noise sample is -0, which Object.is tells apart from 0
    expect(offset.x).toBeCloseTo(0);
    expect(offset.y).toBeCloseTo(0);
    expect(offset.rotation).toBeCloseTo(0);
  });

  it('never exceeds the configured limits', () => {
    const state = { trauma: 1, time: 0 };
    for (let frame = 0; frame < 120; frame++) {
      addTrauma(state, 1);
      const offset = stepShake(state, SHAKE, 1 / 60);
      expect(Math.abs(offset.x)).toBeLessThanOrEqual(SHAKE.maxOffset);
      expect(Math.abs(offset.rotation)).toBeLessThanOrEqual(SHAKE.maxRotation);
    }
  });

  it('fades out on its own', () => {
    const state = { trauma: 0.8, time: 0 };
    for (let frame = 0; frame < 60; frame++) stepShake(state, SHAKE, 1 / 60);
    expect(state.trauma).toBe(0);
  });

  it('squares trauma: half the trauma is a quarter of the kick', () => {
    const peak = (trauma: number) => {
      let max = 0;
      for (let frame = 0; frame < 200; frame++) {
        const offset = stepShake({ trauma, time: frame / 60 }, { ...SHAKE, decayPerSecond: 0 }, 0);
        max = Math.max(max, Math.abs(offset.x));
      }
      return max;
    };
    expect(peak(0.5) / peak(1)).toBeCloseTo(0.25, 2);
  });

  it('keeps noise inside [-1, 1]', () => {
    for (let t = 0; t < 50; t += 0.37) expect(Math.abs(smoothNoise(t, 3))).toBeLessThanOrEqual(1);
  });
});
