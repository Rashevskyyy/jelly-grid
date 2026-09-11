import { gsap } from 'gsap';
import { Container, Graphics, Rectangle, type FederatedPointerEvent, type PointData, type Renderer } from 'pixi.js';
import { THEME } from '../config';
import type { GameClock } from '../core/clock';
import type { Layout } from '../core/layout';
import type { Session } from '../core/session';
import { LEVEL_1 } from '../game/levels/level1';
import { Game, type MoveResult } from '../game/model/Game';
import type { GridPos } from '../game/model/types';
import { BoardView, type MovePlayback } from '../game/view/BoardView';
import { ComboText } from '../game/view/ComboText';
import { CELL, DRAG_LIFT } from '../game/view/constants';
import { EndOverlay, type EndReason } from '../game/view/EndOverlay';
import { JarView } from '../game/view/JarView';
import {
  BLINK_INTERVAL,
  comboFor,
  COMBO,
  DRAG_TILT_MAX,
  DRAG_TILT_PER_SPEED,
  IMPULSE,
  SHAKE,
  WATCH_JAR_SECONDS,
} from '../game/view/jellyTuning';
import { addTrauma, stepShake, type ShakeState } from '../game/view/motion';
import { ParticleFlight } from '../game/view/ParticleFlight';
import { PieceView } from '../game/view/PieceView';
import { createGameTextures } from '../game/view/textures';
import type { AdNetwork } from '../network';
import type { Scene } from './Scene';

export interface GameSceneDeps {
  network: AdNetwork;
  session: Session;
  clock: GameClock;
  renderer: Renderer;
}

/** Tray slot in world coordinates: centre, touch area and the scale pieces rest at. */
interface SlotLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

interface DragState {
  slot: number;
  pointerId: number;
  pointer: PointData;
  piece: PieceView;
  target: GridPos | null;
}

/** Pause between the last particle landing and the end screen, in seconds. */
const END_DELAY = 0.35;

/**
 * Scene graph:
 *   view (input hit area)
 *   ├─ world (shakes)  backdrop, board, jar, tray slots, pieces, particles, combo text
 *   └─ endOverlay      stays still while the world shakes
 * All gameplay coordinates are in `world` space.
 */
export class GameScene implements Scene {
  readonly view = new Container();
  private readonly world = new Container();
  private readonly deps: GameSceneDeps;
  private readonly game = new Game(LEVEL_1);
  private readonly backdrop = new Graphics();
  private readonly board: BoardView;
  private readonly jar = new JarView();
  private readonly slotAreas: Container[] = [];
  private readonly pieces: Array<PieceView | null>;
  private readonly piecesLayer = new Container();
  private readonly particles: ParticleFlight;
  private readonly combo = new ComboText();
  private readonly endOverlay: EndOverlay;
  private slots: SlotLayout[] = [];
  /** Board and dragged pieces share this scale. Landscape shrinks it to leave room for the drag lift. */
  private boardScale = 1;
  private drag: DragState | null = null;
  private started = false;
  private finished = false;

  /** Last mouse position: on desktop the eyes follow the cursor even without a drag. */
  private hoverPointer: PointData | null = null;
  /** Smoothed horizontal drag speed in design units per second, drives the lagging tilt. */
  private dragSpeedX = 0;
  private lastMove = { x: 0, time: 0 };
  private time = 0;
  private nextBlink = BLINK_INTERVAL;
  private watchJarFor = 0;
  private readonly shake: ShakeState = { trauma: 0, time: 0 };
  private screenCenter = { x: 0, y: 0 };
  /** Cells shown in the jar. Lags behind the model while particles are in the air. */
  private jarCount = 0;

