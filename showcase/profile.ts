/** Everything personal or day-specific on the showcase page lives here. Update it as the game grows. */
export const PROFILE = {
  author: 'Oleksii',
  /** Used for local builds. In CI the repository URL comes from GitHub. */
  repoUrl: 'https://github.com/your-name/jelly-grid',
  lede: 'A playable ad for a block puzzle where every block is a jelly creature that watches your finger.',
  status:
    'Work in progress, day 3 of 6. Jelly blocks, ripples, particles, the jar and combo shake are in. Hint hand, sound and a proper font arrive next.',
  tryThis:
    'Move the cursor over the board and every block follows it with its eyes. Drop the blue square into the gap on the right for a double, then the bar and the pillar for a triple. Cleared blocks fly into the jar, and bigger combos hit harder.',
} as const;
