import { test, expect } from './fixtures';
import { waitForDecision } from '../bot/controller';

async function snapshot(page: import('@playwright/test').Page) {
  return page.evaluate(() => window.__CAT_JUMP_TEST__!.snapshot());
}

test('read-only API reports actual jump motion and landing', async ({ page, isMobile }) => {
  await page.goto('./');
  await page.waitForFunction(() => !!window.__CAT_JUMP_TEST__);
  await expect.poll(async () => (await snapshot(page))?.grounded).toBe(true);
  const initial = await snapshot(page);
  expect(initial.state).toBe('playing');
  expect(initial.gravityY).toBe(1500);
  expect(initial.cat!.width).toBe(44);
  expect(initial.cat!.height).toBe(58);
  expect(initial.jumps).toBe(0);
  expect(initial.gameOver).toBe(false);
  const immutable = await page.evaluate(() => {
    const api = window.__CAT_JUMP_TEST__!;
    const state = api.snapshot();
    return Object.isFrozen(api) && Object.isFrozen(state) && Object.isFrozen(state.cat)
      && !Object.getOwnPropertyDescriptor(window, '__CAT_JUMP_TEST__')?.writable;
  });
  expect(immutable).toBe(true);
  if (isMobile) await page.locator('canvas').tap();
  else await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).cat!.y).toBeLessThan(initial.cat!.y - 15);
  expect((await snapshot(page)).jumping).toBe(true);
  await expect.poll(async () => (await snapshot(page)).grounded).toBe(true);
  const landed = await snapshot(page);
  expect(landed.cat!.y).toBeCloseTo(initial.cat!.y, 0);
  expect(landed.cat!.x).toBeCloseTo(initial.cat!.x, 0);
  expect(landed.jumping).toBe(false);
  expect(landed.jumps).toBe(1);
});

test('ten consecutive jumps remain playable without JavaScript errors', async ({ page, isMobile }) => {
  test.setTimeout(120000);
  await page.goto('./?seed=20261016');
  await page.waitForFunction(() => !!window.__CAT_JUMP_TEST__);
  await expect.poll(async () => (await snapshot(page))?.grounded).toBe(true);
  await page.locator('canvas').scrollIntoViewIfNeeded();
  const box = (await page.locator('canvas').boundingBox())!;
  const initialY = (await snapshot(page)).cat!.y;
  const parameters = { jumpStartDistance: 220, jumpSpeed: 560, clearance: 6, inputLatencyMs: 0 };
  for (let i = 1; i <= 10; i++) {
    const ready = await waitForDecision(page, parameters, true);
    expect(ready.state.gameOver).toBe(false);
    if (isMobile) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    else await page.keyboard.press('Space');
    await page.waitForFunction(count => window.__CAT_JUMP_TEST__!.snapshot().jumps === count || window.__CAT_JUMP_TEST__!.snapshot().gameOver, i);
    if (i === 1) {
      const jumped = await snapshot(page);
      parameters.inputLatencyMs = Math.max(0, jumped.lastJumpAtMs! - ready.state.elapsedMs);
    }
    await page.waitForFunction(() => window.__CAT_JUMP_TEST__!.snapshot().grounded || window.__CAT_JUMP_TEST__!.snapshot().gameOver);
    const landed = await snapshot(page);
    expect(landed.gameOver).toBe(false);
    expect(landed.jumps).toBe(i);
    expect(landed.cat!.y).toBeCloseTo(initialY, 0);
  }
});

test('obstacle collision, real retry and seeded replay', async ({ page }) => {
  test.setTimeout(150000);
  await page.goto('./?seed=20261016');
  await page.waitForFunction(() => !!window.__CAT_JUMP_TEST__);
  await expect.poll(async () => (await snapshot(page)).nextObstacle, { timeout: 90000 }).not.toBeNull();
  const first = (await snapshot(page)).nextObstacle!;
  expect(first.velocityX).toBe(-300);
  expect(first.width).toBe(40);
  expect(first.height).toBe(36);
  await expect.poll(async () => (await snapshot(page)).gameOver, { timeout: 90000 }).toBe(true);
  const dead = await snapshot(page);
  expect(dead.collisions).toBe(1);
  expect(dead.score).toBe(0);
  await expect(page.getByTestId('survival')).toHaveText((dead.elapsedMs / 1000).toFixed(1));
  await expect(page.getByTestId('status')).toHaveText('ゲームオーバー');
  await page.getByRole('button', { name: 'リトライ', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).gameOver).toBe(false);
  await expect.poll(async () => (await snapshot(page)).grounded).toBe(true);
  const reset = await snapshot(page);
  expect(reset.jumps).toBe(0);
  expect(reset.score).toBe(0);
  expect(reset.collisions).toBe(0);
  expect(reset.seed).toBe(20261016);
  await expect.poll(async () => (await snapshot(page)).nextObstacle, { timeout: 90000 }).not.toBeNull();
  const replay = (await snapshot(page)).nextObstacle!;
  expect({ width: replay.width, height: replay.height, velocityX: replay.velocityX, sequence: replay.sequence })
    .toEqual({ width: first.width, height: first.height, velocityX: first.velocityX, sequence: first.sequence });
});
