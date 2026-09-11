import type { Cell, ColorId, GridPos } from './types';

/** Letters used in level files: r strawberry, g lime, o tangerine, b blueberry, y lemon, "." empty. */
const COLOR_LETTERS: Record<string, ColorId> = { r: 0, g: 1, o: 2, b: 3, y: 4 };

export function parseBoard(rows: readonly string[], size: number): Cell[] {
  if (rows.length !== size) throw new Error(`Board must have ${size} rows, got ${rows.length}`);
  return rows.flatMap((line, row) => {
    if (line.length !== size) throw new Error(`Board row ${row} must have ${size} cells: "${line}"`);
    return [...line].map((char, col): Cell => {
      if (char === '.') return null;
      const color = COLOR_LETTERS[char];
      if (color === undefined) throw new Error(`Unknown cell "${char}" at col ${col}, row ${row}`);
      return color;
    });
  });
}

/** `['#.', '##']` -> an L tromino. Any non-space, non-dot character marks an occupied cell. */
export function parseShape(rows: readonly string[]): GridPos[] {
  const cells = rows.flatMap((line, row) =>
    [...line].flatMap((char, col) => (char === '.' || char === ' ' ? [] : [{ col, row }])),
  );
  if (cells.length === 0) throw new Error('Piece shape has no cells');
  return cells;
}
