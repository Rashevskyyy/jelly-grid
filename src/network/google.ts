import type { AdNetwork } from './types';
import { createWebNetwork } from './web';

/** Google Ads App campaigns: the final URL is configured in the campaign, we only call exit(). */
export function createGoogleNetwork(): AdNetwork {
  const base = createWebNetwork('google');
  return {
    ...base,
    openStore: () => {
      if (window.ExitApi) window.ExitApi.exit();
      else base.openStore(); // local testing without exitapi.js
    },
  };
}
