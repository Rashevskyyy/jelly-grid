import type { ShakeConfig } from './motion';
import type { SpringConfig } from './spring';

/**
 * Every feel number in one place. Changing these is how the game gets tuned,
 * so they live apart from the code that uses them.
 */

/** Width-vs-height squash. Low damping ratio (~0.28) gives a few visible wobbles. */
export const JELLY_SQUASH: SpringConfig = { stiffness: 260, damping: 9 };

/** Vertical hop of a block, in design units. Settles faster than the squash. */
export const JELLY_HOP: SpringConfig = { stiffness: 320, damping: 16 };

/** Tilt of a dragged piece lagging behind the finger. */
export const DRAG_TILT: SpringConfig = { stiffness: 120, damping: 11 };

export const IMPULSE = {
  /** Picked up from the tray: stretch tall. */
  pickUp: { squash: -2.6, hop: 0 },
  /** Landed on the board: splat wide. */
  land: { squash: 4.6, hop: 0 },
  /** Bounced back to the tray after an invalid drop. */
  bounceBack: { squash: 3, hop: 0 },
  /** Neighbours of a landing, scaled down with distance. */
  ripple: { squash: -2.4, hop: -460 },
} as const;

/** Grid distance a landing ripple travels, and its delay per cell in seconds. */
export const RIPPLE_RADIUS = 3.5;
export const RIPPLE_DELAY_PER_CELL = 0.065;

/** Radians of tilt per design unit per second of horizontal drag speed, and the tilt limit. */
export const DRAG_TILT_PER_SPEED = 0.00035;
export const DRAG_TILT_MAX = 0.3;

/** How far pupils travel inside the eye, and how quickly they catch up with the target (1/s). */
export const PUPIL_REACH = 4.5;
export const PUPIL_FOLLOW_RATE = 16;

/** Seconds between a landing and its cleared lines popping, so the splat reads first. */
export const CLEAR_DELAY = 0.18;

/** Average seconds between blinks somewhere on screen. */
export const BLINK_INTERVAL = 0.35;

/** Jar fill level sloshes towards its target; the jar body squashes when particles land in it. */
export const JAR_LEVEL: SpringConfig = { stiffness: 90, damping: 9 };
export const JAR_SQUASH: SpringConfig = { stiffness: 220, damping: 10 };
export const JAR_BUMP = 0.9;
export const JAR_CELEBRATE = 6;

/** Cleared blocks fly to the jar as particles along a random arc. */
export const FLIGHT = {
  duration: 0.5,
  durationJitter: 0.15,
  /** Seconds between consecutive particles, in the same ripple order as the pop. */
  stagger: 0.012,
  arcMin: 140,
  arcMax: 300,
  /** Sideways randomness of the arc's control point, in design units. */
  spread: 160,
  startScale: 0.42,
  endScale: 0.2,
  maxSpin: 6,
} as const;

export const SHAKE: ShakeConfig = { maxOffset: 22, maxRotation: 0.025, decayPerSecond: 1.8, frequency: 32 };

/** What a move clearing N lines feels like. The last entry covers anything bigger. */
export const COMBO = [
  { lines: 1, label: 'Sweet!', trauma: 0.4, hitStopMs: 0 },
  { lines: 2, label: 'Double!', trauma: 0.6, hitStopMs: 70 },
  { lines: 3, label: 'Triple!', trauma: 0.85, hitStopMs: 120 },
  { lines: 4, label: 'Unreal!', trauma: 1, hitStopMs: 150 },
] as const;

export function comboFor(lines: number): (typeof COMBO)[number] {
  return COMBO[Math.min(lines, COMBO.length) - 1];
}

/** Seconds the board keeps looking at the jar after a clear, following the particles. */
export const WATCH_JAR_SECONDS = 1.1;
