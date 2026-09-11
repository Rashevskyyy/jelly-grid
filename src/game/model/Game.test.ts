import { describe, expect, it } from 'vitest';
import { Game, type LevelDef } from './Game';
import { parseShape } from './parse';

const level = (overrides: Partial<LevelDef> = {}): LevelDef => ({
  size: 4,
  board: ['rg..', '....', '....', '....'],
  goal: 4,
  tray: [
    { id: 'domino', cells: parseShape(['##']), color: 1 },
    { id: 'dot', cells: parseShape(['#']), color: 2 },
  ],
  intended: { domino: { col: 2, row: 0 } },
  ...overrides,
});

describe('Game', () => {
  it('returns null for invalid moves and leaves the tray untouched', () => {
    const game = new Game(level());
    expect(game.place(0, { col: 0, row: 0 })).toBeNull();
    expect(game.place(5, { col: 0, row: 1 })).toBeNull();
    expect(game.tray[0]?.id).toBe('domino');
  });

  it('empties the slot, collects cleared cells and wins at the goal', () => {
    const game = new Game(level());
    const move = game.place(0, { col: 2, row: 0 });
    expect(move).toMatchObject({ slot: 0, lines: 1, streak: 1, collected: 4, status: 'won' });
    expect(game.tray[0]).toBeNull();
    expect(game.place(1, { col: 0, row: 1 })).toBeNull(); // no moves after the game is over
  });

  it('resets the streak on a move that clears nothing', () => {
    const game = new Game(level({ goal: 100, tray: [...level().tray, { id: 'bar', cells: parseShape(['##']), color: 3 }] }));
    expect(game.place(0, { col: 2, row: 0 })?.streak).toBe(1);
    expect(game.place(1, { col: 0, row: 3 })?.streak).toBe(0);
  });

  it('loses with "no-pieces" when the tray runs out before the goal', () => {
    const game = new Game(level({ goal: 100 }));
    game.place(0, { col: 0, row: 1 });
    const last = game.place(1, { col: 0, row: 2 });
    expect(last).toMatchObject({ status: 'lost', lossReason: 'no-pieces' });
  });

  it('loses with "no-moves" when no remaining piece fits anywhere', () => {
    const game = new Game(
      level({
        // Checkerboard: no 2x2 gap anywhere, and the dot below completes nothing.
        board: ['r.r.', '.r.r', 'r.r.', '.r..'],
        goal: 100,
        tray: [
          { id: 'dot', cells: parseShape(['#']), color: 2 },
          { id: 'big', cells: parseShape(['##', '##']), color: 3 },
        ],
        intended: {},
      }),
    );
    const move = game.place(0, { col: 3, row: 3 }); // the 2x2 still has nowhere to go
    expect(move).toMatchObject({ status: 'lost', lossReason: 'no-moves' });
  });

  it('hints the scripted move first, then falls back to the best clearing move', () => {
    const game = new Game(level({ goal: 100 }));
    expect(game.hint()).toEqual({ slot: 0, at: { col: 2, row: 0 } });

    game.place(0, { col: 0, row: 1 }); // ignore the hint
    const fallback = new Game(level({ intended: {}, goal: 100 }));
    expect(fallback.hint()).toEqual({ slot: 0, at: { col: 2, row: 0 } }); // the only clearing move
  });
});
