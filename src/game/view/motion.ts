import type { PointData } from 'pixi.js';

/** Point on a quadratic Bézier curve. Writes into `out` to avoid allocating every frame. */
export function quadraticBezier(from: PointData, control: PointData, to: PointData, t: number, out: { x: number; y: number }) {
  const u = 1 - t;
  out.x = u * u * from.x + 2 * u * t * control.x + t * t * to.x;
  out.y = u * u * from.y + 2 * u * t * control.y + t * t * to.y;
  return out;
}

export interface ShakeConfig {
  /** Offset in design units at full trauma. */
  maxOffset: number;
  /** Rotation in radians at full trauma. */
  maxRotation: number;
  /** Trauma lost per second. */
  decayPerSecond: number;
  /** How fast the shake jitters. */
  frequency: number;
}

export interface ShakeState {
  trauma: number;
  time: number;
}

export interface ShakeOffset {
  x: number;
  y: number;
  rotation: number;
}

export function addTrauma(state: ShakeState, amount: number): void {
  state.trauma = Math.min(1, state.trauma + amount);
}

/**
 * Trauma-based screen shake: intensity is trauma squared, so small hits barely move the screen
 * while big combos really kick. Smooth layered sines instead of random jumps keep it readable.
 */
export function stepShake(state: ShakeState, config: ShakeConfig, dt: number): ShakeOffset {
  state.time += dt;
  state.trauma = Math.max(0, state.trauma - config.decayPerSecond * dt);
  const power = state.trauma * state.trauma;
  const t = state.time * config.frequency;
  return {
    x: config.maxOffset * power * smoothNoise(t, 1),
    y: config.maxOffset * power * smoothNoise(t, 2),
    rotation: config.maxRotation * power * smoothNoise(t, 3),
  };
}

/** Deterministic pseudo-noise in [-1, 1]. */
export function smoothNoise(t: number, seed: number): number {
  return (
    Math.sin(t + seed * 12.9898) * 0.5 +
    Math.sin(t * 2.31 + seed * 78.233) * 0.3 +
    Math.sin(t * 4.17 + seed * 37.719) * 0.2
  );
}
