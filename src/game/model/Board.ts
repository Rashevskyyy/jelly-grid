import type { Cell, ColoredPos, ColorId, GridPos, PieceDef } from './types';

export interface Placement {
  /** Absolute cells the piece now occupies (before clearing). */
  readonly placed: readonly GridPos[];
  readonly clearedRows: readonly number[];
  readonly clearedCols: readonly number[];
  /** Every removed cell exactly once, with its colour, so the view can burst it. */
  readonly clearedCells: readonly ColoredPos[];
}

export class Board {
  readonly size: number;
  private readonly cells: Cell[];

  constructor(size: number, cells?: readonly Cell[]) {
    if (cells && cells.length !== size * size) throw new Error(`Expected ${size * size} cells, got ${cells.length}`);
    this.size = size;
    this.cells = cells ? [...cells] : new Array<Cell>(size * size).fill(null);
  }

  get(col: number, row: number): Cell {
    return this.inside(col, row) ? this.cells[row * this.size + col] : null;
  }

  inside(col: number, row: number): boolean {
    return col >= 0 && row >= 0 && col < this.size && row < this.size;
  }

  canPlace(piece: PieceDef, at: GridPos): boolean {
    return piece.cells.every(({ col, row }) => {
      const c = at.col + col;
      const r = at.row + row;
      return this.inside(c, r) && this.get(c, r) === null;
    });
  }

  /** Every top-left position where the piece fits, row by row. */
  placements(piece: PieceDef): GridPos[] {
    const result: GridPos[] = [];
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.canPlace(piece, { col, row })) result.push({ col, row });
      }
    }
    return result;
  }

  /** Places the piece and clears completed rows and columns at once. Throws on an invalid move. */
  place(piece: PieceDef, at: GridPos): Placement {
    if (!this.canPlace(piece, at)) throw new Error(`Piece "${piece.id}" does not fit at ${at.col},${at.row}`);

    const placed = piece.cells.map(({ col, row }) => ({ col: at.col + col, row: at.row + row }));
    for (const { col, row } of placed) this.set(col, row, piece.color);

    const clearedRows = this.range().filter((row) => this.range().every((col) => this.get(col, row) !== null));
    const clearedCols = this.range().filter((col) => this.range().every((row) => this.get(col, row) !== null));

    // A cell in both a full row and a full column is collected once.
    const seen = new Set<number>();
    const clearedCells: ColoredPos[] = [];
    const collect = (col: number, row: number) => {
      const index = row * this.size + col;
      const color = this.cells[index];
      if (seen.has(index) || color === null) return;
      seen.add(index);
      clearedCells.push({ col, row, color });
    };
    for (const row of clearedRows) for (const col of this.range()) collect(col, row);
    for (const col of clearedCols) for (const row of this.range()) collect(col, row);
    for (const { col, row } of clearedCells) this.set(col, row, null);

    return { placed, clearedRows, clearedCols, clearedCells };
  }

  clone(): Board {
    return new Board(this.size, this.cells);
  }

  /** Debug helper: the same letter format as level files. */
  toString(): string {
    const letters = 'rgoby';
    return this.range()
      .map((row) => this.range().map((col) => {
        const cell = this.get(col, row);
        return cell === null ? '.' : letters[cell];
      }).join(''))
      .join('\n');
  }

  private set(col: number, row: number, value: ColorId | null): void {
    this.cells[row * this.size + col] = value;
  }

  private range(): number[] {
    return Array.from({ length: this.size }, (_, i) => i);
  }
}
