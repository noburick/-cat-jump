import { test, expect } from './fixtures';

async function snapshot(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => !!window.__CAT_JUMP_TEST__);
  return page.evaluate(() => window.__CAT_JUMP_TEST__!.snapshot());
}

test('read-only API reports actual jump motion and landing', async ({ page, isMobile }) => {
  await page.goto('./');
  await expect.poll(async () => (await snapshot(page))?.grounded).toBe(true);
  const initial = await snapshot(page);
  expect(initial.state).toBe('playing');
  expect(initial.jumps).toBe(0);
  expect(initial.gameOver).toBeNull();
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
  test.setTimeout(45000);
  await page.goto('./');
  await expect.poll(async () => (await snapshot(page))?.grounded).toBe(true);
  const initialY = (await snapshot(page)).cat!.y;
  for (let i = 1; i <= 10; i++) {
    if (isMobile) await page.locator('canvas').tap();
    else await page.keyboard.press('Space');
    await expect.poll(async () => (await snapshot(page)).jumps).toBe(i);
    await expect.poll(async () => (await snapshot(page)).grounded).toBe(true);
    expect((await snapshot(page)).cat!.y).toBeCloseTo(initialY, 0);
  }
});

// Explicit skips document missing game features without inventing gameplay or fake passes.
test.skip('obstacle collision causes game over — obstacles and game over are not implemented', async () => {});
test.skip('retry restores initial state — retry is not implemented', async () => {});