  constructor(deps: GameSceneDeps) {
    this.deps = deps;
    const textures = createGameTextures(deps.renderer);

    this.board = new BoardView(this.game.board, textures);
    this.particles = new ParticleFlight(textures);
    this.pieces = this.game.tray.map((piece) => (piece ? new PieceView(piece, textures) : null));
    this.endOverlay = new EndOverlay(() => {
      if (deps.session.canOpenStore) deps.network.openStore();
    });

    // Only the tray slots and the end overlay take input. Everything decorative is excluded from hit testing:
    // otherwise a block sprite under the finger resolves to the scene and the slot never sees the tap.
    this.view.eventMode = 'static';
    for (const layer of [this.backdrop, this.board.view, this.jar.view, this.piecesLayer]) layer.eventMode = 'none';

    this.world.addChild(this.backdrop, this.board.view, this.jar.view);
    this.pieces.forEach((piece, slot) => {
      const area = new Container();
      area.eventMode = 'static';
      area.cursor = 'grab';
      area.on('pointerdown', (event) => this.onSlotDown(slot, event));
      area.on('pointerupoutside', (event) => this.onPointerUp(event));
      this.slotAreas.push(area);
      this.world.addChild(area);
      if (piece) this.piecesLayer.addChild(piece.view);
    });
    this.world.addChild(this.piecesLayer, this.particles.view, this.combo.view);
    this.view.addChild(this.world, this.endOverlay.view);

    this.view.on('globalpointermove', (event) => this.onPointerMove(event));
    this.view.on('pointerup', (event) => this.onPointerUp(event));
    deps.session.onTimeout(() => this.finish('timeout', 0));
    deps.clock.onUpdate((dt) => this.update(dt));
  }

  start(): void {
    this.started = true;
  }

  resize(layout: Layout): void {
    this.cancelDrag();
    const { safe, portrait, viewWidth, viewHeight } = layout;

    // The world shakes around the screen centre, so rotation never swings from a corner.
    this.screenCenter = { x: viewWidth / 2, y: viewHeight / 2 };
    this.world.pivot.copyFrom(this.screenCenter);
    this.world.position.copyFrom(this.screenCenter);

    // Oversized backdrop: a shaking world never reveals an edge.
    const bleed = SHAKE.maxOffset * 4;
    this.backdrop.clear().rect(-bleed, -bleed, viewWidth + bleed * 2, viewHeight + bleed * 2).fill(THEME.background);
    this.view.hitArea = new Rectangle(0, 0, viewWidth, viewHeight); // releases anywhere on screen reach onPointerUp

    if (portrait) {
      this.boardScale = 1;
      this.board.view.position.set(safe.x + (safe.width - this.board.pixelSize) / 2, safe.y + 220);
      this.jar.view.position.set(safe.x + safe.width / 2, safe.y + 180);
      this.slots = [130, 360, 590].map((x) => ({ x: safe.x + x, y: safe.y + 1050, width: 220, height: 260, scale: 0.6 }));
    } else {
      // The finger sits DRAG_LIFT below a dragged piece, so the bottom row needs that much free space under the board.
      this.boardScale = 0.8;
      const boardSize = this.board.pixelSize * this.boardScale;
      this.board.view.position.set(safe.x + 90, safe.y + (safe.height - boardSize) / 2);
      this.jar.view.position.set(safe.x + 1000, safe.y + 230);
      this.slots = [850, 1000, 1150].map((x) => ({ x: safe.x + x, y: safe.y + 440, width: 150, height: 300, scale: 0.5 }));
    }
    this.board.view.scale.set(this.boardScale);

    this.slots.forEach((slot, index) => {
      const area = this.slotAreas[index];
      area.position.set(slot.x, slot.y);
      area.hitArea = new Rectangle(-slot.width / 2, -slot.height / 2, slot.width, slot.height);
      const piece = this.pieces[index];
      if (piece) this.putHome(index, piece, 0);
    });

    this.endOverlay.resize(viewWidth, viewHeight, { x: safe.x + safe.width / 2, y: safe.y + safe.height / 2 });
  }

