import { Container, Graphics, type PointData } from 'pixi.js';
import { THEME } from '../../config';
import { JAR_BUMP, JAR_CELEBRATE, JAR_LEVEL, JAR_SQUASH } from './jellyTuning';
import { isAtRest, stepSpring, type SpringState } from './spring';

const BODY_WIDTH = 130;
const BODY_HEIGHT = 130;
const INSET = 8;
const INNER_WIDTH = BODY_WIDTH - INSET * 2;
const INNER_HEIGHT = BODY_HEIGHT - INSET * 2;

/**
 * The goal meter: a glass jar filling with jelly. Origin is the bottom centre, so a bump squashes it
 * onto its base. The fill level rides a spring and sloshes a little every time particles land.
 */
export class JarView {
  readonly view = new Container();
  private readonly body = new Container();
  private readonly fill = new Graphics();
  private readonly level: SpringState = { value: 0, velocity: 0 };
  private readonly squash: SpringState = { value: 0, velocity: 0 };
  private targetLevel = 0;
  private drawnLevel = -1;

  constructor() {
    const glass = new Graphics()
      .roundRect(-BODY_WIDTH / 2, -BODY_HEIGHT, BODY_WIDTH, BODY_HEIGHT, 34)
      .fill({ color: THEME.backgroundDeep, alpha: 0.6 });
    const outline = new Graphics()
      .roundRect(-BODY_WIDTH / 2, -BODY_HEIGHT, BODY_WIDTH, BODY_HEIGHT, 34)
      .stroke({ width: 5, color: THEME.cream, alpha: 0.45 })
      .roundRect(-50, -BODY_HEIGHT - 22, 100, 24, 10) // neck rim
      .fill({ color: THEME.cream, alpha: 0.4 })
      .roundRect(-BODY_WIDTH / 2 + 14, -BODY_HEIGHT + 18, 12, 64, 6) // glass shine, drawn over the jelly
      .fill({ color: 0xffffff, alpha: 0.18 });
    this.body.addChild(glass, this.fill, outline);
    this.view.addChild(this.body);
    this.redraw();
  }

  /** Where particles enter, in the jar's local coordinates. */
  readonly mouth: PointData = { x: 0, y: -BODY_HEIGHT - 10 };

  /** 0..1 */
  setLevel(value: number): void {
    this.targetLevel = Math.max(0, Math.min(1, value));
  }

  bump(): void {
    this.squash.velocity += JAR_BUMP;
    this.level.velocity += 0.35; // a little splash on the surface
  }

  celebrate(): void {
    this.squash.velocity += JAR_CELEBRATE;
  }

  update(dt: number): void {
    stepSpring(this.level, JAR_LEVEL, dt, this.targetLevel);
    stepSpring(this.squash, JAR_SQUASH, dt);
    const squash = Math.max(-0.3, Math.min(0.3, this.squash.value));
    this.body.scale.set(1 + squash, 1 - squash * 0.8);
    if (!isAtRest(this.level, this.targetLevel, 1e-4) || this.drawnLevel !== this.targetLevel) this.redraw();
  }

  private redraw(): void {
    const level = Math.max(0, Math.min(1.04, this.level.value));
    this.drawnLevel = isAtRest(this.level, this.targetLevel, 1e-4) ? this.targetLevel : level;
    this.fill.clear();
    const height = INNER_HEIGHT * level;
    if (height < 2) return;
    const top = -INSET - height;
    this.fill
      .roundRect(-INNER_WIDTH / 2, top, INNER_WIDTH, height, Math.min(26, height / 2))
      .fill(THEME.blocks[0])
      .roundRect(-INNER_WIDTH / 2 + 6, top, INNER_WIDTH - 12, Math.min(10, height), 5)
      .fill({ color: 0xffffff, alpha: 0.28 }); // jelly surface highlight
  }
}
