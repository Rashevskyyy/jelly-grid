import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { NETWORKS, isNetwork, type Network } from './build/networks.ts';
import { pixiLean } from './build/pixiLean.ts';

/** Injects network-specific tags (Google orientation meta, ExitApi script, ...) into <head>. */
function networkHead(network: Network): Plugin {
  return {
    name: 'jelly-grid:network-head',
    transformIndexHtml: { order: 'post', handler: () => NETWORKS[network].headTags },
  };
}

export default defineConfig(({ mode, isPreview }) => {
  // `vite preview` serves the assembled showcase site from scripts/build-showcase.ts.
  if (isPreview) {
    return { build: { outDir: 'site' }, preview: { host: true, port: 4173, strictPort: true } };
  }

  // `vite` without --mode runs in "development": treat it as the web showcase build.
  const network = mode === 'development' ? 'web' : mode;
  if (!isNetwork(network)) {
    throw new Error(`Unknown mode "${mode}". Expected one of: ${Object.keys(NETWORKS).join(', ')}`);
  }

  return {
    define: {
      __NETWORK__: JSON.stringify(network),
    },
    server: {
      host: true, // expose on LAN so the dev build opens on a phone
    },
    build: {
      outDir: `dist/${network}`,
      emptyOutDir: true,
      target: 'es2020',
      assetsInlineLimit: Number.MAX_SAFE_INTEGER, // every imported asset becomes a data URI
      reportCompressedSize: false, // networks limit raw bytes, gzip numbers only mislead here
    },
    plugins: [pixiLean(), networkHead(network), viteSingleFile({ removeViteModuleLoader: true })],
  };
});
