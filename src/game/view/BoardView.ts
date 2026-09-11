import { gsap } from 'gsap';
import { Container, Graphics, Sprite, type PointData } from 'pixi.js';
import { THEME } from '../../config';
import type { Board } from '../model/Board';
import type { MoveResult } from '../model/Game';
import type { ColorId, GridPos, PieceDef } from '../model/types';
import { CELL } from './constants';
import { JellyBlock } from './JellyBlock';
import { CLEAR_DELAY, FLIGHT, IMPULSE, RIPPLE_DELAY_PER_CELL, RIPPLE_RADIUS } from './jellyTuning';
import type { GameTextures } from './textures';

const FRAME_PADDING = 14;

export interface PoppedBlock {
  /** Centre of the cleared cell in board coordinates. */
  position: PointData;
  color: ColorId;
  /** Seconds after the landing when this block pops. */
  delay: number;
}

export interface MovePlayback {
  /** Seconds until the landing and every pop have finished. */
  settle: number;
  /** Seconds after the landing when the first line pops. Zero if nothing was cleared. */
  clearAt: number;
  /** Cleared blocks in pop order, nearest to the landing first. */
  popped: PoppedBlock[];
}

/** Renders board state and plays back MoveResults. Origin is the top-left corner of cell 0,0. */
export class BoardView {
  readonly view = new Container();
  readonly pixelSize: number;
  private readonly size: number;
  private readonly textures: GameTextures;
  private readonly blocksLayer = new Container();
  private readonly ghostLayer = new Container();
  private readonly blocks: Array<JellyBlock | null>;
  /** Blocks still animating out after a clear: they keep wobbling until destroyed. */
  private readonly leaving = new Set<JellyBlock>();

  constructor(board: Board, textures: GameTextures) {
    this.size = board.size;
    this.textures = textures;
    this.pixelSize = board.size * CELL;
    this.blocks = new Array<JellyBlock | null>(board.size * board.size).fill(null);

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

  get center(): PointData {
    return { x: this.pixelSize / 2, y: this.pixelSize / 2 };
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

  /** @param lookTarget point in board coordinates that every pair of eyes follows */
  update(dt: number, lookTarget: PointData): void {
    for (const block of this.blocks) {
      if (!block) continue;
      block.lookAt(lookTarget);
      block.update(dt);
    }
    for (const block of this.leaving) block.update(dt);
  }

  blinkRandom(): void {
    const alive = this.blocks.filter((block): block is JellyBlock => block !== null);
    alive[Math.floor(Math.random() * alive.length)]?.blink();
  }

  /**
   * Lands the piece with a splat, sends a ripple through nearby blocks and pops cleared lines.
   * Returns timings and the popped blocks, so the scene can launch particles and screen effects in sync.
   */
  applyMove(move: MoveResult): MovePlayback {
    const placed = move.placed.map((at) => {
      const block = this.addBlock(at, move.piece.color);
      block.impulse(IMPULSE.land.squash, IMPULSE.land.hop);
      return block;
    });
    this.ripple(move.placed, new Set(placed));
    if (move.clearedCells.length === 0) return { settle: 0, clearAt: 0, popped: [] };

    const origin = this.cellCenter(move.placed[0]);
    const cleared = move.clearedCells
      .map((cell) => {
        const index = cell.row * this.size + cell.col;
        const block = this.blocks[index];
        this.blocks[index] = null;
        return block ? { block, color: cell.color } : null;
      })
      .filter((entry): entry is { block: JellyBlock; color: ColorId } => entry !== null)
      .sort((a, b) => distance(a.block.view, origin) - distance(b.block.view, origin));

    const duration = 0.22;
    const blocks = cleared.map(({ block }) => block);
    blocks.forEach((block) => this.leaving.add(block));
    gsap.to(
      blocks.map((block) => block.view.scale),
      { x: 0, y: 0, duration, ease: 'back.in(2)', stagger: FLIGHT.stagger, delay: CLEAR_DELAY },
    );
    gsap.to(
      blocks.map((block) => block.view),
      {
        alpha: 0,
        duration,
        stagger: FLIGHT.stagger,
        delay: CLEAR_DELAY,
        onComplete: () =>
          blocks.forEach((block) => {
            this.leaving.delete(block);
            block.destroy();
          }),
      },
    );

    return {
      settle: CLEAR_DELAY + duration + FLIGHT.stagger * blocks.length,
      clearAt: CLEAR_DELAY,
      popped: cleared.map(({ block, color }, index) => ({
        position: { x: block.view.x, y: block.view.y },
        color,
        // Particles take off as their block shrinks away, so the pop hands over to the flight.
        delay: CLEAR_DELAY + index * FLIGHT.stagger + duration * 0.5,
      })),
    };
  }

  /** Neighbours hop and stretch, weaker and later the further they are from the landing. */
  private ripple(origin: readonly GridPos[], skip: ReadonlySet<JellyBlock>): void {
    this.blocks.forEach((block, index) => {
      if (!block || skip.has(block)) return;
      const col = index % this.size;
      const row = Math.floor(index / this.size);
      const cells = Math.min(...origin.map((at) => Math.hypot(at.col - col, at.row - row)));
      if (cells > RIPPLE_RADIUS) return;
      const strength = 1 - (cells - 1) / RIPPLE_RADIUS;
      block.impulse(IMPULSE.ripple.squash * strength, IMPULSE.ripple.hop * strength, cells * RIPPLE_DELAY_PER_CELL);
    });
  }

  private addBlock(at: GridPos, color: ColorId): JellyBlock {
    const block = new JellyBlock(color, this.textures);
    block.view.position.copyFrom(this.cellCenter(at));
    this.blocksLayer.addChild(block.view);
    this.blocks[at.row * this.size + at.col] = block;
    return block;
  }
}

function distance(point: PointData, other: PointData): number {
  return Math.hypot(point.x - other.x, point.y - other.y);
}
