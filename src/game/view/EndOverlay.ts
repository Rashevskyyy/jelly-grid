import { gsap } from 'gsap';
import { Container, Graphics, Text, type PointData } from 'pixi.js';
import { THEME } from '../../config';

export type EndReason = 'won' | 'lost' | 'timeout';

const TITLES: Record<EndReason, string> = {
  won: 'Level complete',
  lost: 'So close!',
  timeout: 'Almost there',
};

const FONT = 'system-ui, -apple-system, Roboto, sans-serif';

/** Temporary end screen: title and CTA. The real end card arrives on day 5. */
export class EndOverlay {
  readonly view = new Container();
  private readonly dim = new Graphics();
  private readonly content = new Container();
  private readonly title = new Text({
    text: '',
    style: { fontFamily: FONT, fontSize: 64, fontWeight: '800', fill: THEME.cream, align: 'center' },
  });
  private readonly cta = new Container();

  constructor(onCta: () => void) {
    this.view.visible = false;
    this.title.anchor.set(0.5);

    const pill = new Graphics().roundRect(-190, -52, 380, 104, 52).fill(THEME.blocks[4]);
    const label = new Text({
      text: 'Play now',
      style: { fontFamily: FONT, fontSize: 44, fontWeight: '800', fill: THEME.backgroundDeep },
    });
    label.anchor.set(0.5);
    this.cta.addChild(pill, label);
    this.cta.position.set(0, 150);
    this.cta.eventMode = 'static';
    this.cta.cursor = 'pointer';
    this.cta.on('pointertap', onCta);

    this.dim.eventMode = 'static'; // swallow taps on the board behind the overlay
    this.content.addChild(this.title, this.cta);
    this.view.addChild(this.dim, this.content);
  }

  resize(viewWidth: number, viewHeight: number, center: PointData): void {
    this.dim.clear().rect(0, 0, viewWidth, viewHeight).fill({ color: THEME.backgroundDeep, alpha: 0.82 });
    this.content.position.copyFrom(center);
  }

  show(reason: EndReason): void {
    this.title.text = TITLES[reason];
    this.view.visible = true;
    gsap.from(this.dim, { alpha: 0, duration: 0.3 });
    gsap.from(this.content.scale, { x: 0.6, y: 0.6, duration: 0.5, ease: 'back.out(1.8)' });
    gsap.from(this.content, { alpha: 0, duration: 0.25 });
  }
}
