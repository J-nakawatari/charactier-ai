import { defineConfig } from '@playwright/test';

// 本番環境向けの軽量な設定
export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PRODUCTION_URL || 'https://charactier-ai.com',
    trace: 'off',
    screenshot: 'only-on-failure',
    // 本番環境では認証なし・読み取り専用のテストのみ
    ignoreHTTPSErrors: false,
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // 本番環境のテストは短時間で終わるべき
        timeout: 30000,
      },
    },
  ],
});