import { Graphics, type PointData, type Renderer, type Texture } from 'pixi.js';
import { THEME } from '../../config';
import { BLOCK } from './constants';

export interface GameTextures {
  /** One texture per ColorId. */
  readonly blocks: readonly Texture[];
  readonly eyeWhite: Texture;
  readonly pupil: Texture;
  readonly ghost: Texture;
  readonly emptyCell: Texture;
  /** Tutorial hand. `tip` is the anchor that puts the fingertip exactly on the sprite position. */
  readonly hand: { texture: Texture; tip: PointData };
}

/**
 * Every block on screen is a Sprite sharing a handful of textures baked once at startup:
 * the whole board renders in a single batch and costs zero bytes of image assets.
 */
export function createGameTextures(renderer: Renderer): GameTextures {
  const half = BLOCK / 2;
  const bake = (graphics: Graphics): Texture => {
    const texture = renderer.generateTexture({ target: graphics, resolution: 1.5 });
    graphics.destroy();
    return texture;
  };

  const blocks = THEME.blocks.map((color) =>
    bake(
      new Graphics()
        .roundRect(-half, -half, BLOCK, BLOCK, 18)
        .fill(color)
        .roundRect(-half + 6, half - 20, BLOCK - 12, 14, 7)
        .fill({ color: 0x000000, alpha: 0.1 }) // soft underside gives the block some volume
        .roundRect(-half + 12, -half + 8, BLOCK * 0.4, 10, 5)
        .fill({ color: 0xffffff, alpha: 0.4 }),
    ),
  );

  const ghost = bake(
    new Graphics()
      .roundRect(-half, -half, BLOCK, BLOCK, 18)
      .fill({ color: 0xffffff, alpha: 0.18 })
      .stroke({ width: 3, color: 0xffffff, alpha: 0.55 }),
  );

  const emptyCell = bake(new Graphics().roundRect(-half, -half, BLOCK, BLOCK, 16).fill({ color: 0x000000, alpha: 0.18 }));

  const eyeWhite = bake(new Graphics().circle(0, 0, 10).fill(0xffffff));
  const pupil = bake(new Graphics().circle(0, 0, 5).fill(THEME.backgroundDeep));

  return { blocks, eyeWhite, pupil, ghost, emptyCell, hand: bakeHand(renderer) };
}

/** A cartoon pointing hand drawn from rounded shapes, fingertip at 0,0. */
function bakeHand(renderer: Renderer): GameTextures['hand'] {
  type Shape = (g: Graphics, grow: number) => Graphics;
  const shapes: Shape[] = [
    (g, k) => g.roundRect(-14 - k, -k, 28 + k * 2, 84 + k * 2, 14 + k), // index finger
    (g, k) => g.roundRect(-18 - k, 46 - k, 80 + k * 2, 72 + k * 2, 28 + k), // palm
    (g, k) => g.circle(26, 52, 14 + k), // folded fingers
    (g, k) => g.circle(46, 58, 13 + k),
    (g, k) => g.ellipse(-26, 84, 20 + k, 12 + k), // thumb
  ];
  const hand = new Graphics();
  // Outline pass first, fill pass on top: overlapping shapes merge into one silhouette.
  for (const shape of shapes) shape(hand, 7).fill(THEME.backgroundDeep);
  for (const shape of shapes) shape(hand, 0).fill(THEME.cream);
  hand.roundRect(-10, 112, 70, 34, 10).fill(THEME.blocks[3]).stroke({ width: 6, color: THEME.backgroundDeep }); // sleeve

  const bounds = hand.getLocalBounds();
  const texture = renderer.generateTexture({ target: hand, resolution: 1.5 });
  hand.destroy();
  return { texture, tip: { x: -bounds.minX / bounds.width, y: -bounds.minY / bounds.height } };
}
