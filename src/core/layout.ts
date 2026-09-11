import { DESIGN } from '../config';
import type { Size } from '../network';

export interface Layout {
  portrait: boolean;
  /** Design units -> CSS pixels. */
  scale: number;
  /** Full screen size in design units: use it to anchor things to real edges. */
  viewWidth: number;
  viewHeight: number;
  /** The design safe box, centred on screen, in design units. */
  safe: { x: number; y: number; width: number; height: number };
}

export function computeLayout({ width, height }: Size): Layout {
  const portrait = height >= width;
  const safeWidth = portrait ? DESIGN.short : DESIGN.long;
  const safeHeight = portrait ? DESIGN.long : DESIGN.short;
  const scale = Math.min(width / safeWidth, height / safeHeight);
  const viewWidth = width / scale;
  const viewHeight = height / scale;

  return {
    portrait,
    scale,
    viewWidth,
    viewHeight,
    safe: {
      x: (viewWidth - safeWidth) / 2,
      y: (viewHeight - safeHeight) / 2,
      width: safeWidth,
      height: safeHeight,
    },
  };
}
