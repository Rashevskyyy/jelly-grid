export interface SpringState {
  value: number;
  velocity: number;
}

export interface SpringConfig {
  stiffness: number;
  damping: number;
}

/** Longest integration step. Low frame rates are split into substeps so stiff springs never explode. */
const MAX_STEP = 1 / 120;

/** Damped spring pulling `state.value` towards `target`. Semi-implicit Euler, stable at any frame rate. */
export function stepSpring(state: SpringState, config: SpringConfig, dt: number, target = 0): void {
  if (dt <= 0) return;
  const steps = Math.ceil(dt / MAX_STEP);
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const force = -config.stiffness * (state.value - target) - config.damping * state.velocity;
    state.velocity += force * h;
    state.value += state.velocity * h;
  }
}

export function isAtRest(state: SpringState, target = 0, epsilon = 1e-3): boolean {
  return Math.abs(state.value - target) < epsilon && Math.abs(state.velocity) < epsilon;
}
