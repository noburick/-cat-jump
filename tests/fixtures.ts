import { test as base, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

export const test = base.extend<{ diagnostics: void }>({
  diagnostics: [async ({ page }, use, testInfo) => {
    const logs: { type: string; message: string }[] = [];
    page.on('console', msg => { if (msg.type() === 'error') logs.push({ type: 'console', message: msg.text() }); });
    page.on('pageerror', error => logs.push({ type: 'javascript', message: error.stack ?? error.message }));
    page.on('response', response => {
      if (response.status() >= 400) logs.push({ type: 'http', message: `${response.status()} ${response.url()}` });
    });
    page.on('requestfailed', request => logs.push({ type: 'network', message: `${request.url()} ${request.failure()?.errorText}` }));
    const attachJSON = async (name: string, value: unknown): Promise<void> => {
      const path = testInfo.outputPath(name);
      await writeFile(path, JSON.stringify(value, null, 2));
      await testInfo.attach(name, { path, contentType: 'application/json' });
    };
    await use();
    await attachJSON('runtime-errors.json', logs);
    if (!page.isClosed()) {
      await page.screenshot({ path: testInfo.outputPath('final.png'), fullPage: true }).catch(() => {});
      const state = await page.evaluate(() => window.__CAT_JUMP_TEST__?.snapshot() ?? null).catch(() => null);
      await attachJSON('game-state.json', state);
    }
    await attachJSON('failure.json', {
      title: testInfo.title, project: testInfo.project.name, status: testInfo.status,
      errors: testInfo.errors.map(e => ({ message: e.message, stack: e.stack })), runtimeErrors: logs,
    });
    if (testInfo.status === testInfo.expectedStatus) expect(logs, 'No browser runtime or resource errors').toEqual([]);
  }, { auto: true }],
});
export { expect };
