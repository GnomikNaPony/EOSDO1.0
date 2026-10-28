import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4174', viewport: { width: 1440, height: 900 }, locale: 'ru-RU', trace: 'retain-on-failure' },
  webServer: { command: 'npm run build && npm run preview -- --port 4174 --strictPort', port: 4174, reuseExistingServer: false },
});
