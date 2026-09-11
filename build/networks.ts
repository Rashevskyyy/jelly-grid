import type { HtmlTagDescriptor } from 'vite';

/**
 * Build targets. `web` is the portfolio showcase build (GitHub Pages),
 * every other entry is an upload-ready ad network build.
 */
export type Network = 'web' | 'applovin' | 'unity' | 'ironsource' | 'google' | 'meta';

export interface NetworkSpec {
  /** Human-readable name for reports and the showcase page. */
  label: string;
  /** Hard upload limit in bytes. `null` means no limit (showcase build). */
  limitBytes: number | null;
  /** What we actually upload: the raw HTML file or a ZIP with index.html inside. */
  packaging: 'html' | 'zip';
  /** Extra tags injected into <head> for this network only. */
  headTags: HtmlTagDescriptor[];
}

/** Networks write "5 MB" without defining MB, so we use the stricter decimal value. */
const MB = 1_000_000;

/** Our own budget for every build. Crossing it is a warning, not a failure. */
export const SIZE_BUDGET_BYTES = 1 * MB;

export const NETWORKS: Record<Network, NetworkSpec> = {
  web: { label: 'Web showcase', limitBytes: null, packaging: 'html', headTags: [] },

  // MRAID 2.0, single HTML, mraid.open() for click-through.
  applovin: { label: 'AppLovin', limitBytes: 5 * MB, packaging: 'html', headTags: [] },

  // MRAID 3.0, single HTML, start only after viewableChange.
  unity: { label: 'Unity Ads', limitBytes: 5 * MB, packaging: 'html', headTags: [] },

  // MRAID 2.0, 4 MB for code + assets, size must come from mraid.getMaxSize().
  ironsource: { label: 'ironSource', limitBytes: 4 * MB, packaging: 'html', headTags: [] },

  // App campaigns: ZIP upload, orientation meta tag, CTA through ExitApi.exit().
  google: {
    label: 'Google Ads',
    limitBytes: 5 * MB,
    packaging: 'zip',
    headTags: [
      { tag: 'meta', attrs: { name: 'ad.orientation', content: 'portrait,landscape' }, injectTo: 'head' },
      {
        tag: 'script',
        attrs: {
          type: 'text/javascript',
          src: 'https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js',
        },
        injectTo: 'head',
      },
    ],
  },

  // Single HTML up to 2 MB, CTA through FbPlayableAd.onCTAClick().
  meta: { label: 'Meta', limitBytes: 2 * MB, packaging: 'html', headTags: [] },
};

export function isNetwork(value: string): value is Network {
  return Object.prototype.hasOwnProperty.call(NETWORKS, value);
}
