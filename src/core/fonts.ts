import displayFontUrl from '../assets/fonts/lilita-one-subset.woff2';

export const DISPLAY_FONT_FAMILY = 'Lilita One';
/** Fallbacks keep text readable if the font fails, so a broken font can never break the ad. */
export const DISPLAY_FONT = `'${DISPLAY_FONT_FAMILY}', 'Arial Rounded MT Bold', system-ui, sans-serif`;

/**
 * Pixi rasterises Text to a canvas the first time it renders it, so the font must be ready
 * before any Text is created. The font is inlined, so this normally resolves within a frame;
 * the timeout only guards against a webview that never settles the promise.
 */
export async function loadFonts(timeoutMs = 1500): Promise<void> {
  if (typeof FontFace === 'undefined') return;
  const face = new FontFace(DISPLAY_FONT_FAMILY, `url(${displayFontUrl})`);
  document.fonts.add(face);
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs));
  await Promise.race([face.load().then(() => undefined), timeout]).catch((error: unknown) => {
    console.warn('[fonts] display font failed, using fallback', error);
  });
}
