import Phaser from 'phaser';
import { CAT_TEXTURE, loadAssets } from './assets';
import { publishState } from './events';

export class JumpScene extends Phaser.Scene {
  private cat!: Phaser.Physics.Arcade.Sprite;
  private jumps = 0;
  private jumpRequested = false;

  constructor() { super('jump'); }
  preload(): void { loadAssets(this); }
  create(): void {
    const art = this.add.graphics();
    art.fillStyle(0xfaf2d6).fillCircle(770, 90, 40);
    art.fillStyle(0xc4d9bd).fillEllipse(170, 460, 600, 290).fillEllipse(800, 470, 740, 350);
    art.fillStyle(0x9fbd9b).fillEllipse(450, 480, 700, 240);
    art.fillStyle(0x728d69).fillRect(0, 438, 960, 102);
    art.fillStyle(0xd9bc8c).fillRect(0, 451, 960, 89);
    for (let x = 12; x < 960; x += 38) {
      art.lineStyle(2, 0x78966c).lineBetween(x, 438, x + 4, 429);
    }
    const ground = this.add.rectangle(480, 490, 960, 104, 0, 0);
    this.physics.add.existing(ground, true);
    this.cat = this.physics.add.sprite(300, 390, CAT_TEXTURE);
    this.cat.setSize(44, 58).setOffset(18, 16).setCollideWorldBounds(true);
    this.physics.add.collider(this.cat, ground);
    const requestJump = (): void => { this.jumpRequested = true; };
    const keyboard = this.input.keyboard;
    keyboard?.addCapture('SPACE');
    keyboard?.on('keydown-SPACE', requestJump);
    this.input.on('pointerdown', requestJump);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off('keydown-SPACE', requestJump);
      keyboard?.removeCapture('SPACE');
      this.input.off('pointerdown', requestJump);
    });
  }
  update(): void {
    const body = this.cat.body as Phaser.Physics.Arcade.Body;
    if (this.jumpRequested && body.blocked.down) {
      this.cat.setVelocityY(-560);
      this.jumps += 1;
    }
    this.jumpRequested = false;
    publishState({ grounded: body.blocked.down && body.velocity.y >= 0, jumps: this.jumps, fps: this.game.loop.actualFps });
  }
}
