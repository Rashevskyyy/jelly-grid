import { gsap } from 'gsap';
import { Container, Graphics, Rectangle, type FederatedPointerEvent, type PointData, type Renderer } from 'pixi.js';
import { THEME } from '../config';
import type { GameClock } from '../core/clock';
import type { Layout } from '../core/layout';
import type { Session } from '../core/session';
import { LEVEL_1 } from '../game/levels/level1';
import { Game } from '../game/model/Game';
import type { GridPos } from '../game/model/types';
import { BoardView } from '../game/view/BoardView';
import { CELL, DRAG_LIFT } from '../game/view/constants';
import { EndOverlay, type EndReason } from '../game/view/EndOverlay';
import { PieceView } from '../game/view/PieceView';
import { ProgressView } from '../game/view/ProgressView';
import { createGameTextures } from '../game/view/textures';
import type { AdNetwork } from '../network';
import type { Scene } from './Scene';

export interface GameSceneDeps {
  network: AdNetwork;
  session: Session;
  clock: GameClock;
  renderer: Renderer;
}

/** Tray slot in scene coordinates: centre, touch area and the scale pieces rest at. */
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

/** Pause between the last move's animation and the end screen, in seconds. */
const END_DELAY = 0.45;

export class GameScene implements Scene {
  readonly view = new Container();
  private readonly deps: GameSceneDeps;
  private readonly game = new Game(LEVEL_1);
  private readonly backdrop = new Graphics();
  private readonly board: BoardView;
  private readonly progress = new ProgressView();
  private readonly slotAreas: Container[] = [];
  private readonly pieces: Array<PieceView | null>;
  private readonly piecesLayer = new Container();
  private readonly endOverlay: EndOverlay;
  private slots: SlotLayout[] = [];
  /** Board and dragged pieces share this scale. Landscape shrinks it to leave room for the drag lift. */
  private boardScale = 1;
  private drag: DragState | null = null;
  private started = false;
  private finished = false;

  constructor(deps: GameSceneDeps) {
    this.deps = deps;
    const textures = createGameTextures(deps.renderer);

    this.board = new BoardView(this.game.board, textures);
    this.pieces = this.game.tray.map((piece) => (piece ? new PieceView(piece, textures) : null));
    this.endOverlay = new EndOverlay(() => {
      if (deps.session.canOpenStore) deps.network.openStore();
    });

    // Only the tray slots and the end overlay take input. Everything decorative is excluded from hit testing:
    // otherwise a block sprite under the finger resolves to the scene and the slot never sees the tap.
    this.view.eventMode = 'static';
    for (const layer of [this.backdrop, this.board.view, this.progress.view, this.piecesLayer]) layer.eventMode = 'none';
    this.view.addChild(this.backdrop, this.board.view, this.progress.view);
    this.pieces.forEach((piece, slot) => {
      const area = new Container();
      area.eventMode = 'static';
      area.cursor = 'grab';
      area.on('pointerdown', (event) => this.onSlotDown(slot, event));
      area.on('pointerupoutside', (event) => this.onPointerUp(event));
      this.slotAreas.push(area);
      this.view.addChild(area);
      if (piece) this.piecesLayer.addChild(piece.view);
    });
    this.view.addChild(this.piecesLayer, this.endOverlay.view);

    this.view.on('globalpointermove', (event) => this.onPointerMove(event));
    this.view.on('pointerup', (event) => this.onPointerUp(event));
    deps.session.onTimeout(() => this.finish('timeout', 0));
  }

  start(): void {
    this.started = true;
  }

