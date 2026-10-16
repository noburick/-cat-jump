import Phaser from 'phaser';

export const CAT_TEXTURE = 'cat';
// Replace public/assets/cat.svg with your artwork; keep the key stable.
export function loadAssets(scene: Phaser.Scene): void {
  scene.load.svg(CAT_TEXTURE, `${import.meta.env.BASE_URL}assets/cat.svg`, { width: 80, height: 80 });
}
