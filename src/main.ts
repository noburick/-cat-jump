import Phaser from 'phaser';
import { JumpScene } from './game/JumpScene';
import { mountUI } from './ui/mountUI';
import './style.css';

const parent = mountUI();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: 960,
  height: 540,
  backgroundColor: '#e5eddd',
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1500 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [JumpScene],
});

// Safari may finish orientation-dependent CSS layout after the window resize event.
// Observe the actual container so drawing size and pointer coordinates stay aligned.
const resizeObserver = new ResizeObserver(() => {
  if (game.isBooted) {
    game.scale.getParentBounds();
    game.scale.refresh();
  }
});
resizeObserver.observe(parent);
game.events.once(Phaser.Core.Events.DESTROY, () => resizeObserver.disconnect());

if (import.meta.env.DEV || __GAME_TEST_API__) {
  void import('./testing/bridge').then(({ installTestBridge }) => installTestBridge(game));
}
