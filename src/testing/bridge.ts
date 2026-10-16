import Phaser from 'phaser';
import { Obstacle } from '../game/Obstacle';
import { gameEvents, type GameState } from '../game/events';

export interface TestSnapshot {
  state: 'loading' | 'playing' | 'game-over';
  cat: Readonly<{ x: number; y: number; velocityX: number; velocityY: number; width: number; height: number }> | null;
  grounded: boolean;
  jumping: boolean;
  jumps: number;
  seed: number | null;
  elapsedMs: number;
  lastJumpAtMs: number | null;
  gravityY: number;
  nextObstacle: Readonly<{ sequence: number; bornAtMs: number; distance: number; width: number; height: number; velocityX: number }> | null;
  collisions: number;
  score: number;
  gameOver: boolean;
  capabilities: Readonly<{ obstacles: true; retry: true; score: true }>;
}
declare global {
  interface Window {
    readonly __CAT_JUMP_TEST__?: Readonly<{ snapshot(): Readonly<TestSnapshot> }>;
  }
}

export function installTestBridge(game: Phaser.Game, seed: number | null): void {
  let latest: GameState | undefined;
  let lastJumpAtMs: number | null = null;
  const listener = (event: Event): void => {
    const state = (event as CustomEvent<GameState>).detail;
    if (latest && state.elapsedMs < latest.elapsedMs) lastJumpAtMs = null;
    if (state.jumps > (latest?.jumps ?? 0)) lastJumpAtMs = state.elapsedMs;
    latest = state;
  };
  gameEvents.addEventListener('state', listener);
  const api = Object.freeze({
    snapshot(): Readonly<TestSnapshot> {
      const scene = game.scene.getScene('jump');
      const cat = scene?.children?.list.find(child =>
        child instanceof Phaser.Physics.Arcade.Sprite && child.texture.key === 'cat'
      ) as Phaser.Physics.Arcade.Sprite | undefined;
      const body = cat?.body as Phaser.Physics.Arcade.Body | undefined;
      const grounded = !!body?.blocked.down && body.velocity.y >= 0;
      const obstacle = body ? scene?.children?.list
        .filter((child): child is Obstacle => child instanceof Obstacle && child.body.right >= body.left)
        .sort((a, b) => a.body.left - b.body.left)[0] : undefined;
      return Object.freeze({
        state: latest?.gameOver ? 'game-over' : cat && latest ? 'playing' : 'loading',
        cat: cat && body ? Object.freeze({ x: cat.x, y: cat.y, velocityX: body.velocity.x, velocityY: body.velocity.y, width: body.width, height: body.height }) : null,
        grounded,
        jumping: !!latest && !latest.gameOver && !grounded,
        jumps: latest?.jumps ?? 0,
        gravityY: body ? body.gravity.y + body.world.gravity.y : 1500,
        seed,
        elapsedMs: latest?.elapsedMs ?? 0,
        lastJumpAtMs,
        nextObstacle: obstacle && body ? Object.freeze({ sequence: obstacle.sequence, bornAtMs: obstacle.bornAtMs, distance: obstacle.body.left - body.right,
          width: obstacle.body.width, height: obstacle.body.height, velocityX: obstacle.body.velocity.x }) : null,
        collisions: latest?.collisions ?? 0,
        score: latest?.score ?? 0,
        gameOver: latest?.gameOver ?? false,
        capabilities: Object.freeze({ obstacles: true, retry: true, score: true }),
      });
    },
  });
  Object.defineProperty(window, '__CAT_JUMP_TEST__', { value: api, configurable: true });
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    gameEvents.removeEventListener('state', listener);
    Reflect.deleteProperty(window, '__CAT_JUMP_TEST__');
  });
}
