# Jelly Grid

A portfolio playable ad: a block puzzle where the blocks are jelly creatures.
Built with PixiJS v8, GSAP and TypeScript, packaged as a single HTML file per ad network.

> Work in progress. Day 1: project skeleton, network adapters, build pipeline.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server for the web build, also reachable from a phone on the same Wi-Fi |
| `npm run dev:mraid` | Dev server with a mock MRAID container (ready, viewable, `mraid.open`) |
| `npm run build` | Builds every network and checks each file against its upload limit |
| `npm run build -- applovin meta` | Builds only the listed networks |
| `npm run typecheck` | TypeScript check |
| `npm run showcase` | Assembles the showcase site in `site/` (run `npm run build` first) |
| `npm run showcase:preview` | Serves `site/` on the local network; the QR code points to this machine |

Requires Node.js 22.18+ (build scripts run as TypeScript directly).

## Showcase and deploy

Every push to `main` runs `.github/workflows/deploy.yml`: typecheck, all network builds with size limits,
then the showcase site is published to GitHub Pages.

- `/` shows the playable in a phone frame with a rotate toggle, a QR code, build sizes and downloads.
  Phones are redirected straight to the full-screen playable (add `?about` to see the page on a phone).
- `/play/` is the playable itself. Put this link in the CV.
- `/builds/` holds the upload-ready file for every network.

Personal and day-specific copy on the page lives in `showcase/profile.ts`.

## Build targets

| Target | Output | Limit | Store exit |
|---|---|---|---|
| `web` | `dist/web/index.html` | none | opens the repo |
| `applovin` | `dist/applovin/index.html` | 5 MB | `mraid.open()` |
| `unity` | `dist/unity/index.html` | 5 MB | `mraid.open()` |
| `ironsource` | `dist/ironsource/index.html` | 4 MB | `mraid.open()` |
| `google` | `dist/google.zip` | 5 MB | `ExitApi.exit()` |
| `meta` | `dist/meta/index.html` | 2 MB | `FbPlayableAd.onCTAClick()` |

## How it is put together

- `build/networks.ts`: one table with limits, packaging and head tags for every network.
- `src/network/`: the game talks to one `AdNetwork` interface; adapters hide MRAID, ExitApi and FbPlayableAd.
- `src/core/session.ts`: the timer starts on the first interaction, and the first tap never leaves the ad.
- `src/core/clock.ts`: GSAP runs on the Pixi ticker, so pausing the ad freezes everything and hit-stop is one call.
- `src/core/app.ts` + `build/pixiLean.ts`: WebGL renderer without `Application`, so the WebGPU and Canvas renderers,
  filters and accessibility never reach the bundle (619 KB -> 520 KB on the empty scene).
- `src/core/fallback.ts`: HTML end card if WebGL fails to start or the context is lost.

## Asset credits

No third-party assets yet.
