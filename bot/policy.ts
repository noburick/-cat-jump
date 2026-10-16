import type { Observation, Parameters } from './contracts.ts';

export interface Decision { jump: boolean; reason: string; timeToCollision: number | null }
export function decideJump(state: Observation, p: Parameters): Decision {
  const no = (reason: string, t: number | null = null): Decision => ({ jump: false, reason, timeToCollision: t });
  if (state.gameOver) return no('game-over');
  if (!state.cat || !state.grounded) return no('not-grounded');
  const o = state.nextObstacle;
  if (!o) return no('no-obstacle');
  const closingSpeed = state.cat.velocityX - o.velocityX;
  if (closingSpeed <= 0 || o.distance < 0) return no('not-approaching');
  const t = o.distance / closingSpeed;
  if (o.distance > p.jumpStartDistance) return no('outside-trigger-distance', t);
  // h(t)=v*t-g*t²/2. The cat must clear the obstacle throughout horizontal overlap.
  const g = state.gravityY;
  const height = o.height + p.clearance;
  const discriminant = p.jumpSpeed ** 2 - 2 * g * height;
  if (g <= 0 || discriminant <= 0) return no('obstacle-too-high', t);
  const safeStart = (p.jumpSpeed - Math.sqrt(discriminant)) / g;
  const safeEnd = (p.jumpSpeed + Math.sqrt(discriminant)) / g;
  const contact = t - p.inputLatencyMs / 1000;
  const overlapEnd = contact + (o.width + state.cat.width) / closingSpeed;
  if (contact < safeStart) return no('too-late', t);
  if (overlapEnd > safeEnd) return no('wait-for-safe-flight-window', t);
  return { jump: true, reason: 'predicted-clearance', timeToCollision: t };
}
