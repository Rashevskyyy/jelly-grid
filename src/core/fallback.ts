import type { AdNetwork } from '../network';

/**
 * Plain HTML end card for when WebGL fails to start or the context is lost.
 * AppLovin explicitly requires a working fallback in both cases.
 */
export function showFallbackEndCard(network: AdNetwork, reason: string): void {
  console.warn(`[fallback] ${reason}`);
  if (document.querySelector('.fallback')) return;

  document.getElementById('loader')?.remove();
  const card = document.createElement('div');
  card.className = 'fallback';
  card.innerHTML = '<p class="fallback-title">Jelly Grid</p><button class="fallback-cta" type="button">Play now</button>';
  card.querySelector('button')?.addEventListener('click', () => network.openStore());
  document.body.appendChild(card);
}
