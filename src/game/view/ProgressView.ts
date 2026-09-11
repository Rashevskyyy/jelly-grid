import { gsap } from 'gsap';
import { Container, Graphics } from 'pixi.js';
import { THEME } from '../../config';

const HEIGHT = 36;

/** Goal meter. A plain bar for now; it becomes the jelly jar on day 3. */
export class ProgressView {
  readonly view = new Container();
  private readonly track = new Graphics();
  private readonly fill = new Graphics();
  private readonly state = { value: 0 };
  private width = 0;

  constructor() {
    this.view.addChild(this.track, this.fill);
  }

  resize(width: number): void {
    this.width = width;
    this.track.clear().roundRect(0, 0, width, HEIGHT, HEIGHT / 2).fill(THEME.backgroundDeep);
    this.redraw();
  }

  /** 0..1 */
  setValue(value: number): void {
    gsap.to(this.state, {
      value: Math.min(1, value),
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => this.redraw(),
    });
  }

  private redraw(): void {
    const inset = 6;
    const inner = (this.width - inset * 2) * this.state.value;
    this.fill.clear();
    if (inner < 1) return;
    const height = HEIGHT - inset * 2;
    this.fill.roundRect(inset, inset, Math.max(inner, height), height, height / 2).fill(THEME.blocks[0]);
  }
}
