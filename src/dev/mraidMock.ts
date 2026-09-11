/**
 * Minimal MRAID stand-in for `npm run dev:mraid`. Imported only behind
 * `import.meta.env.DEV`, so it never reaches a production build.
 */
export function installMraidMock(): void {
  type Listener = (...args: unknown[]) => void;
  const listeners = new Map<string, Set<Listener>>();
  const emit = (event: string, ...args: unknown[]) => listeners.get(event)?.forEach((listener) => listener(...args));

  let state: ReturnType<Mraid['getState']> = 'loading';
  let viewable = false;

  const mock = {
    getState: () => state,
    isViewable: () => viewable,
    getMaxSize: () => ({ width: window.innerWidth, height: window.innerHeight }),
    open: (url: string) => {
      console.info('[mraid-mock] open', url);
      window.alert(`mraid.open(${url})`);
    },
    addEventListener: (event: string, listener: Listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)?.add(listener);
    },
    removeEventListener: (event: string, listener: Listener) => {
      listeners.get(event)?.delete(listener);
    },
  };
  window.mraid = mock as unknown as Mraid;

  // Simulate a real container: SDK ready after 300 ms, ad on screen after 1 s.
  window.setTimeout(() => {
    state = 'default';
    emit('ready');
  }, 300);
  window.setTimeout(() => {
    viewable = true;
    emit('viewableChange', true);
  }, 1000);

  document.addEventListener('visibilitychange', () => {
    viewable = document.visibilityState === 'visible';
    emit('viewableChange', viewable);
  });
  window.addEventListener('resize', () => emit('sizeChange', window.innerWidth, window.innerHeight));
  console.info('[mraid-mock] installed');
}
