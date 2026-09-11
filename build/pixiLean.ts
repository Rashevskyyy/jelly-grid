import type { Plugin } from 'vite';

const EMPTY = '\0jelly-grid:empty';
const ENVIRONMENT_BUNDLES = /(^|\/)(browserAll|webworkerAll)\.m?js$/;

/**
 * Pixi registers "environment" extensions that dynamically import every optional
 * feature (filters, accessibility, DOM, ...). A single-file build inlines those
 * dynamic imports, so they would ship even though we never load them at runtime.
 * We replace them with an empty module and import only what we use in src/core/app.ts.
 */
export function pixiLean(): Plugin {
  return {
    name: 'jelly-grid:pixi-lean',
    apply: 'build',
    enforce: 'pre',
    resolveId(source, importer) {
      if (importer?.includes('pixi.js') && ENVIRONMENT_BUNDLES.test(source)) return EMPTY;
      return null;
    },
    load(id) {
      return id === EMPTY ? 'export {};' : null;
    },
  };
}
