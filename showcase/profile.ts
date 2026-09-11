/** Everything personal or day-specific on the showcase page lives here. Update it as the game grows. */
export const PROFILE = {
  author: 'Oleksii',
  /** Used for local builds. In CI the repository URL comes from GitHub. */
  repoUrl: 'https://github.com/Rashevskyyy/jelly-grid',
  lede: 'A playable ad for a block puzzle where every block is a jelly creature that watches your finger.',
  status:
    'Built as a portfolio piece: PixiJS v8, GSAP and TypeScript, one self-contained file per ad network, no image or audio files.',
  tryThis:
    'Wait a second and the hand shows the first move. Drop the blue square into the gap on the right for a double, then the bar and the pillar for a triple, and watch the cleared blocks fly into the jar. Waste a move for the near-miss ending. On desktop, move the cursor over the board: every block follows it with its eyes.',
} as const;
