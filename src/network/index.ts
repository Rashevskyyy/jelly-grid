import { createGoogleNetwork } from './google';
import { createMraidNetwork } from './mraid';
import { createMetaNetwork } from './meta';
import type { AdNetwork } from './types';
import { createWebNetwork } from './web';

export type { AdNetwork, Size } from './types';

/**
 * Picks the adapter at build time. `__NETWORK__` is a string literal after `define`, so every
 * comparison below is constant and the bundler drops the other adapters: the AppLovin build
 * contains no Google or Meta code at all (checked by scripts/check-builds.ts).
 */
export function createNetwork(): AdNetwork {
  if (__NETWORK__ === 'google') return createGoogleNetwork();
  if (__NETWORK__ === 'meta') return createMetaNetwork();
  if (__NETWORK__ === 'applovin' || __NETWORK__ === 'unity' || __NETWORK__ === 'ironsource') {
    return createMraidNetwork(__NETWORK__);
  }
  return createWebNetwork();
}

/** Networks that inject `window.mraid`. */
export const usesMraid = (): boolean =>
  __NETWORK__ === 'applovin' || __NETWORK__ === 'unity' || __NETWORK__ === 'ironsource';
