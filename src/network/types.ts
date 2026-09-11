export interface Size {
  width: number;
  height: number;
}

/**
 * Everything the game needs from the ad container. The game never touches
 * `mraid`, `ExitApi` or `FbPlayableAd` directly, only this interface.
 */
export interface AdNetwork {
  readonly name: string;
  /** Container is initialised: safe to read sizes and call its API. Start preloading here. */
  ready(): Promise<void>;
  /** Ad is actually on screen: start gameplay, timers and audio only after this. */
  viewable(): Promise<void>;
  /** The only allowed way to leave the ad. Call from an explicit user action. */
  openStore(): void;
  onVisibilityChange(listener: (visible: boolean) => void): void;
  getSize(): Size;
  onResize(listener: (size: Size) => void): void;
}
