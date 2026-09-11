import { describe, expect, it } from 'vitest';
import { Board } from './Board';
import { parseBoard, parseShape } from './parse';
import type { PieceDef } from './types';

const piece = (shape: string[], id = 'test'): PieceDef => ({ id, cells: parseShape(shape), color: 2 });

const board4 = (rows: string[]) => new Board(4, parseBoard(rows, 4));

describe('parse', () => {
  it('rejects boards of the wrong size', () => {
    expect(() => parseBoard(['....', '....'], 4)).toThrow(/4 rows/);
    expect(() => parseBoard(['....', '...', '....', '....'], 4)).toThrow(/row 1/);
  });

  it('rejects unknown cell letters', () => {
    expect(() => parseBoard(['x...', '....', '....', '....'], 4)).toThrow(/Unknown cell "x"/);
  });

  it('reads shapes relative to the top-left corner', () => {
    expect(parseShape(['#.', '##'])).toEqual([
      { col: 0, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ]);
  });
});

describe('Board.canPlace', () => {
  const board = board4(['r...', '....', '....', '....']);

  it('rejects overlap and out-of-bounds cells', () => {
    expect(board.canPlace(piece(['##']), { col: 0, row: 0 })).toBe(false); // overlaps r
    expect(board.canPlace(piece(['##']), { col: 3, row: 1 })).toBe(false); // sticks out right
    expect(board.canPlace(piece(['#', '#']), { col: 1, row: 3 })).toBe(false); // sticks out bottom
    expect(board.canPlace(piece(['#']), { col: -1, row: 0 })).toBe(false);
  });

  it('accepts free positions', () => {
    expect(board.canPlace(piece(['##']), { col: 1, row: 0 })).toBe(true);
    expect(board.placements(piece(['####']))).toEqual([
      { col: 0, row: 1 },
      { col: 0, row: 2 },
      { col: 0, row: 3 },
    ]);
  });
});

describe('Board.place', () => {
  it('throws on an invalid move instead of corrupting the board', () => {
    const board = board4(['r...', '....', '....', '....']);
    expect(() => board.place(piece(['#']), { col: 0, row: 0 })).toThrow();
    expect(board.toString()).toBe('r...\n....\n....\n....');
  });

  it('keeps cells when no line is completed', () => {
    const board = board4(['....', '....', '....', '....']);
    const result = board.place(piece(['##']), { col: 1, row: 2 });
    expect(result.clearedCells).toEqual([]);
    expect(board.toString()).toBe('....\n....\n.oo.\n....');
  });

  it('clears a completed row and reports the removed colours', () => {
    const board = board4(['rg..', '....', '....', '....']);
    const result = board.place(piece(['##']), { col: 2, row: 0 });
    expect(result.clearedRows).toEqual([0]);
    expect(result.clearedCols).toEqual([]);
    expect(result.clearedCells.map((cell) => cell.color)).toEqual([0, 1, 2, 2]);
    expect(board.toString()).toBe('....\n....\n....\n....');
  });

  it('clears a row and a column together and counts the shared cell once', () => {
    const board = board4(['rgo.', '...b', '...b', '...b']);
    const result = board.place(piece(['#']), { col: 3, row: 0 });
    expect(result.clearedRows).toEqual([0]);
    expect(result.clearedCols).toEqual([3]);
    expect(result.clearedCells).toHaveLength(7); // 4 + 4 - 1 shared
    expect(board.toString()).toBe('....\n....\n....\n....');
  });
});
