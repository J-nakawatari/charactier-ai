import { test as base } from '@playwright/test';

// ネットワーク最適化を適用したテストを定義
export const test = base.extend({
  page: async ({ page }, use) => {
    // 不要なネットワークリクエストをブロック
    await page.route('**/telemetry/**', route => route.abort());
    await page.route('**/analytics/**', route => route.abort());
    await page.route('**/_next/static/chunks/pages/_app-*.js', route => route.abort());
    
    // Google Fonts などの外部リソースをブロック
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://fonts.gstatic.com/**', route => route.abort());
    
    // 画像の読み込みを高速化（テスト用のプレースホルダーを返す）
    await page.route('**/*.{png,jpg,jpeg,gif,webp}', route => {
      route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
      });
    });
    
    await use(page);
  },
});

export { expect } from '@playwright/test';