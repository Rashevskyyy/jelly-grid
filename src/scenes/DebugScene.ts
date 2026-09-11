import { gsap } from 'gsap';
import { Container, Graphics, Text, type PointData } from 'pixi.js';
import { THEME } from '../config';
import type { GameClock } from '../core/clock';
import type { Layout } from '../core/layout';
import type { Session } from '../core/session';
import type { AdNetwork } from '../network';
import type { Scene } from './Scene';

const BLOCK = 170;
const PUPIL_REACH = 10;
const FONT = 'system-ui, -apple-system, Roboto, sans-serif';

interface Deps {
  network: AdNetwork;
  session: Session;
  clock: GameClock;
}

/**
 * Day-1 scene: checks layout in both orientations, the container lifecycle,
 * the first-tap rule and the CTA path on a real phone. Replaced by the game on day 2.
 */
export class DebugScene implements Scene {
  readonly view = new Container();
  private readonly deps: Deps;
  private readonly backdrop = new Graphics();
  private readonly safeBox = new Graphics();
  private readonly jelly = new Container(); // idle breathing lives here
  private readonly jellyBody = new Container(); // tap squash lives here
  private readonly pupils: Graphics[] = [];
  private readonly info = new Text({
    text: '',
    style: { fontFamily: FONT, fontSize: 26, lineHeight: 36, fill: THEME.cream },
  });
  private readonly cta = new Container();
  private layout: Layout | null = null;

  constructor(deps: Deps) {
    this.deps = deps;
    this.view.eventMode = 'static';
    this.view.addChild(this.backdrop, this.safeBox, this.info, this.jelly, this.cta);
    this.buildJelly();
    this.buildCta();
    this.view.on('globalpointermove', (event) => this.lookAt(event.global));
    deps.session.onStart(() => this.refreshInfo());
  }

  resize(layout: Layout): void {
    this.layout = layout;
    const { viewWidth, viewHeight, safe, portrait } = layout;

    this.backdrop.clear().rect(0, 0, viewWidth, viewHeight).fill(THEME.backgroundDeep);
    this.safeBox
      .clear()
      .roundRect(safe.x, safe.y, safe.width, safe.height, 32)
      .fill(THEME.background)
      .stroke({ width: 3, color: THEME.cream, alpha: 0.15 });

    this.info.position.set(safe.x + 40, safe.y + 40);
    if (portrait) {
      this.jelly.position.set(safe.x + safe.width / 2, safe.y + safe.height * 0.6);
      this.cta.position.set(safe.x + safe.width / 2, safe.y + safe.height - 130);
    } else {
      this.jelly.position.set(safe.x + safe.width * 0.33, safe.y + safe.height * 0.72);
      this.cta.position.set(safe.x + safe.width * 0.72, safe.y + safe.height * 0.6);
    }
    this.refreshInfo();
  }

  start(): void {
    gsap.to(this.jelly.scale, { x: 1.04, y: 0.96, duration: 0.9, ease: 'sine.inOut', repeat: -1, yoyo: true });
  }

  private buildJelly(): void {
    const body = new Graphics()
      .roundRect(-BLOCK / 2, -BLOCK, BLOCK, BLOCK, 44)
      .fill(THEME.blocks[0])
      .roundRect(-BLOCK / 2 + 24, -BLOCK + 18, BLOCK * 0.36, 22, 11)
      .fill({ color: 0xffffff, alpha: 0.35 }); // glossy highlight
    this.jellyBody.addChild(body);

    for (const x of [-34, 34]) {
      // In Pixi v8 only Containers may have children, so the eye is a container of two shapes.
      const eye = new Container();
      const pupil = new Graphics().circle(0, 0, 10).fill(THEME.backgroundDeep);
      eye.addChild(new Graphics().circle(0, 0, 22).fill(0xffffff), pupil);
      eye.position.set(x, -BLOCK * 0.52);
      this.jellyBody.addChild(eye);
      this.pupils.push(pupil);
    }

    this.jelly.addChild(this.jellyBody);
    this.jellyBody.eventMode = 'static';
    this.jellyBody.cursor = 'pointer';
    this.jellyBody.on('pointerdown', () => this.squish());
  }

  private buildCta(): void {
    const pill = new Graphics().roundRect(-170, -48, 340, 96, 48).fill(THEME.blocks[4]);
    const label = new Text({
      text: 'Play now',
      style: { fontFamily: FONT, fontSize: 40, fontWeight: '800', fill: THEME.backgroundDeep },
    });
    label.anchor.set(0.5);
    this.cta.addChild(pill, label);
    this.cta.eventMode = 'static';
    this.cta.cursor = 'pointer';
    this.cta.on('pointertap', () => {
      // Networks reject ads that leave on the very first tap.
      if (!this.deps.session.canOpenStore) {
        gsap.fromTo(this.cta, { rotation: -0.08 }, { rotation: 0, duration: 0.5, ease: 'elastic.out(1.5, 0.3)' });
        return;
      }
      this.deps.network.openStore();
    });
  }

  private squish(): void {
    gsap.killTweensOf(this.jellyBody.scale);
    gsap
      .timeline()
      .to(this.jellyBody.scale, { x: 1.28, y: 0.72, duration: 0.07, ease: 'power2.out' })
      .call(() => this.deps.clock.hitStop(60))
      .to(this.jellyBody.scale, { x: 1, y: 1, duration: 0.7, ease: 'elastic.out(1.2, 0.3)' });
  }

  private lookAt(global: PointData): void {
    for (const pupil of this.pupils) {
      const eye = pupil.parent;
      if (!eye) continue;
      const local = eye.toLocal(global);
      const distance = Math.hypot(local.x, local.y) || 1;
      const reach = Math.min(distance, PUPIL_REACH);
      pupil.position.set((local.x / distance) * reach, (local.y / distance) * reach);
    }
  }

  private refreshInfo(): void {
    if (!this.layout) return;
    const { network, session } = this.deps;
    const size = network.getSize();
    this.info.text = [
      `network: ${network.name}`,
      `${this.layout.portrait ? 'portrait' : 'landscape'} ${Math.round(size.width)}x${Math.round(size.height)}`,
      `scale: ${this.layout.scale.toFixed(2)}`,
      `session: ${session.started ? 'started' : 'waiting for first tap'}`,
    ].join('\n');
  }
}
