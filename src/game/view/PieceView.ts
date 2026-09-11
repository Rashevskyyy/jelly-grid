import { Container, type PointData } from 'pixi.js';
import type { PieceDef } from '../model/types';
import { CELL } from './constants';
import { JellyBlock } from './JellyBlock';
import { DRAG_TILT } from './jellyTuning';
import { stepSpring, type SpringState } from './spring';
import type { GameTextures } from './textures';

/**
 * A piece made of jelly blocks. `view` is positioned at the piece's centre and scaled by the scene;
 * the inner `wobble` container carries tilt and idle breathing so they never fight the scene's tweens.
 */
export class PieceView {
  readonly view = new Container();
  readonly piece: PieceDef;
  /** Size at scale 1, in design units. */
  readonly width: number;
  readonly height: number;
  private readonly wobble = new Container();
  private readonly blocks: JellyBlock[] = [];
  private readonly tilt: SpringState = { value: 0, velocity: 0 };

  constructor(piece: PieceDef, textures: GameTextures) {
    this.piece = piece;
    this.width = (Math.max(...piece.cells.map((cell) => cell.col)) + 1) * CELL;
    this.height = (Math.max(...piece.cells.map((cell) => cell.row)) + 1) * CELL;

    for (const { col, row } of piece.cells) {
      const block = new JellyBlock(piece.color, textures);
      block.view.position.set(col * CELL + CELL / 2 - this.width / 2, row * CELL + CELL / 2 - this.height / 2);
      this.blocks.push(block);
      this.wobble.addChild(block.view);
    }
    this.view.addChild(this.wobble);
  }

  /** Top-left corner in the parent's coordinates, for a given centre and scale. */
  topLeftFor(center: PointData, scale: number): PointData {
    return { x: center.x - (this.width * scale) / 2, y: center.y - (this.height * scale) / 2 };
  }

  impulse(squash: number, hop: number, stagger = 0): void {
    this.blocks.forEach((block, index) => block.impulse(squash, hop, index * stagger));
  }

  /**
   * @param lookTarget point the eyes follow, in scene coordinates
   * @param scene the container `lookTarget` is expressed in
   * @param tiltTarget radians the piece leans towards (drag lag)
   * @param breathe 0..1 idle pulse amplitude while resting in the tray
   */
  update(dt: number, lookTarget: PointData, scene: Container, tiltTarget: number, breathe: number): void {
    stepSpring(this.tilt, DRAG_TILT, dt, tiltTarget);
    this.wobble.rotation = this.tilt.value;
    this.wobble.scale.set(1 + breathe * 0.03);

    const local = this.wobble.toLocal(lookTarget, scene);
    for (const block of this.blocks) {
      block.lookAt(local);
      block.update(dt);
    }
  }

  blinkRandom(): void {
    this.blocks[Math.floor(Math.random() * this.blocks.length)]?.blink();
  }

  destroy(): void {
    for (const block of this.blocks) block.destroy();
    this.view.destroy({ children: true });
  }
}
