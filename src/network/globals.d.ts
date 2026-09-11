/** Minimal MRAID 2.0/3.0 surface we rely on. The container injects `window.mraid`. */
interface Mraid {
  getState(): 'loading' | 'default' | 'expanded' | 'resized' | 'hidden';
  isViewable(): boolean;
  getMaxSize(): { width: number; height: number };
  open(url: string): void;
  addEventListener(event: 'ready', listener: () => void): void;
  addEventListener(event: 'viewableChange', listener: (viewable: boolean) => void): void;
  addEventListener(event: 'sizeChange', listener: (width: number, height: number) => void): void;
  removeEventListener(event: string, listener: (...args: never[]) => void): void;
}

interface Window {
  mraid?: Mraid;
  /** Google Ads HTML5: loaded from exitapi.js in <head>. */
  ExitApi?: { exit(): void };
  /** Meta playables: injected by the Meta ad container. */
  FbPlayableAd?: { onCTAClick(): void };
}
