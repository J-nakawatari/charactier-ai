import { test, expect } from '@playwright/test';

test.describe('authaccountmanagement - login', () => {
  test('豁｣縺励＞隱崎ｨｼ諠・ｱ縺ｧ縺ｮ繝ｭ繧ｰ繧､繝ｳ謌仙粥', async ({ page }) => {
    // 縺ｾ縺壽眠隕冗匳骭ｲ縺ｧ繝・せ繝医Θ繝ｼ繧ｶ繝ｼ繧剃ｽ懈・
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    const testPassword = 'Test123!';
    
    // 譁ｰ隕冗匳骭ｲ
    await page.goto('/ja/register');
    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill(testPassword);
    await page.locator('#confirmPassword').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    
    // 逋ｻ骭ｲ螳御ｺ・ｒ蠕・▽
    await page.waitForURL('**/register-complete', { timeout: 10000 });
    
    // 繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｫ遘ｻ蜍・
    await page.goto('/ja/login');
    
    // 繝ｭ繧ｰ繧､繝ｳ繝輔か繝ｼ繝縺ｫ蜈･蜉・
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    
    // 繝ｭ繧ｰ繧､繝ｳ繝懊ち繝ｳ繧偵け繝ｪ繝・け
    await page.locator('button[type="submit"]').click();
    
    // 繝｡繝ｼ繝ｫ隱崎ｨｼ繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺瑚｡ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧堤｢ｺ隱・
    // ・域眠隕冗匳骭ｲ逶ｴ蠕後・繝｡繝ｼ繝ｫ隱崎ｨｼ縺悟ｿ・ｦ√↑縺溘ａ縲√％繧後′豁｣蟶ｸ縺ｪ蜍穂ｽ懶ｼ・
    await expect(page.getByText('繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ縺瑚ｪ崎ｨｼ縺輔ｌ縺ｦ縺・∪縺帙ｓ')).toBeVisible();
    
    // 縺薙・迥ｶ諷九〒繝ｭ繧ｰ繧､繝ｳ縺ｯ繝悶Ο繝・け縺輔ｌ繧九◆繧√√％繧後ｒ繝・せ繝医・謌仙粥縺ｨ縺吶ｋ
    console.log('繝｡繝ｼ繝ｫ隱崎ｨｼ縺悟ｿ・ｦ√↑縺溘ａ縲√Ο繧ｰ繧､繝ｳ縺ｯ繝悶Ο繝・け縺輔ｌ縺ｾ縺励◆・域悄蠕・壹ｊ縺ｮ蜍穂ｽ懶ｼ・);
  });
});

