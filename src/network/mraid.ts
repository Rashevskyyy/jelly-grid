import { resolveStoreUrl } from './storeUrl';
import type { AdNetwork, Size } from './types';
import { createWebNetwork } from './web';

/** AppLovin, Unity Ads and ironSource all go through this adapter. */
export function createMraidNetwork(name: string): AdNetwork {
  const mraid = window.mraid;
  if (!mraid) {
    // Happens when an MRAID build is opened as a plain web page. Keep it playable.
    console.warn(`[${name}] window.mraid not found, falling back to web behaviour`);
    return createWebNetwork(name);
  }

  const ready = new Promise<void>((resolve) => {
    if (mraid.getState() !== 'loading') resolve();
    else mraid.addEventListener('ready', () => resolve());
  });

  const getSize = (): Size => {
    // ironSource requires getMaxSize() as the source of truth; some containers
    // report 0x0 until layout settles, so fall back to the window in that case.
    const { width, height } = mraid.getMaxSize();
    return width > 0 && height > 0 ? { width, height } : { width: window.innerWidth, height: window.innerHeight };
  };

  return {
    name,
    ready: () => ready,
    viewable: () =>
      ready.then(
        () =>
          new Promise<void>((resolve) => {
            if (mraid.isViewable()) return resolve();
            const onChange = (viewable: boolean) => {
              if (!viewable) return;
              mraid.removeEventListener('viewableChange', onChange);
              resolve();
            };
            mraid.addEventListener('viewableChange', onChange);
          }),
      ),
    openStore: () => mraid.open(resolveStoreUrl()),
    onVisibilityChange: (listener) => {
      void ready.then(() => mraid.addEventListener('viewableChange', listener));
    },
    getSize,
    onResize: (listener) => {
      void ready.then(() => mraid.addEventListener('sizeChange', () => listener(getSize())));
      window.addEventListener('resize', () => listener(getSize()));
    },
  };
}
