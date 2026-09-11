/** Everything personal or day-specific on the showcase page lives here. Update it as the game grows. */
export const PROFILE = {
  author: 'Oleksii',
  /** Used for local builds. In CI the repository URL comes from GitHub. */
  repoUrl: 'https://github.com/your-name/jelly-grid',
  lede: 'A playable ad for a block puzzle where every block is a jelly creature that watches your finger.',
  status:
    'Work in progress, day 3 of 6. The blocks are alive: springs, eyes and ripples. The line-clear payoff arrives next.',
  tryThis:
    'Move the cursor over the board and every block follows it with its eyes. Pick up a piece and swing it: it lags and tilts like jelly. Drop it into a gap and watch the neighbours hop. Drop a piece onto blocked cells to see it bounce back.',
} as const;
