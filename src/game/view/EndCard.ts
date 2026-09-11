import { gsap } from 'gsap';
import { Container, Graphics, Rectangle, Sprite, Text, type PointData } from 'pixi.js';
import { THEME } from '../../config';
import { COPY } from '../../copy';
import { DISPLAY_FONT } from '../../core/fonts';
import type { Layout } from '../../core/layout';
import type { ColorId } from '../model/types';
import { JellyBlock } from './JellyBlock';
import { IMPULSE } from './jellyTuning';
import type { GameTextures } from './textures';

export type EndReason = 'won' | 'lost' | 'timeout';

export interface EndCardSounds {
  drop(index: number): void;
  ctaAppear(): void;
}

const CHARACTER_COLORS: ColorId[] = [0, 2, 4, 1, 3];
const CHARACTER_SPACING = 112;
const DROP_HEIGHT = 520;
const BUTTON = { width: 470, height: 132, lip: 12 };

/**
 * Full-screen end card: the result, a row of jelly characters dropping in, the logo, and a pulsing CTA.
 * The whole card is one tap target, since every tap here is an explicit request to get the game.
 * It sits outside the shaking world, so screen shake from the last combo never moves it.
 */
export class EndCard {
  readonly view = new Container();
  private readonly backdrop = new Graphics();
  private readonly rays: Sprite;
  private readonly heading: Text;
  private readonly logo: Text;
  private readonly tagline: Text;
  private readonly charactersLayer = new Container();
  private readonly characters: JellyBlock[] = [];
  private readonly homes: PointData[] = [];
  private readonly cta = new Container(); // press feedback
  private readonly ctaPulse = new Container(); // idle pulse
  private readonly sounds: EndCardSounds;
  private logoFit = 1;
  private shown = false;
  private nextHop = 0.8;

  constructor(textures: GameTextures, sounds: EndCardSounds, onCta: () => void) {
    this.sounds = sounds;
    this.view.visible = false;
    this.view.eventMode = 'static';
    this.view.cursor = 'pointer';
    this.view.on('pointerdown', () => gsap.to(this.cta.scale, { x: 0.94, y: 0.94, duration: 0.08 }));
    this.view.on('pointerup', () => gsap.to(this.cta.scale, { x: 1, y: 1, duration: 0.3, ease: 'back.out(3)' }));
    this.view.on('pointerupoutside', () => gsap.to(this.cta.scale, { x: 1, y: 1, duration: 0.2 }));
    this.view.on('pointertap', onCta);

    this.rays = new Sprite({ texture: textures.rays, anchor: 0.5 });
    this.heading = new Text({
      text: '',
      style: { fontFamily: DISPLAY_FONT, fontSize: 64, fill: THEME.cream },
    });
    this.logo = new Text({
      text: COPY.title,
      style: {
        fontFamily: DISPLAY_FONT,
        fontSize: 150,
        fill: THEME.blocks[4],
        stroke: { color: THEME.backgroundDeep, width: 20, join: 'round' },
        dropShadow: { color: THEME.backgroundDeep, alpha: 0.5, angle: Math.PI / 2, distance: 10, blur: 0 },
      },
    });
    this.tagline = new Text({
      text: COPY.tagline,
      style: { fontFamily: DISPLAY_FONT, fontSize: 44, fill: THEME.cream },
    });
    for (const text of [this.heading, this.logo, this.tagline]) text.anchor.set(0.5);
    this.tagline.alpha = 0.85;

    CHARACTER_COLORS.forEach((color) => {
      const block = new JellyBlock(color, textures);
      block.view.scale.set(1.35);
      this.characters.push(block);
      this.homes.push({ x: 0, y: 0 });
      this.charactersLayer.addChild(block.view);
    });

    const lip = new Graphics()
      .roundRect(-BUTTON.width / 2, -BUTTON.height / 2 + BUTTON.lip, BUTTON.width, BUTTON.height, BUTTON.height / 2)
      .fill(0xd9a92e);
    const face = new Graphics()
      .roundRect(-BUTTON.width / 2, -BUTTON.height / 2, BUTTON.width, BUTTON.height, BUTTON.height / 2)
      .fill(THEME.blocks[4])
      .roundRect(-BUTTON.width / 2 + 34, -BUTTON.height / 2 + 14, BUTTON.width - 68, 22, 11)
      .fill({ color: 0xffffff, alpha: 0.35 });
    const label = new Text({ text: COPY.cta, style: { fontFamily: DISPLAY_FONT, fontSize: 68, fill: THEME.backgroundDeep } });
    label.anchor.set(0.5);
    label.y = 4;
    this.ctaPulse.addChild(lip, face, label);
    this.cta.addChild(this.ctaPulse);

    this.view.addChild(this.backdrop, this.rays, this.heading, this.charactersLayer, this.logo, this.tagline, this.cta);
  }

