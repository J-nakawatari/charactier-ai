import { test, expect } from '@playwright/test';

test('基本皁E��動作確誁E, async ({ page }) => {
  // トップ�Eージにアクセス
  await page.goto('/');
  
  // ペ�Eジが読み込まれるのを征E��
  await page.waitForLoadState('networkidle');
  
  // スクリーンショチE��を撮めE
  await page.screenshot({ path: 'homepage.png' });
  
  // ログインペ�Eジに移勁E
  await page.goto('/ja/login');
  await page.waitForLoadState('networkidle');
  
  // スクリーンショチE��を撮めE
  await page.screenshot({ path: 'login-page.png' });
  
  // ペ�Eジに何か表示されてぁE��か確誁E
  const pageContent = await page.textContent('body');
  console.log('ペ�Eジ冁E��:', pageContent);
  
  // 何かしら表示されてぁE��ことを確誁E
  expect(pageContent).toBeTruthy();
});
