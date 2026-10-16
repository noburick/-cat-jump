import { test, expect } from './fixtures';
import { waitForDecision } from '../bot/controller';

test('loads under a subpath, jumps, rejects midair jumps, and lands', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
  await page.goto('./');
  const status = page.getByTestId('status');
  const count = page.getByTestId('jumps');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(status).toHaveText('ジャンプできるよ');
  if (isMobile) await page.locator('canvas').tap();
  else await page.keyboard.press('Space');
  await expect(count).toHaveText('1');
  await expect(status).toHaveText('ジャンプ中');
  if (isMobile) await page.locator('canvas').tap();
  else await page.keyboard.press('Space');
  await expect(status).toHaveText('ジャンプできるよ');
  await expect(count).toHaveText('1');
  await page.locator('canvas').click();
  await expect(count).toHaveText('2');
  await expect(status).toHaveText('ジャンプできるよ');
  await page.getByLabel('FPSを表示').check();
  await expect(page.locator('#fps')).toBeVisible();
  await expect(page.locator('#fps')).toContainText('FPS');
  const size = await page.locator('canvas').boundingBox();
  expect(size!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});


test('touch coordinates and canvas size follow portrait / landscape rotation', async ({ page, isMobile }, testInfo) => {
  test.skip(!isMobile, 'Touch devices only');
  test.setTimeout(90000);
  await page.goto('./?seed=20261016');
  const canvas = page.locator('canvas');
  const status = page.getByTestId('status');
  const count = page.getByTestId('jumps');
  await expect(status).toHaveText('ジャンプできるよ');
  let jumps = 0;
  const parameters = { jumpStartDistance: 220, jumpSpeed: 560, clearance: 6, inputLatencyMs: 0 };
  for (const viewport of [{ width: 390, height: 664 }, { width: 844, height: 390 }, { width: 390, height: 664 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => {
      const box = await canvas.boundingBox();
      const parent = await page.locator('#game').boundingBox();
      return !!box && !!parent && Math.abs(box.width - parent.width) < 2 && Math.abs(box.height - parent.height) < 2;
    }).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    expect(box.width).toBeGreaterThan(200);
    expect(Math.abs(box.width / box.height - 16 / 9)).toBeLessThan(0.02);
    const ready = await waitForDecision(page, parameters, true);
    expect(ready.state.gameOver).toBe(false);
    await page.touchscreen.tap(box.x + box.width * 0.75, box.y + box.height * 0.5);
    await expect(count).toHaveText(String(++jumps));
    if (jumps === 1) {
      const jumped = await page.evaluate(() => window.__CAT_JUMP_TEST__!.snapshot());
      parameters.inputLatencyMs = Math.max(0, jumped.lastJumpAtMs! - ready.state.elapsedMs);
    }
    await expect(status).toHaveText('ジャンプ中');
    await expect(status).toHaveText('ジャンプできるよ');
    await page.screenshot({ path: testInfo.outputPath(`game-${viewport.width}.png`), fullPage: true });
  }
});