  /** True once the card fully covers the game, so the scene can stop updating what's underneath. */
  get covering(): boolean {
    return this.view.visible && this.view.alpha >= 1;
  }

  resize(layout: Layout): void {
    const { safe, portrait, viewWidth, viewHeight } = layout;
    this.backdrop.clear().rect(0, 0, viewWidth, viewHeight).fill(THEME.background);
    this.view.hitArea = new Rectangle(0, 0, viewWidth, viewHeight);

    const column = portrait
      ? { x: safe.x + safe.width / 2, heading: 190, characters: 480, logo: 660, tagline: 770, maxLogoWidth: 660 }
      : { x: safe.x + 390, heading: 110, characters: 300, logo: 460, tagline: 560, maxLogoWidth: 600 };
    const ctaAt = portrait ? { x: column.x, y: safe.y + 1010 } : { x: safe.x + 1010, y: safe.y + 430 };

    this.rays.position.set(column.x, safe.y + column.characters - 30);
    this.heading.position.set(column.x, safe.y + column.heading);
    this.logo.scale.set(1);
    this.logoFit = Math.min(1, column.maxLogoWidth / this.logo.width);
    this.logo.scale.set(this.logoFit);
    this.logo.position.set(column.x, safe.y + column.logo);
    this.tagline.position.set(column.x, safe.y + column.tagline);
    this.cta.position.copyFrom(ctaAt);

    this.characters.forEach((block, index) => {
      const offset = index - (this.characters.length - 1) / 2;
      // A gentle smile: characters at the ends sit a little lower.
      this.homes[index] = { x: column.x + offset * CHARACTER_SPACING, y: safe.y + column.characters + Math.abs(offset) * 16 };
      if (this.shown) {
        gsap.killTweensOf(block.view);
        block.view.position.copyFrom(this.homes[index]);
      }
    });
  }

  show(reason: EndReason): void {
    this.heading.text = COPY.end[reason];
    this.shown = true;
    this.view.visible = true;
    this.view.alpha = 0;
    gsap.to(this.view, { alpha: 1, duration: 0.25 });

    this.characters.forEach((block, index) => {
      const home = this.homes[index];
      block.view.position.set(home.x, home.y - DROP_HEIGHT);
      gsap.to(block.view, {
        y: home.y,
        duration: 0.38,
        delay: 0.15 + index * 0.08,
        ease: 'power2.in',
        onComplete: () => {
          block.impulse(IMPULSE.land.squash, IMPULSE.land.hop);
          this.sounds.drop(index);
        },
      });
    });

    gsap.fromTo(this.logo.scale, { x: 0, y: 0 }, { x: this.logoFit, y: this.logoFit, duration: 0.5, delay: 0.5, ease: 'back.out(2)' });
    gsap.fromTo(this.tagline, { alpha: 0 }, { alpha: 0.85, duration: 0.3, delay: 0.8 });
    gsap.fromTo(
      this.ctaPulse.scale,
      { x: 0, y: 0 },
      {
        x: 1,
        y: 1,
        duration: 0.45,
        delay: 0.95,
        ease: 'back.out(2.2)',
        onStart: () => this.sounds.ctaAppear(),
        onComplete: () => {
          gsap.to(this.ctaPulse.scale, { x: 1.07, y: 1.07, duration: 0.55, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        },
      },
    );
  }

  update(dt: number): void {
    if (!this.view.visible) return;
    this.rays.rotation += dt * 0.12;

    const target = this.cta.position;
    for (const block of this.characters) {
      block.lookAt(this.charactersLayer.toLocal(target, this.view));
      block.update(dt);
    }

    this.nextHop -= dt;
    if (this.nextHop <= 0) {
      this.nextHop = 0.6 + Math.random() * 0.7;
      const block = this.characters[Math.floor(Math.random() * this.characters.length)];
      block.impulse(IMPULSE.ripple.squash, IMPULSE.ripple.hop * 1.2);
      if (Math.random() < 0.3) block.blink();
    }
  }
}
