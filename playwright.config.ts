import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // Real-time input/physics cases share rendering resources; keep comparisons serial.
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'reports/results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4173/cat-jump/', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testIgnore: '**/production.spec.ts', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-safari', testIgnore: '**/production.spec.ts', use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit' } },
  ],
  webServer: [
    {
      command: 'npm run build:test && npm run preview -- --outDir dist-e2e --host 127.0.0.1 --port 4173 --strictPort',
      env: { VITE_BASE_PATH: '/cat-jump/' },
      url: 'http://127.0.0.1:4173/cat-jump/',
      reuseExistingServer: false,
    },
    {
      command: 'npm run build && npm run check:production && npm run preview -- --host 127.0.0.1 --port 4174 --strictPort',
      env: { VITE_BASE_PATH: '/cat-jump/' },
      url: 'http://127.0.0.1:4174/cat-jump/',
      reuseExistingServer: false,
    },
  ],
});
