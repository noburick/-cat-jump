import { test, expect } from '@playwright/test';
import { decideJump } from '../bot/policy';
import type { Observation } from '../bot/contracts';
const parameters = { jumpStartDistance: 130, jumpSpeed: 560, clearance: 6, inputLatencyMs: 40 };
const state: Observation = {
  cat: { x: 300, y: 400, velocityX: 0, velocityY: 0, width: 44, height: 58 },
  grounded: true, gravityY: 1500,
  nextObstacle: { distance: 75, width: 32, height: 32, velocityX: -300 },
  gameOver: false, score: 0, collisions: 0, capabilities: { obstacles: true, retry: true, score: true },
};
test('prediction jumps only when overlap fits inside safe vertical clearance', () => {
  expect(decideJump(state, parameters).jump).toBe(true);
  expect(decideJump({ ...state, grounded: false }, parameters).reason).toBe('not-grounded');
  expect(decideJump({ ...state, nextObstacle: null }, parameters).reason).toBe('no-obstacle');
  expect(decideJump({ ...state, nextObstacle: { ...state.nextObstacle!, distance: 200 } }, parameters).jump).toBe(false);
  expect(decideJump({ ...state, nextObstacle: { ...state.nextObstacle!, height: 200 } }, parameters).reason).toBe('obstacle-too-high');
  expect(decideJump({ ...state, nextObstacle: { ...state.nextObstacle!, width: 300 } }, parameters).jump).toBe(false);
  expect(decideJump({ ...state, nextObstacle: { ...state.nextObstacle!, distance: 5 } }, parameters).reason).toBe('too-late');
});
