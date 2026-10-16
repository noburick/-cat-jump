export interface GameState { grounded: boolean; jumps: number; fps: number }
export const gameEvents = new EventTarget();
export function publishState(state: GameState): void {
  gameEvents.dispatchEvent(new CustomEvent<GameState>('state', { detail: state }));
}
