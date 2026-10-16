import Phaser from 'phaser';
import { LEVEL, speedAt } from './level';
import { CRATE_TEXTURE } from './assets';

export class Obstacle extends Phaser.GameObjects.Image {
  declare body: Phaser.Physics.Arcade.Body;
  passed = false;
  collider?: Phaser.Physics.Arcade.Collider;
  constructor(scene: Phaser.Scene, public readonly sequence: number, public readonly bornAtMs: number) {
    super(scene, LEVEL.spawnX, LEVEL.groundY - LEVEL.crateHeight / 2, CRATE_TEXTURE);
    scene.add.existing(this);
    this.setDisplaySize(LEVEL.crateWidth, LEVEL.crateHeight);
    scene.physics.add.existing(this);
    // Later crates are gradually faster. Each existing crate keeps its assigned speed.
    this.body.setAllowGravity(false).setImmovable(true).setVelocityX(-speedAt(bornAtMs));
  }
}
