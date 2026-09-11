/// <reference types="vite/client" />

/** Build target, replaced with a string literal at build time (see vite.config.ts). */
declare const __NETWORK__: import('../build/networks.ts').Network;

interface ImportMetaEnv {
  /** Repository URL, injected by CI. The web build's CTA points here. */
  readonly VITE_REPO_URL?: string;
}