  private update(dt: number): void {
    this.time += dt;
    this.dragSpeedX *= Math.exp(-8 * dt); // the tilt relaxes as soon as the finger stops
    this.watchJarFor = Math.max(0, this.watchJarFor - dt);

    const offset = stepShake(this.shake, SHAKE, dt);
    this.world.position.set(this.screenCenter.x + offset.x, this.screenCenter.y + offset.y);
    this.world.rotation = offset.rotation;

    // Eyes follow the finger during a drag and the cursor on desktop. Right after a clear everyone watches
    // the particles fly into the jar. Otherwise the board watches the tray and the tray watches the board,
    // which quietly points the player at the next move.
    const pointer = this.drag?.pointer ?? this.hoverPointer;
    const jarMouth = this.jarMouth();
    const boardCenter = this.world.toLocal(this.board.center, this.board.view);
    const trayCenter = this.slots[1] ?? boardCenter;
    const watching = this.watchJarFor > 0 && !this.drag ? jarMouth : null;

    this.board.update(dt, this.board.view.toLocal(watching ?? pointer ?? trayCenter, this.world));
    this.jar.update(dt);

    this.pieces.forEach((piece, slot) => {
      if (!piece) return;
      const dragged = this.drag?.piece === piece;
      const tilt = dragged ? clamp(-this.dragSpeedX * DRAG_TILT_PER_SPEED, DRAG_TILT_MAX) : 0;
      const breathe = dragged || this.finished ? 0 : Math.sin(this.time * 2.6 + slot * 1.4);
      piece.update(dt, watching ?? pointer ?? boardCenter, this.world, tilt, breathe);
    });

    this.nextBlink -= dt;
    if (this.nextBlink <= 0) {
      this.nextBlink = BLINK_INTERVAL * (0.5 + Math.random());
      const tray = this.pieces.filter((piece): piece is PieceView => piece !== null);
      if (tray.length > 0 && Math.random() < 0.25) tray[Math.floor(Math.random() * tray.length)].blinkRandom();
      else this.board.blinkRandom();
    }
  }

  private onSlotDown(slot: number, event: FederatedPointerEvent): void {
    const piece = this.pieces[slot];
    if (!this.started || this.finished || this.drag || !piece) return;

    gsap.killTweensOf([piece.view, piece.view.scale]);
    this.piecesLayer.addChild(piece.view); // on top of the other pieces
    const pointer = this.world.toLocal(event.global);
    this.drag = { slot, pointerId: event.pointerId, pointer, piece, target: null };
    this.lastMove = { x: pointer.x, time: performance.now() };
    this.dragSpeedX = 0;

    piece.impulse(IMPULSE.pickUp.squash, IMPULSE.pickUp.hop, 0.02);
    const size = this.boardScale;
    gsap.to(piece.view.scale, { x: size, y: size, duration: 0.12, ease: 'power2.out', onUpdate: () => this.followPointer() });
    this.followPointer();
  }

  private onPointerMove(event: FederatedPointerEvent): void {
    if (event.pointerType === 'mouse') this.hoverPointer = this.world.toLocal(event.global);
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;

    const pointer = this.world.toLocal(event.global);
    const now = performance.now();
    const elapsed = Math.max(1, now - this.lastMove.time) / 1000;
    this.dragSpeedX += ((pointer.x - this.lastMove.x) / elapsed - this.dragSpeedX) * 0.35;
    this.lastMove = { x: pointer.x, time: now };

    this.drag.pointer = pointer;
    this.followPointer();
  }

  private onPointerUp(event: FederatedPointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.drag = null;
    this.board.hideGhost();

    const move = drag.target ? this.game.place(drag.slot, drag.target) : null;
    if (!move) {
      this.putHome(drag.slot, drag.piece, 0.28);
      return;
    }

    this.pieces[drag.slot] = null;
    const { piece } = drag;
    const landing = this.world.toLocal(
      { x: move.at.col * CELL + piece.width / 2, y: move.at.row * CELL + piece.height / 2 },
      this.board.view,
    );
    gsap.killTweensOf([piece.view, piece.view.scale]);
    // A quick release can interrupt the pick-up tween, so land at the board scale explicitly.
    gsap.to(piece.view.scale, { x: this.boardScale, y: this.boardScale, duration: 0.07 });
    gsap.to(piece.view, {
      x: landing.x,
      y: landing.y,
      rotation: 0,
      duration: 0.07,
      ease: 'power2.in',
      onComplete: () => {
        piece.destroy();
        this.playMove(move, this.board.applyMove(move));
      },
    });
  }