  resize(layout: Layout): void {
    this.cancelDrag();
    const { safe, portrait, viewWidth, viewHeight } = layout;

    this.backdrop.clear().rect(0, 0, viewWidth, viewHeight).fill(THEME.background);
    this.view.hitArea = new Rectangle(0, 0, viewWidth, viewHeight); // releases anywhere on screen reach onPointerUp

    if (portrait) {
      this.boardScale = 1;
      this.board.view.position.set(safe.x + (safe.width - this.board.pixelSize) / 2, safe.y + 210);
      this.progress.view.position.set(safe.x + 80, safe.y + 100);
      this.progress.resize(safe.width - 160);
      this.slots = [130, 360, 590].map((x) => ({ x: safe.x + x, y: safe.y + 1040, width: 220, height: 260, scale: 0.6 }));
    } else {
      // The finger sits DRAG_LIFT below a dragged piece, so the bottom row needs that much free space under the board.
      this.boardScale = 0.8;
      const boardSize = this.board.pixelSize * this.boardScale;
      this.board.view.position.set(safe.x + 90, safe.y + (safe.height - boardSize) / 2);
      this.progress.view.position.set(safe.x + 780, safe.y + 110);
      this.progress.resize(440);
      this.slots = [850, 1000, 1150].map((x) => ({ x: safe.x + x, y: safe.y + 420, width: 150, height: 300, scale: 0.5 }));
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

  private onSlotDown(slot: number, event: FederatedPointerEvent): void {
    const piece = this.pieces[slot];
    if (!this.started || this.finished || this.drag || !piece) return;

    gsap.killTweensOf([piece.view, piece.view.scale]);
    this.piecesLayer.addChild(piece.view); // on top of the other pieces
    this.drag = { slot, pointerId: event.pointerId, pointer: this.view.toLocal(event.global), piece, target: null };
    const size = this.boardScale;
    gsap.to(piece.view.scale, { x: size, y: size, duration: 0.12, ease: 'power2.out', onUpdate: () => this.followPointer() });
    this.followPointer();
  }

  private onPointerMove(event: FederatedPointerEvent): void {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    this.drag.pointer = this.view.toLocal(event.global);
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
    const landing = this.view.toLocal({ x: move.at.col * CELL, y: move.at.row * CELL }, this.board.view);
    gsap.killTweensOf([drag.piece.view, drag.piece.view.scale]);
    // A quick release can interrupt the pick-up tween, so land at the board scale explicitly.
    gsap.to(drag.piece.view.scale, { x: this.boardScale, y: this.boardScale, duration: 0.07 });
    gsap.to(drag.piece.view, {
      x: landing.x,
      y: landing.y,
      duration: 0.07,
      ease: 'power2.in',
      onComplete: () => {
        drag.piece.view.destroy({ children: true });
        const clearTime = this.board.applyMove(move);
        this.progress.setValue(move.collected / this.game.goal);
        if (move.status === 'won') this.finish('won', clearTime + END_DELAY);
        if (move.status === 'lost') this.finish('lost', clearTime + END_DELAY);
      },
    });
  }

  /** Keeps the dragged piece floating above the finger and updates the drop preview. */
  private followPointer(): void {
    const drag = this.drag;
    if (!drag) return;
    const { piece, pointer } = drag;
    const scale = piece.view.scale.x;
    piece.view.position.set(pointer.x - (piece.width * scale) / 2, pointer.y - (piece.height + DRAG_LIFT) * scale);

    // Snap using the footprint at board scale, so the preview doesn't jump while the pick-up tween runs.
    const size = this.boardScale;
    const topLeft = { x: pointer.x - (piece.width * size) / 2, y: pointer.y - (piece.height + DRAG_LIFT) * size };
    const at = this.board.snap(this.board.view.toLocal(topLeft, this.view));
    const valid = this.game.canPlace(drag.slot, at);
    drag.target = valid ? at : null;
    if (valid) this.board.showGhost(piece.piece, at);
    else this.board.hideGhost();
  }

  private putHome(slot: number, piece: PieceView, duration: number): void {
    const home = this.slots[slot];
    if (!home) return;
    const x = home.x - (piece.width * home.scale) / 2;
    const y = home.y - (piece.height * home.scale) / 2;
    gsap.killTweensOf([piece.view, piece.view.scale]);
    if (duration === 0) {
      piece.view.position.set(x, y);
      piece.view.scale.set(home.scale);
      return;
    }
    gsap.to(piece.view, { x, y, duration, ease: 'back.out(1.6)' });
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
}
