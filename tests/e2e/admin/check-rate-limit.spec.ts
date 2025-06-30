import { test, expect } from '@playwright/test';

test.describe('繝ｬ繝ｼ繝亥宛髯舌・迥ｶ諷狗｢ｺ隱・, () => {
  test('繝ｬ繝ｼ繝亥宛髯舌′辟｡蜉ｹ蛹悶＆繧後※縺・ｋ縺狗｢ｺ隱・, async ({ page }) => {
    console.log('剥 繝ｬ繝ｼ繝亥宛髯舌・迥ｶ諷九ｒ遒ｺ隱阪＠縺ｾ縺・);
    console.log('迺ｰ蠅・､画焚 DISABLE_RATE_LIMIT:', process.env.DISABLE_RATE_LIMIT);
    
    // 繝・ヰ繝・げ逕ｨ繧ｨ繝ｳ繝峨・繧､繝ｳ繝医↓繧｢繧ｯ繧ｻ繧ｹ・亥ｭ伜惠縺吶ｋ蝣ｴ蜷茨ｼ・
    const debugResponse = await page.request.get('/api/v1/debug/rate-limit-status').catch(() => null);
    if (debugResponse && debugResponse.ok()) {
      const status = await debugResponse.json();
      console.log('繝ｬ繝ｼ繝亥宛髯舌・迥ｶ諷・', status);
    }
    
    // 繝ｭ繧ｰ繧､繝ｳ繧定､・焚蝗櫁ｩｦ陦・
    for (let i = 0; i < 3; i++) {
      console.log(`\n隧ｦ陦・${i + 1}/3:`);
      
      await page.goto('/admin/login');
      await page.fill('input[type="email"]', 'admin@example.com');
      await page.fill('input[type="password"]', 'admin123');
      
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('/api/v1/auth/admin/login')
      );
      
      await page.click('button[type="submit"]');
      const response = await responsePromise;
      
      console.log(`- 繧ｹ繝・・繧ｿ繧ｹ: ${response.status()}`);
      console.log(`- 繝ｬ繝ｼ繝亥宛髯舌・繝・ム繝ｼ:`, {
        'X-RateLimit-Limit': response.headers()['x-ratelimit-limit'],
        'X-RateLimit-Remaining': response.headers()['x-ratelimit-remaining'],
        'Retry-After': response.headers()['retry-after']
      });
      
      if (response.status() === 429) {
        const body = await response.json();
        console.log('- 繧ｨ繝ｩ繝ｼ:', body.message);
        console.log('\n笶・繝ｬ繝ｼ繝亥宛髯舌′譛牙柑縺ｫ縺ｪ縺｣縺ｦ縺・∪縺呻ｼ・);
        console.log('莉･荳九・繧ｳ繝槭Φ繝峨〒繝舌ャ繧ｯ繧ｨ繝ｳ繝峨ｒ蜀崎ｵｷ蜍輔＠縺ｦ縺上□縺輔＞:');
        console.log('cd backend && npm run dev:test');
        break;
      } else if (response.ok()) {
        console.log('- 笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
        await page.waitForURL('**/admin/dashboard', { timeout: 5000 }).catch(() => {});
      }
      
      // 谺｡縺ｮ隧ｦ陦後∪縺ｧ蟆代＠蠕・▽
      await page.waitForTimeout(1000);
    }
  });
});
