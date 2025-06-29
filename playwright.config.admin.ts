import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.testファイルを読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

export default defineConfig({
  testDir: './tests/e2e/admin',
  
  // MongoDBセットアップをスキップ
  // globalSetup: require.resolve('./tests/e2e/global-setup'),
  // globalTeardown: require.resolve('./tests/e2e/global-teardown'),
  
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 30000,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    headless: true,
    // ブラウザ起動オプション
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },
  
  outputDir: './test-results',
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  
  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run dev --prefix backend',
      port: 5000,
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
    {
      command: 'npm run dev --prefix frontend',
      port: 3001,
      reuseExistingServer: true,
      timeout: 120 * 1000,
    }
  ],
});