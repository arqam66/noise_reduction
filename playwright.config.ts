import { defineConfig } from '@playwright/test';

// ponytail: Minimalist Playwright config targeting the running dev server on localhost:5173
export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5173',
    browserName: 'chromium',
    headless: true,
  },
});
