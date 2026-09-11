# Jelly Grid

A portfolio playable ad: a block puzzle where the blocks are jelly creatures.
Built with PixiJS v8, GSAP and TypeScript, packaged as a single HTML file per ad network.

> Work in progress. Day 1: skeleton, network adapters, build pipeline, showcase. Day 2: game model with tests, board and drag and drop. Day 3: jelly feel and line-clear payoff. Day 4: hint hand, sound, font.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server for the web build, also reachable from a phone on the same Wi-Fi |
| `npm run dev:mraid` | Dev server with a mock MRAID container (ready, viewable, `mraid.open`) |
| `npm run build` | Builds every network and checks each file against its upload limit |
| `npm run build -- applovin meta` | Builds only the listed networks |
| `npm run fonts` | Regenerates the font subset from `src/copy.ts` (also runs before every build) |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests for the game model and the scripted level |
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
- `src/game/model/`: the puzzle as plain TypeScript with no Pixi imports. `Game.place()` returns a `MoveResult`
  describing everything that happened, and the view only animates that data.
- `src/game/levels/level1.ts` + its test: the scripted session. Tests guarantee that intended moves clear 1, 2
  and 3 lines, that the jar fills only on the last one, and that a wasted move ends in a near miss.
- `src/game/view/`: board, pieces and tray in Pixi. Blocks are sprites sharing textures baked once at startup,
  so the board draws in one batch with zero image bytes. Decorative layers opt out of hit testing.
- `src/scenes/GameScene.ts`: drag and drop. The piece floats above the finger and snaps to the grid; in landscape
  the board shrinks so the bottom row stays reachable with that lift.
- `src/game/view/JellyBlock.ts` + `spring.ts`: every block sits on two damped springs (squash and hop) integrated
  on the game clock, so hit-stop freezes them too. Substeps keep the motion identical at 20 and 120 fps (tested).
- `src/game/view/jellyTuning.ts`: every feel number in one file: impulses, ripple radius and delay, tilt, blink rate.
- `src/game/view/motion.ts`: pure, tested math for the particle arc (quadratic Bézier) and trauma-based
  screen shake, where intensity is trauma squared so small clears barely move and triples really kick.
- `src/game/view/ParticleFlight.ts`: cleared blocks fly to the jar from a sprite pool; the target is a function,
  so particles still land if the phone rotates mid-flight.
- `src/game/view/ComboText.ts`: labels are created and rasterised at startup, so a combo never hitches.
- Scene graph splits a shaking `world` from the still end overlay; hit-stop and shake both run on the game clock.
- `src/game/view/HintView.ts`: the tutorial hand replays the scripted move with the same finger maths as a
  real drag, appears after 1.2 s idle at the start and 3 s later on, and vanishes on any touch.
- `src/audio/`: every sound is synthesized with Web Audio, so audio costs zero bytes. No AudioContext exists
  before the first gesture, and it is suspended whenever the ad is hidden.
- `src/copy.ts` + `scripts/subset-font.ts`: the display font ships only the glyphs used on screen
  (10.7 KB -> 2.4 KB), regenerated on every build so new copy can never miss a glyph.
- `src/core/fallback.ts`: HTML end card if WebGL fails to start or the context is lost.

## Asset credits

- Font: [Lilita One](https://fonts.google.com/specimen/Lilita+One) by Juan Montoreano, SIL Open Font License 1.1
  (`src/assets/fonts/OFL-LilitaOne.txt`), subset for this project.
- Graphics: drawn in code at startup (blocks, eyes, jar, tutorial hand). No image files.
- Sound: synthesized at runtime with Web Audio. No audio files.
