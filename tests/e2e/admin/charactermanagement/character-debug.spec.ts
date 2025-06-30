import { test, expect } from '@playwright/test';

test.describe('チE��チE��チE��チE, () => {
  test('ブラウザ起動確誁E, async ({ page }) => {
    console.log('チE��ト開姁E);
    
    try {
      // シンプルなペ�Eジアクセス
      await page.goto('http://localhost:3001/admin/login');
      console.log('ペ�Eジアクセス成功');
      
      // タイトル取征E
      const title = await page.title();
      console.log('ペ�Eジタイトル:', title);
      
      // スクリーンショチE��
      await page.screenshot({ path: 'debug-screenshot.png' });
      console.log('スクリーンショチE��保孁E);
      
      expect(title).toBeTruthy();
    } catch (error) {
      console.error('エラー発甁E', error);
      throw error;
    }
  });
});
