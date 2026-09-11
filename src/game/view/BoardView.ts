import { gsap } from 'gsap';
import { Container, Graphics, Sprite, type PointData } from 'pixi.js';
import { THEME } from '../../config';
import type { Board } from '../model/Board';
import type { MoveResult } from '../model/Game';
import type { GridPos, PieceDef } from '../model/types';
import { CELL } from './constants';
import type { GameTextures } from './textures';

const FRAME_PADDING = 14;

/** Renders board state and plays back MoveResults. Origin is the top-left corner of cell 0,0. */
export class BoardView {
  readonly view = new Container();
  readonly pixelSize: number;
  private readonly size: number;
  private readonly textures: GameTextures;
  private readonly blocksLayer = new Container();
  private readonly ghostLayer = new Container();
  private readonly blocks: Array<Sprite | null>;

  constructor(board: Board, textures: GameTextures) {
    this.size = board.size;
    this.textures = textures;
    this.pixelSize = board.size * CELL;
    this.blocks = new Array<Sprite | null>(board.size * board.size).fill(null);

    const frame = new Graphics()
      .roundRect(-FRAME_PADDING, -FRAME_PADDING, this.pixelSize + FRAME_PADDING * 2, this.pixelSize + FRAME_PADDING * 2, 30)
      .fill(THEME.backgroundDeep);
    const emptyCells = new Container();
    for (let row = 0; row < board.size; row++) {
      for (let col = 0; col < board.size; col++) {
        const cell = new Sprite({ texture: textures.emptyCell, anchor: 0.5 });
        cell.position.copyFrom(this.cellCenter({ col, row }));
        emptyCells.addChild(cell);
        const color = board.get(col, row);
        if (color !== null) this.addBlock({ col, row }, color);
      }
    }
    this.view.addChild(frame, emptyCells, this.ghostLayer, this.blocksLayer);
  }

  cellCenter({ col, row }: GridPos): PointData {
    return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
  }

  /** Nearest grid position for a piece whose top-left corner is at `local` (board coordinates). */
  snap(local: PointData): GridPos {
    return { col: Math.round(local.x / CELL), row: Math.round(local.y / CELL) };
  }

  showGhost(piece: PieceDef, at: GridPos): void {
    this.hideGhost();
    for (const { col, row } of piece.cells) {
      const ghost = new Sprite({ texture: this.textures.ghost, anchor: 0.5 });
      ghost.position.copyFrom(this.cellCenter({ col: at.col + col, row: at.row + row }));
      this.ghostLayer.addChild(ghost);
    }
  }

  hideGhost(): void {
    this.ghostLayer.removeChildren().forEach((child) => child.destroy());
  }

  /** Adds the placed blocks and pops cleared ones in a ripple from the placement. Returns the duration in seconds. */
  applyMove(move: MoveResult): number {
    for (const { col, row } of move.placed) this.addBlock({ col, row }, move.piece.color);
    if (move.clearedCells.length === 0) return 0;

    const origin = this.cellCenter(move.placed[0]);
    const cleared = move.clearedCells
      .map((cell) => {
        const index = cell.row * this.size + cell.col;
        const sprite = this.blocks[index];
        this.blocks[index] = null;
        return sprite;
      })
      .filter((sprite): sprite is Sprite => sprite !== null)
      .sort((a, b) => distance(a, origin) - distance(b, origin));

    const stagger = 0.012;
    const duration = 0.22;
    gsap.to(
      cleared.map((sprite) => sprite.scale),
      { x: 0, y: 0, duration, ease: 'back.in(2)', stagger, delay: 0.05 },
    );
    gsap.to(cleared, {
      alpha: 0,
      duration,
      stagger,
      delay: 0.05,
      onComplete: () => cleared.forEach((sprite) => sprite.destroy()),
    });
    return 0.05 + duration + stagger * cleared.length;
  }

  private addBlock(at: GridPos, color: number): void {
    const sprite = new Sprite({ texture: this.textures.blocks[color], anchor: 0.5 });
    sprite.position.copyFrom(this.cellCenter(at));
    this.blocksLayer.addChild(sprite);
    this.blocks[at.row * this.size + at.col] = sprite;
  }
}

function distance(sprite: Sprite, point: PointData): number {
  return Math.hypot(sprite.x - point.x, sprite.y - point.y);
}
