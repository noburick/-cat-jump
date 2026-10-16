import { test, expect } from './fixtures';

test('normal production build does not expose the test API', async ({ page }) => {
  await page.goto('http://127.0.0.1:4174/cat-jump/');
  await expect(page.getByTestId('status')).toHaveText('ジャンプできるよ');
  expect(await page.evaluate(() => '__CAT_JUMP_TEST__' in window)).toBe(false);
  await page.keyboard.press('Space');
  await expect(page.getByTestId('jumps')).toHaveText('1');
});
