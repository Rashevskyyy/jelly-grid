import type { Network } from '../../build/networks.ts';
import { createGoogleNetwork } from './google';
import { createMraidNetwork } from './mraid';
import { createMetaNetwork } from './meta';
import type { AdNetwork } from './types';
import { createWebNetwork } from './web';

export type { AdNetwork, Size } from './types';

export const MRAID_NETWORKS: readonly Network[] = ['applovin', 'unity', 'ironsource'];

export function createNetwork(network: Network): AdNetwork {
  switch (network) {
    case 'applovin':
    case 'unity':
    case 'ironsource':
      return createMraidNetwork(network);
    case 'google':
      return createGoogleNetwork();
    case 'meta':
      return createMetaNetwork();
    case 'web':
      return createWebNetwork();
  }
}
