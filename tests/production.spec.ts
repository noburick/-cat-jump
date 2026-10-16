import { test, expect } from './fixtures';

test('normal production build does not expose the test API', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('http://127.0.0.1:4174/cat-jump/?seed=20261016');
  await expect(page.getByTestId('status')).toHaveText('ジャンプできるよ');
  expect(await page.evaluate(() => '__CAT_JUMP_TEST__' in window)).toBe(false);
  await page.keyboard.press('Space');
  await expect(page.getByTestId('jumps')).toHaveText('1');
  await expect(page.getByTestId('status')).toHaveText('ゲームオーバー', { timeout: 90000 });
  await page.getByRole('button', { name: 'リトライ', exact: true }).click();
  await expect(page.getByTestId('jumps')).toHaveText('0');
  await expect(page.getByTestId('score')).toHaveText('0');
  await expect(page.getByTestId('status')).toHaveText('ジャンプできるよ');
  expect(await page.evaluate(() => '__CAT_JUMP_TEST__' in window)).toBe(false);
});
