/** Everything personal or day-specific on the showcase page lives here. Update it as the game grows. */
export const PROFILE = {
  author: 'Oleksii',
  /** Used for local builds. In CI the repository URL comes from GitHub. */
  repoUrl: 'https://github.com/your-name/jelly-grid',
  lede: 'A playable ad for a block puzzle where every block is a jelly creature that watches your finger.',
  status:
    'Work in progress, day 4 of 6. Tutorial hand, synthesized sound and the display font are in. The real end card arrives next.',
  tryThis:
    'Wait a second and a hand shows the first move. Turn the sound on: every sound is synthesized in the browser, and the jar sings higher as it fills. Drop the blue square into the gap on the right for a double, then the bar and the pillar for a triple.',
} as const;
