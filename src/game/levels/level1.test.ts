import { describe, expect, it } from 'vitest';
import { Game } from '../model/Game';
import { LEVEL_1 } from './level1';

/** Plays pieces by id at their intended spots and returns the move results. */
function playIntended(game: Game, ids: string[]) {
  return ids.map((id) => {
    const slot = game.tray.findIndex((piece) => piece?.id === id);
    const move = game.place(slot, LEVEL_1.intended[id]);
    if (!move) throw new Error(`Intended move for "${id}" was rejected`);
    return move;
  });
}

describe('LEVEL_1 script', () => {
  it('escalates 1, 2, 3 lines and wins exactly on the last intended move', () => {
    const moves = playIntended(new Game(LEVEL_1), ['bar', 'square', 'pillar']);
    expect(moves.map((move) => move.lines)).toEqual([1, 2, 3]);
    expect(moves.map((move) => move.streak)).toEqual([1, 2, 3]);
    expect(moves.map((move) => move.status)).toEqual(['playing', 'playing', 'won']);
  });

  it('wins in any order, but never before all three pieces are placed', () => {
    const moves = playIntended(new Game(LEVEL_1), ['pillar', 'square', 'bar']);
    expect(moves.map((move) => move.status)).toEqual(['playing', 'playing', 'won']);
  });

  it('hints follow the script order', () => {
    const game = new Game(LEVEL_1);
    const hinted: string[] = [];
    for (let i = 0; i < 3; i++) {
      const hint = game.hint();
      if (!hint) throw new Error('No hint');
      hinted.push(game.tray[hint.slot]?.id ?? '?');
      game.place(hint.slot, hint.at);
    }
    expect(hinted).toEqual(['bar', 'square', 'pillar']);
    expect(game.status).toBe('won');
  });

  it('a misplaced piece is legal and ends in a near miss', () => {
    const game = new Game(LEVEL_1);
    const wasted = game.place(0, { col: 0, row: 0 }); // bar dropped into the empty top rows
    expect(wasted).toMatchObject({ lines: 0, status: 'playing' });

    const [, last] = playIntended(game, ['square', 'pillar']);
    expect(last).toMatchObject({ status: 'lost', lossReason: 'no-pieces', collected: 40 });
    expect(last.collected / LEVEL_1.goal).toBeGreaterThan(0.8); // jar almost full: the "so close" moment
  });

  it('no intended move completes a column by accident', () => {
    const moves = playIntended(new Game(LEVEL_1), ['bar', 'square', 'pillar']);
    expect(moves.flatMap((move) => move.clearedCols)).toEqual([]);
  });
});
