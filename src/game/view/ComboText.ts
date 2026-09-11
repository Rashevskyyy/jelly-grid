import { gsap } from 'gsap';
import { Container, Text, type PointData } from 'pixi.js';
import { THEME } from '../../config';
import { COMBO } from './jellyTuning';

const FONT = 'system-ui, -apple-system, Roboto, sans-serif';
const HIDDEN_ALPHA = 0.001;

/**
 * "Sweet!", "Double!"... Every label is created up front and kept at near-zero alpha, so its canvas
 * texture is rasterised on the first frame instead of causing a hitch at the moment of the combo.
 */
export class ComboText {
  readonly view = new Container();
  private readonly labels = new Map<string, Text>();

  constructor() {
    this.view.eventMode = 'none';
    for (const { label } of COMBO) {
      const text = new Text({
        text: label,
        style: {
          fontFamily: FONT,
          fontSize: 96,
          fontWeight: '900',
          fill: THEME.blocks[4],
          stroke: { color: THEME.backgroundDeep, width: 14, join: 'round' },
        },
      });
      text.anchor.set(0.5);
      text.alpha = HIDDEN_ALPHA;
      this.labels.set(label, text);
      this.view.addChild(text);
    }
  }

  /** @param strength 0..1, bigger combos pop bigger */
  show(label: string, at: PointData, strength: number): void {
    const text = this.labels.get(label);
    if (!text) return;
    gsap.killTweensOf([text, text.scale]);
    this.view.addChild(text); // newest on top
    const scale = 0.75 + strength * 0.45;
    text.position.copyFrom(at);
    text.rotation = (Math.random() * 2 - 1) * 0.12;
    text.alpha = 1;
    text.scale.set(0);

    gsap.to(text.scale, { x: scale, y: scale, duration: 0.35, ease: 'back.out(2.6)' });
    gsap.to(text, { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    gsap.to(text, { y: at.y - 80, duration: 1, ease: 'power1.out' });
    gsap.to(text, { alpha: HIDDEN_ALPHA, duration: 0.3, delay: 0.7 });
  }
}
