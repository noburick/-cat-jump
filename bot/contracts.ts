export interface Obstacle {
  // Gap from cat body's leading edge to obstacle's near edge, in game pixels.
  distance: number;
  width: number;
  height: number;
  velocityX: number;
}
export interface Observation {
  cat: { x: number; y: number; velocityX: number; velocityY: number; width: number; height: number } | null;
  grounded: boolean;
  gravityY: number;
  nextObstacle: Obstacle | null;
  gameOver: boolean | null;
  score: number | null;
  collisions: number | null;
  capabilities: { obstacles: boolean; retry: boolean; score: boolean };
}
export interface Parameters {
  jumpStartDistance: number;
  jumpSpeed: number;
  clearance: number;
  inputLatencyMs: number;
}
