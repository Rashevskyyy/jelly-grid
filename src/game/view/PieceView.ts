import { Container, Sprite } from 'pixi.js';
import type { PieceDef } from '../model/types';
import { CELL } from './constants';
import type { GameTextures } from './textures';

/** A piece as a group of block sprites. Origin is the top-left corner of its bounding box. */
export class PieceView {
  readonly view = new Container();
  readonly piece: PieceDef;
  /** Size at scale 1, in design units. */
  readonly width: number;
  readonly height: number;

  constructor(piece: PieceDef, textures: GameTextures) {
    this.piece = piece;
    for (const { col, row } of piece.cells) {
      const block = new Sprite({ texture: textures.blocks[piece.color], anchor: 0.5 });
      block.position.set(col * CELL + CELL / 2, row * CELL + CELL / 2);
      this.view.addChild(block);
    }
    this.width = (Math.max(...piece.cells.map((cell) => cell.col)) + 1) * CELL;
    this.height = (Math.max(...piece.cells.map((cell) => cell.row)) + 1) * CELL;
  }
}
