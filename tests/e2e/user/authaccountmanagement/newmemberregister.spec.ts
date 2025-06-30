import { test, expect } from '@playwright/test';

test.describe('authaccountmanagement - newmemberregister', () => {
  test('蠢・磯・岼縺ｮ蜈･蜉帙メ繧ｧ繝・け', async ({ page }) => {
    // 譁ｰ隕冗匳骭ｲ繝壹・繧ｸ縺ｫ遘ｻ蜍・
    await page.goto('/ja/register');
    
    // 繝壹・繧ｸ縺瑚ｪｭ縺ｿ霎ｼ縺ｾ繧後◆縺薙→繧堤｢ｺ隱・
    await page.waitForLoadState('networkidle');
    
    // 菴輔ｂ蜈･蜉帙○縺壹↓逋ｻ骭ｲ繝懊ち繝ｳ繧偵け繝ｪ繝・け
    await page.locator('button[type="submit"]').click();
    
    // 繧ｫ繧ｹ繧ｿ繝繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺瑚｡ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧堤｢ｺ隱・
    await expect(page.getByText('蠢・磯・岼繧貞・蜉帙＠縺ｦ縺上□縺輔＞').first()).toBeVisible();
    
    // 隍・焚縺ｮ繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺瑚｡ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ縺薙→繧堤｢ｺ隱・
    const errorMessages = await page.locator('text=蠢・磯・岼繧貞・蜉帙＠縺ｦ縺上□縺輔＞').count();
    expect(errorMessages).toBeGreaterThan(0);
  });
  
  test('豁｣蟶ｸ縺ｪ譁ｰ隕冗匳骭ｲ繝輔Ο繝ｼ', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    
    // 譁ｰ隕冗匳骭ｲ繝壹・繧ｸ縺ｫ遘ｻ蜍・
    await page.goto('/ja/register');
    
    // 繝輔か繝ｼ繝縺ｫ蜈･蜉・
    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill('Test123!');
    await page.locator('#confirmPassword').fill('Test123!');
    
    // 逋ｻ骭ｲ繝懊ち繝ｳ繧偵け繝ｪ繝・け
    await page.locator('button[type="submit"]').click();
    
    // 逋ｻ骭ｲ螳御ｺ・・繝ｼ繧ｸ縺ｸ縺ｮ繝ｪ繝繧､繝ｬ繧ｯ繝医ｒ遒ｺ隱・
    await page.waitForURL('**/register-complete', { timeout: 10000 });
    
    // 謌仙粥繝｡繝・そ繝ｼ繧ｸ縺ｾ縺溘・繝壹・繧ｸ縺瑚｡ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧堤｢ｺ隱・
    await expect(page.locator('body')).toBeVisible();
  });
});

