import { gsap } from 'gsap';
import { Container, Sprite, type PointData } from 'pixi.js';
import type { ColorId } from '../model/types';
import { FLIGHT } from './jellyTuning';
import { quadraticBezier } from './motion';
import type { GameTextures } from './textures';

export interface FlightRequest {
  /** Launch point in the coordinates of this view's parent. */
  from: PointData;
  color: ColorId;
  /** Seconds before this particle takes off. */
  delay: number;
}

/**
 * Cleared blocks fly to the jar. Sprites come from a pool, so a big combo allocates nothing mid-game.
 * The target is a function: if the screen rotates mid-flight, particles still land in the jar.
 */
export class ParticleFlight {
  readonly view = new Container();
  private readonly textures: GameTextures;
  private readonly pool: Sprite[] = [];
  private readonly point = { x: 0, y: 0 };

  constructor(textures: GameTextures) {
    this.textures = textures;
    this.view.eventMode = 'none';
  }

  /** Calls `onArrive` once per landed particle. Returns seconds until the last one lands. */
  launch(requests: readonly FlightRequest[], target: () => PointData, onArrive: () => void): number {
    let lastLanding = 0;
    for (const { from, color, delay } of requests) {
      const sprite = this.pool.pop() ?? new Sprite({ anchor: 0.5 });
      sprite.texture = this.textures.blocks[color];
      sprite.position.copyFrom(from);
      sprite.scale.set(0);
      sprite.rotation = 0;
      this.view.addChild(sprite);

      const duration = FLIGHT.duration + Math.random() * FLIGHT.durationJitter;
      const sideways = (Math.random() * 2 - 1) * FLIGHT.spread;
      const arc = FLIGHT.arcMin + Math.random() * (FLIGHT.arcMax - FLIGHT.arcMin);
      const spin = (Math.random() * 2 - 1) * FLIGHT.maxSpin;
      const progress = { t: 0 };
      const control = { x: 0, y: 0 };

      gsap
        .timeline({ delay })
        .to(sprite.scale, { x: FLIGHT.startScale, y: FLIGHT.startScale, duration: 0.08, ease: 'back.out(3)' })
        .to(progress, {
          t: 1,
          duration,
          ease: 'power2.in', // slow take-off, then sucked into the jar
          onUpdate: () => {
            const to = target();
            control.x = (from.x + to.x) / 2 + sideways;
            control.y = Math.min(from.y, to.y) - arc;
            const { x, y } = quadraticBezier(from, control, to, progress.t, this.point);
            sprite.position.set(x, y);
            sprite.scale.set(FLIGHT.startScale + (FLIGHT.endScale - FLIGHT.startScale) * progress.t);
            sprite.rotation = spin * progress.t;
          },
          onComplete: () => {
            this.view.removeChild(sprite);
            this.pool.push(sprite);
            onArrive();
          },
        });

      lastLanding = Math.max(lastLanding, delay + 0.08 + duration);
    }
    return lastLanding;
  }

  /** Sprites currently in flight. Exposed for tests and debugging. */
  get activeCount(): number {
    return this.view.children.length;
  }
}
