import type { Container } from 'pixi.js';
import type { Layout } from '../core/layout';

export interface Scene {
  readonly view: Container;
  /** Called on start and on every resize or orientation change. */
  resize(layout: Layout): void;
  /** Called once the ad is viewable. Nothing animates or counts down before this. */
  start(): void;
}
