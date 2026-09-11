import type { LevelDef } from '../model/Game';
import { parseShape } from '../model/parse';

/**
 * The whole playable is this one scripted level. Intended moves escalate:
 * bar clears 1 row, square clears 2 rows, pillar clears 3 rows and fills the jar.
 * Rows 0-1 stay empty, so a misplaced piece is legal but clears nothing.
 * level1.test.ts locks these guarantees in.
 */
export const LEVEL_1: LevelDef = {
  size: 8,
  board: [
    '........',
    '........',
    'r.gobyrg',
    'b.yrgobr',
    'o.bgyrgy',
    'grobr..o',
    'ybgoy..b',
    'rg...byr',
  ],
  // All six intended lines: 6 x 8 cells. Two out of three good moves leave the jar almost full.
  goal: 48,
  tray: [
    { id: 'bar', cells: parseShape(['###']), color: 1 },
    { id: 'square', cells: parseShape(['##', '##']), color: 3 },
    { id: 'pillar', cells: parseShape(['#', '#', '#']), color: 0 },
  ],
  intended: {
    bar: { col: 2, row: 7 },
    square: { col: 5, row: 5 },
    pillar: { col: 1, row: 2 },
  },
};
