/** Index into THEME.blocks. The model only knows ids; colours are the view's business. */
export type ColorId = 0 | 1 | 2 | 3 | 4;

export type Cell = ColorId | null;

export interface GridPos {
  readonly col: number;
  readonly row: number;
}

export interface ColoredPos extends GridPos {
  readonly color: ColorId;
}

export interface PieceDef {
  readonly id: string;
  /** Occupied cells relative to the top-left corner of the piece's bounding box. */
  readonly cells: readonly GridPos[];
  readonly color: ColorId;
}
