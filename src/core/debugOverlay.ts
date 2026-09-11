import type { Ticker } from 'pixi.js';

export const INTERACTIVE_MARK = 'jelly:interactive';

/**
 * On-device performance readout for the showcase build: open /play/?debug on a phone.
 * Plain DOM rather than Pixi Text, so measuring doesn't add rendering work of its own.
 * main.ts only imports this in the web build, so ad network builds never contain it.
 */
export function mountDebugOverlay(ticker: Ticker): void {
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;left:8px;top:8px;z-index:10;padding:6px 9px;border-radius:8px;background:rgba(0,0,0,.65);' +
    'color:#fff;font:12px/1.45 ui-monospace,monospace;pointer-events:none;white-space:pre';
  document.body.appendChild(panel);

  const frames = new Float32Array(180); // last ~3 s at 60 fps, ring buffer: no allocation per frame
  let count = 0;
  ticker.add(({ deltaMS }) => {
    frames[count % frames.length] = deltaMS;
    count += 1;
  });

  window.setInterval(() => {
    const samples = Array.from(frames.subarray(0, Math.min(count, frames.length))).sort((a, b) => a - b);
    if (samples.length === 0) return;
    const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    const p95 = samples[Math.floor(samples.length * 0.95)];
    const interactive = performance.getEntriesByName(INTERACTIVE_MARK)[0]?.startTime;
    const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
    panel.textContent = [
      `fps          ${(1000 / average).toFixed(0)}`,
      `p95 frame    ${p95.toFixed(1)} ms`,
      `interactive  ${interactive ? `${Math.round(interactive)} ms` : '-'}`,
      heap ? `js heap      ${(heap / 1048576).toFixed(1)} MB` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }, 500);
}
