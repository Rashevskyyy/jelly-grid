/** Everything personal or day-specific on the showcase page lives here. Update it as the game grows. */
export const PROFILE = {
  author: 'Oleksii',
  /** Used for local builds. In CI the repository URL comes from GitHub. */
  repoUrl: 'https://github.com/your-name/jelly-grid',
  lede: 'A playable ad for a block puzzle where every block is a jelly creature that watches your finger.',
  status:
    'Work in progress, day 2 of 6. The puzzle is playable with placeholder blocks; the jelly feel arrives next.',
  tryThis:
    'Drag the green bar into the gap in the bottom row, then fill the other two holes. For the other ending, drop a piece somewhere useless first. Pieces snap to the grid and bounce back from blocked spots, and the layout rebuilds when you rotate the phone.',
} as const;
