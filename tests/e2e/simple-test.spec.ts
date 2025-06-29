import { test, expect } from '@playwright/test';

test('基本的な動作確認', async ({ page }) => {
  // トップページにアクセス
  await page.goto('/');
  
  // ページが読み込まれるのを待つ
  await page.waitForLoadState('networkidle');
  
  // スクリーンショットを撮る
  await page.screenshot({ path: 'homepage.png' });
  
  // ログインページに移動
  await page.goto('/ja/login');
  await page.waitForLoadState('networkidle');
  
  // スクリーンショットを撮る
  await page.screenshot({ path: 'login-page.png' });
  
  // ページに何か表示されているか確認
  const pageContent = await page.textContent('body');
  console.log('ページ内容:', pageContent);
  
  // 何かしら表示されていることを確認
  expect(pageContent).toBeTruthy();
});