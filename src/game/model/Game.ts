import { Board, type Placement } from './Board';
import { parseBoard } from './parse';
import type { GridPos, PieceDef } from './types';

export interface LevelDef {
  readonly size: number;
  /** Rows of letters, see parse.ts. */
  readonly board: readonly string[];
  /** Cells to clear to fill the jar and win. */
  readonly goal: number;
  readonly tray: readonly PieceDef[];
  /** Intended spot for each piece id: drives the hand hint and makes the script testable. */
  readonly intended: Readonly<Record<string, GridPos>>;
}

export type GameStatus = 'playing' | 'won' | 'lost';
export type LossReason = 'no-pieces' | 'no-moves';

export interface Hint {
  readonly slot: number;
  readonly at: GridPos;
}

/** Everything the view needs to animate one move, returned as plain data. */
export interface MoveResult extends Placement {
  readonly slot: number;
  readonly piece: PieceDef;
  readonly at: GridPos;
  /** Rows plus columns cleared by this move. */
  readonly lines: number;
  /** Consecutive moves that cleared at least one line, this one included. */
  readonly streak: number;
  readonly collected: number;
  readonly status: GameStatus;
  readonly lossReason: LossReason | null;
}

export class Game {
  readonly board: Board;
  readonly goal: number;
  private readonly slots: Array<PieceDef | null>;
  private readonly intended: LevelDef['intended'];
  private collectedCells = 0;
  private streakCount = 0;
  private currentStatus: GameStatus = 'playing';
  private currentLossReason: LossReason | null = null;

  constructor(level: LevelDef) {
    this.board = new Board(level.size, parseBoard(level.board, level.size));
    this.goal = level.goal;
    this.slots = [...level.tray];
    this.intended = level.intended;
  }

  get tray(): ReadonlyArray<PieceDef | null> {
    return this.slots;
  }

  get collected(): number {
    return this.collectedCells;
  }

  get status(): GameStatus {
    return this.currentStatus;
  }

  get lossReason(): LossReason | null {
    return this.currentLossReason;
  }

  canPlace(slot: number, at: GridPos): boolean {
    const piece = this.slots[slot];
    return this.currentStatus === 'playing' && piece != null && this.board.canPlace(piece, at);
  }

  /** Returns null for an invalid move, so the view can bounce the piece back to the tray. */
  place(slot: number, at: GridPos): MoveResult | null {
    const piece = this.slots[slot];
    if (!piece || !this.canPlace(slot, at)) return null;

    const placement = this.board.place(piece, at);
    this.slots[slot] = null;

    const lines = placement.clearedRows.length + placement.clearedCols.length;
    this.streakCount = lines > 0 ? this.streakCount + 1 : 0;
    this.collectedCells += placement.clearedCells.length;
    this.updateStatus();

    return {
      ...placement,
      slot,
      piece,
      at,
      lines,
      streak: this.streakCount,
      collected: this.collectedCells,
      status: this.currentStatus,
      lossReason: this.currentLossReason,
    };
  }

  /** The scripted move for the first remaining piece, or the best clearing move if the script is broken. */
  hint(): Hint | null {
    if (this.currentStatus !== 'playing') return null;

    for (let slot = 0; slot < this.slots.length; slot++) {
      const piece = this.slots[slot];
      const at = piece ? this.intended[piece.id] : undefined;
      if (piece && at && this.board.canPlace(piece, at)) return { slot, at };
    }

    let best: Hint | null = null;
    let bestLines = -1;
    for (let slot = 0; slot < this.slots.length; slot++) {
      const piece = this.slots[slot];
      if (!piece) continue;
      for (const at of this.board.placements(piece)) {
        const { clearedRows, clearedCols } = this.board.clone().place(piece, at);
        const lines = clearedRows.length + clearedCols.length;
        if (lines > bestLines) {
          best = { slot, at };
          bestLines = lines;
        }
      }
    }
    return best;
  }

  private updateStatus(): void {
    if (this.collectedCells >= this.goal) {
      this.currentStatus = 'won';
      return;
    }
    const remaining = this.slots.filter((piece): piece is PieceDef => piece !== null);
    if (remaining.length === 0) {
      this.currentStatus = 'lost';
      this.currentLossReason = 'no-pieces';
    } else if (remaining.every((piece) => this.board.placements(piece).length === 0)) {
      this.currentStatus = 'lost';
      this.currentLossReason = 'no-moves';
    }
  }
}
