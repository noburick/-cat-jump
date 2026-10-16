import Phaser from 'phaser';
import { gameEvents, type GameState } from '../game/events';

export interface TestSnapshot {
  state: 'loading' | 'playing';
  cat: Readonly<{ x: number; y: number; velocityX: number; velocityY: number; width: number; height: number }> | null;
  grounded: boolean;
  jumping: boolean;
  jumps: number;
  // These game features do not exist yet; null must not imply a passing result.
  gravityY: number;
  nextObstacle: null;
  collisions: null;
  score: null;
  gameOver: null;
  capabilities: Readonly<{ obstacles: false; retry: false; score: false }>;
}
declare global {
  interface Window {
    readonly __CAT_JUMP_TEST__?: Readonly<{ snapshot(): Readonly<TestSnapshot> }>;
  }
}

export function installTestBridge(game: Phaser.Game): void {
  let latest: GameState | undefined;
  const listener = (event: Event): void => { latest = (event as CustomEvent<GameState>).detail; };
  gameEvents.addEventListener('state', listener);
  const api = Object.freeze({
    snapshot(): Readonly<TestSnapshot> {
      const scene = game.scene.getScene('jump');
      const cat = scene?.children?.list.find(child =>
        child instanceof Phaser.Physics.Arcade.Sprite && child.texture.key === 'cat'
      ) as Phaser.Physics.Arcade.Sprite | undefined;
      const body = cat?.body as Phaser.Physics.Arcade.Body | undefined;
      const grounded = !!body?.blocked.down && body.velocity.y >= 0;
      return Object.freeze({
        state: cat && latest ? 'playing' : 'loading',
        cat: cat && body ? Object.freeze({ x: cat.x, y: cat.y, velocityX: body.velocity.x, velocityY: body.velocity.y, width: body.width, height: body.height }) : null,
        grounded,
        jumping: !!latest && !grounded,
        jumps: latest?.jumps ?? 0,
        gravityY: body ? body.gravity.y + body.world.gravity.y : 1500,
        nextObstacle: null,
        collisions: null,
        score: null,
        gameOver: null,
        capabilities: Object.freeze({ obstacles: false, retry: false, score: false }),
      });
    },
  });
  Object.defineProperty(window, '__CAT_JUMP_TEST__', { value: api, configurable: true });
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    gameEvents.removeEventListener('state', listener);
    Reflect.deleteProperty(window, '__CAT_JUMP_TEST__');
  });
}
