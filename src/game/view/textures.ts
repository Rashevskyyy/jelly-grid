import { Graphics, type Renderer, type Texture } from 'pixi.js';
import { THEME } from '../../config';
import { BLOCK } from './constants';

export interface GameTextures {
  /** One texture per ColorId. */
  readonly blocks: readonly Texture[];
  readonly eyeWhite: Texture;
  readonly pupil: Texture;
  readonly ghost: Texture;
  readonly emptyCell: Texture;
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

  return { blocks, eyeWhite, pupil, ghost, emptyCell };
}
