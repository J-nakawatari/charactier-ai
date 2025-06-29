import { test, expect } from '@playwright/test';

test.describe('デバッグテスト', () => {
  test('ブラウザ起動確認', async ({ page }) => {
    console.log('テスト開始');
    
    try {
      // シンプルなページアクセス
      await page.goto('http://localhost:3001/admin/login');
      console.log('ページアクセス成功');
      
      // タイトル取得
      const title = await page.title();
      console.log('ページタイトル:', title);
      
      // スクリーンショット
      await page.screenshot({ path: 'debug-screenshot.png' });
      console.log('スクリーンショット保存');
      
      expect(title).toBeTruthy();
    } catch (error) {
      console.error('エラー発生:', error);
      throw error;
    }
  });
});