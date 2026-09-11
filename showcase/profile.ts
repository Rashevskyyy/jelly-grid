/** Everything personal or day-specific on the showcase page lives here. Update it as the game grows. */
export const PROFILE = {
  author: 'Oleksii',
  /** Used for local builds. In CI the repository URL comes from GitHub. */
  repoUrl: 'https://github.com/your-name/jelly-grid',
  lede: 'A playable ad for a block puzzle where every block is a jelly creature that watches your finger.',
  status:
    'Work in progress, day 5 of 6. Full end card and per-network preflight checks are in. Performance pass and final polish next.',
  tryThis:
    'Wait a second and a hand shows the first move. Drop the blue square into the gap on the right for a double, then the bar and the pillar for a triple. Finish the level, or waste a move for the near-miss ending, to reach the end card: the whole card is one tap target.',
} as const;
