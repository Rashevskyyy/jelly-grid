import { gsap } from 'gsap';
import { Container, Sprite, type PointData } from 'pixi.js';
import type { PieceDef } from '../model/types';
import { CELL, DRAG_LIFT } from './constants';
import type { GameTextures } from './textures';

export interface HintPlan {
  piece: PieceDef;
  /** Tray slot centre, in the coordinates of this view's parent. */
  from: PointData;
  /** Finger position that drops the piece on its target (same maths as a real drag). */
  to: PointData;
  trayScale: number;
  boardScale: number;
  /** Fired when the hand "releases": show the board ghost here. */
  onRelease: () => void;
  /** Fired when the demo fades out, before it loops. */
  onReset: () => void;
}

const GHOST_ALPHA = 0.6;

/**
 * Looping tutorial: a hand picks up a translucent copy of the piece and drags it to the hinted spot.
 * The copy floats above the fingertip exactly like a real drag, so the demo shows the real gesture.
 */
export class HintView {
  readonly view = new Container();
  private readonly hand: Sprite;
  private readonly ghost = new Container();
  private readonly textures: GameTextures;
  private timeline: gsap.core.Timeline | null = null;

  constructor(textures: GameTextures) {
    this.textures = textures;
    this.view.eventMode = 'none';
    this.hand = new Sprite({ texture: textures.hand.texture, anchor: textures.hand.tip });
    this.hand.scale.set(0.9);
    this.view.addChild(this.ghost, this.hand);
    this.view.visible = false;
  }

  get playing(): boolean {
    return this.timeline !== null;
  }

  play(plan: HintPlan): void {
    this.stop();
    this.buildGhost(plan.piece);
    const height = (Math.max(...plan.piece.cells.map((c) => c.row)) + 1) * CELL;
    const finger = { x: plan.from.x, y: plan.from.y };
    const pick = { scale: plan.trayScale, lift: 0 };

    const place = () => {
      this.hand.position.set(finger.x, finger.y);
      // lift 0: the copy sits on the slot; lift 1: it floats above the finger exactly like a real drag.
      this.ghost.position.set(finger.x, finger.y - (height / 2 + DRAG_LIFT) * pick.scale * pick.lift);
      this.ghost.scale.set(pick.scale);
    };

    const reset = () => {
      finger.x = plan.from.x;
      finger.y = plan.from.y + 40;
      pick.scale = plan.trayScale;
      pick.lift = 0;
      this.hand.alpha = 0;
      this.hand.scale.set(0.9);
      this.ghost.alpha = 0;
      place();
    };
    // Reset synchronously: the timeline's first call only runs on the next tick, and without this the
    // hand would render for one frame at 0,0 in the top-left corner.
    reset();
    this.view.visible = true;
    this.timeline = gsap
      .timeline({ repeat: -1, repeatDelay: 0.45 })
      .call(reset)
      .to(this.hand, { alpha: 1, duration: 0.2 })
      .to(finger, { y: plan.from.y, duration: 0.25, ease: 'power2.out', onUpdate: place }, '<')
      .to(this.hand.scale, { x: 0.78, y: 0.78, duration: 0.12, ease: 'power2.in' }) // press
      .to(this.ghost, { alpha: GHOST_ALPHA, duration: 0.1 }, '<')
      .to(pick, { scale: plan.boardScale, lift: 1, duration: 0.18, ease: 'power2.out', onUpdate: place })
      .to(finger, { x: plan.to.x, y: plan.to.y, duration: 0.9, ease: 'power1.inOut', onUpdate: place })
      .call(plan.onRelease)
      .to(this.hand.scale, { x: 0.9, y: 0.9, duration: 0.12, ease: 'back.out(3)' }) // release
      .to([this.hand, this.ghost], { alpha: 0, duration: 0.25, delay: 0.4 })
      .call(plan.onReset);
  }

  stop(): void {
    this.timeline?.kill();
    this.timeline = null;
    this.view.visible = false;
  }

  private buildGhost(piece: PieceDef): void {
    this.ghost.removeChildren().forEach((child) => child.destroy());
    const width = (Math.max(...piece.cells.map((c) => c.col)) + 1) * CELL;
    const height = (Math.max(...piece.cells.map((c) => c.row)) + 1) * CELL;
    for (const { col, row } of piece.cells) {
      const block = new Sprite({ texture: this.textures.blocks[piece.color], anchor: 0.5 });
      block.position.set(col * CELL + CELL / 2 - width / 2, row * CELL + CELL / 2 - height / 2);
      this.ghost.addChild(block);
    }
  }
}
