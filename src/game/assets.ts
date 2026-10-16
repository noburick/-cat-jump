import Phaser from 'phaser';

export const CAT_TEXTURE = 'cat';
export const CRATE_TEXTURE = 'crate';
// Replace public/assets/cat.svg with your artwork; keep the key stable.
export function loadAssets(scene: Phaser.Scene): void {
  scene.load.svg(CRATE_TEXTURE, `${import.meta.env.BASE_URL}assets/crate.svg`, { width: 40, height: 36 });
  scene.load.svg(CAT_TEXTURE, `${import.meta.env.BASE_URL}assets/cat.svg`, { width: 80, height: 80 });
}
