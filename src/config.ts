export const STORE_URLS = {
  ios: 'https://apps.apple.com/app/id0000000000',
  android: 'https://play.google.com/store/apps/details?id=com.example.jellygrid',
  /** The showcase build has no store: the CTA leads to the project repo (set by CI) instead. */
  web: import.meta.env.VITE_REPO_URL ?? 'https://github.com/your-name/jelly-grid',
} as const;

/**
 * Logical "safe box" in design units. Everything important must fit inside it;
 * backgrounds extend to the real screen edges.
 */
export const DESIGN = { short: 720, long: 1280 } as const;

export const SESSION = {
  /** Hard stop after the first interaction: the end card appears no matter what. */
  maxSeconds: 30,
} as const;

/** Grape-soda backdrop with gummy-candy block colours. */
export const THEME = {
  background: 0x3a2a5c,
  backgroundDeep: 0x2a1d45,
  cream: 0xfff1dc,
  blocks: [0xff5a7a, 0x9be564, 0xffa53a, 0x4fa3ff, 0xffe15a],
} as const;
