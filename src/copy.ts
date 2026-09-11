/**
 * Every string drawn with the display font. scripts/subset-font.ts reads this file to decide
 * which glyphs ship, so text added anywhere else would render in the fallback font.
 */
export const COPY = {
  combo: ['Sweet!', 'Double!', 'Triple!', 'Unreal!'],
  end: {
    won: 'Level complete',
    lost: 'So close!',
    timeout: 'Almost there',
  },
  cta: 'Play now',
  title: 'Jelly Grid',
  tagline: 'Squish lines. Fill the jar.',
} as const;
