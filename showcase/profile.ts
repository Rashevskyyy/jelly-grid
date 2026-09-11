/** Everything personal or day-specific on the showcase page lives here. Update it as the game grows. */
export const PROFILE = {
  author: 'Oleksii',
  /** Used for local builds. In CI the repository URL comes from GitHub. */
  repoUrl: 'https://github.com/your-name/jelly-grid',
  lede: 'A playable ad for a block puzzle where every block is a jelly creature that watches your finger.',
  status:
    'Work in progress, day 1 of 6. The ad container, layout and store exit work; the puzzle itself arrives next.',
  tryThis:
    'Rotate the phone and watch the layout rebuild. Tap the block to squash it. Then press Restart and make Play now your very first tap: ad networks forbid leaving the ad on the first touch, so the button only wiggles.',
} as const;