  /** Everything after a piece lands: combo feedback, particles to the jar, and the end of the game. */
  private playMove(move: MoveResult, playback: MovePlayback): void {
    let endsIn = playback.settle;

    if (move.lines > 0) {
      const combo = comboFor(move.lines);
      const strength = (move.lines - 1) / (COMBO.length - 1);
      const center = this.clearedCenter(playback);

      gsap.delayedCall(playback.clearAt, () => {
        if (combo.hitStopMs > 0) this.deps.clock.hitStop(combo.hitStopMs);
        addTrauma(this.shake, combo.trauma);
        this.combo.show(combo.label, center, strength);
        this.watchJarFor = WATCH_JAR_SECONDS;
      });

      const requests = playback.popped.map(({ position, color, delay }) => ({
        from: this.world.toLocal(position, this.board.view),
        color,
        delay,
      }));
      const flight = this.particles.launch(requests, () => this.jarMouth(), () => {
        this.jarCount += 1;
        this.jar.setLevel(this.jarCount / this.game.goal);
        this.jar.bump();
      });
      endsIn = Math.max(endsIn, flight);
    }

    if (move.status === 'won') {
      gsap.delayedCall(endsIn, () => this.jar.celebrate());
      this.finish('won', endsIn + END_DELAY);
    }
    if (move.status === 'lost') this.finish('lost', endsIn + END_DELAY);
  }

  /** Keeps the dragged piece floating above the finger and updates the drop preview. */
  private followPointer(): void {
    const drag = this.drag;
    if (!drag) return;
    const { piece, pointer } = drag;
    const scale = piece.view.scale.x;
    piece.view.position.set(pointer.x, pointer.y - (piece.height / 2 + DRAG_LIFT) * scale);

    // Snap using the footprint at board scale, so the preview doesn't jump while the pick-up tween runs.
    const size = this.boardScale;
    const topLeft = { x: pointer.x - (piece.width * size) / 2, y: pointer.y - (piece.height + DRAG_LIFT) * size };
    const at = this.board.snap(this.board.view.toLocal(topLeft, this.world));
    const valid = this.game.canPlace(drag.slot, at);
    drag.target = valid ? at : null;
    if (valid) this.board.showGhost(piece.piece, at);
    else this.board.hideGhost();
  }

  private putHome(slot: number, piece: PieceView, duration: number): void {
    const home = this.slots[slot];
    if (!home) return;
    gsap.killTweensOf([piece.view, piece.view.scale]);
    if (duration === 0) {
      piece.view.position.set(home.x, home.y);
      piece.view.scale.set(home.scale);
      return;
    }
    gsap.to(piece.view, {
      x: home.x,
      y: home.y,
      duration,
      ease: 'back.out(1.6)',
      onComplete: () => piece.impulse(IMPULSE.bounceBack.squash, IMPULSE.bounceBack.hop),
    });
    gsap.to(piece.view.scale, { x: home.scale, y: home.scale, duration, ease: 'back.out(1.6)' });
  }

  private cancelDrag(): void {
    if (!this.drag) return;
    const { slot, piece } = this.drag;
    this.drag = null;
    this.board.hideGhost();
    this.putHome(slot, piece, 0);
  }

  private finish(reason: EndReason, delay: number): void {
    if (this.finished) return;
    this.finished = true;
    this.cancelDrag();
    this.deps.session.cancelTimeout();
    gsap.delayedCall(delay, () => this.endOverlay.show(reason));
  }

  private jarMouth(): PointData {
    return this.world.toLocal(this.jar.mouth, this.jar.view);
  }

  /** Middle of the cleared cells in world space, nudged up so the label sits above the action. */
  private clearedCenter(playback: MovePlayback): PointData {
    const sum = playback.popped.reduce((acc, { position }) => ({ x: acc.x + position.x, y: acc.y + position.y }), {
      x: 0,
      y: 0,
    });
    const count = Math.max(1, playback.popped.length);
    const local = { x: sum.x / count, y: sum.y / count - CELL * 0.5 };
    const center = this.world.toLocal(local, this.board.view);
    // Keep the label on the board horizontally even when a whole column is cleared at an edge.
    const left = this.world.toLocal({ x: CELL * 2, y: 0 }, this.board.view).x;
    const right = this.world.toLocal({ x: this.board.pixelSize - CELL * 2, y: 0 }, this.board.view).x;
    return { x: Math.max(left, Math.min(right, center.x)), y: center.y };
  }
}

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}
