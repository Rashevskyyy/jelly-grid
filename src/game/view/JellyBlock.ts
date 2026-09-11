import { gsap } from 'gsap';
import { Container, Sprite, type PointData } from 'pixi.js';
import type { ColorId } from '../model/types';
import { BLOCK } from './constants';
import { JELLY_HOP, JELLY_SQUASH, PUPIL_FOLLOW_RATE, PUPIL_REACH } from './jellyTuning';
import { stepSpring, type SpringState } from './spring';
import type { GameTextures } from './textures';

const EYE_Y = -4;
const EYE_SPACING = 14;
const MAX_SQUASH = 0.4;

interface PendingImpulse {
  delay: number;
  squash: number;
  hop: number;
}

/**
 * One living block: a body on two springs (squash and hop) plus eyes that track a point.
 * Squash pivots on the bottom edge, so a landing splats onto the board instead of shrinking in place.
 */
export class JellyBlock {
  readonly view = new Container();
  private readonly body = new Container();
  private readonly eyes = new Container();
  private readonly pupils: Sprite[] = [];
  private readonly squash: SpringState = { value: 0, velocity: 0 };
  private readonly hop: SpringState = { value: 0, velocity: 0 };
  private readonly pending: PendingImpulse[] = [];
  private readonly pupilTarget = { x: 0, y: 0 };

  constructor(color: ColorId, textures: GameTextures) {
    this.body.pivot.y = BLOCK / 2;
    this.body.position.y = BLOCK / 2;
    this.body.addChild(new Sprite({ texture: textures.blocks[color], anchor: 0.5 }));

    this.eyes.position.y = EYE_Y;
    for (const x of [-EYE_SPACING, EYE_SPACING]) {
      const white = new Sprite({ texture: textures.eyeWhite, anchor: 0.5 });
      const pupil = new Sprite({ texture: textures.pupil, anchor: 0.5 });
      white.x = x;
      pupil.x = x;
      this.eyes.addChild(white, pupil);
      this.pupils.push(pupil);
    }
    this.body.addChild(this.eyes);
    this.view.addChild(this.body);
  }

  /** Kick the springs: positive squash splats wide, negative stretches tall, negative hop jumps up. */
  impulse(squash: number, hop: number, delay = 0): void {
    if (delay > 0) this.pending.push({ delay, squash, hop });
    else this.apply(squash, hop);
  }

  /** Point the pupils at `target`, given in the coordinates of this block's parent. */
  lookAt(target: PointData): void {
    const dx = target.x - this.view.x;
    const dy = target.y - (this.view.y + EYE_Y);
    const distance = Math.hypot(dx, dy);
    if (distance < 1) {
      this.pupilTarget.x = 0;
      this.pupilTarget.y = 0;
      return;
    }
    const reach = Math.min(PUPIL_REACH, distance * 0.05);
    this.pupilTarget.x = (dx / distance) * reach;
    this.pupilTarget.y = (dy / distance) * reach;
  }

  blink(): void {
    gsap.to(this.eyes.scale, { y: 0.1, duration: 0.06, yoyo: true, repeat: 1, ease: 'power1.in' });
  }

  update(dt: number): void {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const impulse = this.pending[i];
      impulse.delay -= dt;
      if (impulse.delay <= 0) {
        this.apply(impulse.squash, impulse.hop);
        this.pending.splice(i, 1);
      }
    }

    stepSpring(this.squash, JELLY_SQUASH, dt);
    stepSpring(this.hop, JELLY_HOP, dt);
    const squash = Math.max(-MAX_SQUASH, Math.min(MAX_SQUASH, this.squash.value));
    this.body.scale.set(1 + squash, 1 - squash * 0.9);
    this.body.position.y = BLOCK / 2 + this.hop.value;

    const follow = 1 - Math.exp(-PUPIL_FOLLOW_RATE * dt);
    for (const [index, pupil] of this.pupils.entries()) {
      const restX = index === 0 ? -EYE_SPACING : EYE_SPACING;
      pupil.x += (restX + this.pupilTarget.x - pupil.x) * follow;
      pupil.y += (this.pupilTarget.y - pupil.y) * follow;
    }
  }

  destroy(): void {
    gsap.killTweensOf([this.eyes.scale, this.view, this.view.scale]);
    this.view.destroy({ children: true });
  }

  private apply(squash: number, hop: number): void {
    this.squash.velocity += squash;
    this.hop.velocity += hop;
  }
}
