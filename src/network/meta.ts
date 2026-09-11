import type { AdNetwork } from './types';
import { createWebNetwork } from './web';

/** Meta playables: the store page is configured in Ads Manager, we only report the CTA tap. */
export function createMetaNetwork(): AdNetwork {
  const base = createWebNetwork('meta');
  return {
    ...base,
    openStore: () => {
      if (window.FbPlayableAd) window.FbPlayableAd.onCTAClick();
      else base.openStore(); // Meta preview tool injects FbPlayableAd, a plain browser does not
    },
  };
}
