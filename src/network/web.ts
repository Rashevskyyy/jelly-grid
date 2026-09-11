import { resolveStoreUrl } from './storeUrl';
import type { AdNetwork, Size } from './types';

const windowSize = (): Size => ({ width: window.innerWidth, height: window.innerHeight });

/**
 * Plain browser behaviour. Used for the showcase build and as the base for
 * networks that don't speak MRAID (Google, Meta).
 */
export function createWebNetwork(name: string = 'web'): AdNetwork {
  return {
    name,
    ready: () => Promise.resolve(),
    viewable: () =>
      document.visibilityState === 'visible'
        ? Promise.resolve()
        : new Promise((resolve) => {
            const onChange = () => {
              if (document.visibilityState !== 'visible') return;
              document.removeEventListener('visibilitychange', onChange);
              resolve();
            };
            document.addEventListener('visibilitychange', onChange);
          }),
    openStore: () => {
      window.open(resolveStoreUrl(), '_blank', 'noopener');
    },
    onVisibilityChange: (listener) => {
      document.addEventListener('visibilitychange', () => listener(document.visibilityState === 'visible'));
    },
    getSize: windowSize,
    onResize: (listener) => {
      window.addEventListener('resize', () => listener(windowSize()));
    },
  };
}
