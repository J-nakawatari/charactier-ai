/**
 * Feature Flag動作確認テスト
 */

import axios from 'axios';
import { getFeatureFlags } from '../src/config/featureFlags';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function testFeatureFlags() {
  console.log('🚀 Feature Flag動作テスト開始\n');
  
  // 1. 現在の環境変数を表示
  console.log('📋 現在の環境変数:');
  console.log(`FEATURE_SECURE_COOKIE_AUTH: ${process.env.FEATURE_SECURE_COOKIE_AUTH || '未設定 (default: false)'}`);
  console.log(`FEATURE_CSRF_SAMESITE_STRICT: ${process.env.FEATURE_CSRF_SAMESITE_STRICT || '未設定 (default: false)'}`);
  console.log(`FEATURE_STRICT_JOI_VALIDATION: ${process.env.FEATURE_STRICT_JOI_VALIDATION || '未設定 (default: false)'}`);
  console.log(`FEATURE_LOG_UNKNOWN_FIELDS: ${process.env.FEATURE_LOG_UNKNOWN_FIELDS || '未設定 (default: false)'}\n`);
  
  // 2. バックエンドのFeature Flag設定を確認
  console.log('🔧 バックエンドのFeature Flag設定:');
  const flags = getFeatureFlags();
  console.log(JSON.stringify(flags, null, 2));
  console.log('');
  
  // 3. 公開APIエンドポイントをテスト
  console.log('🌐 公開APIエンドポイントのテスト:');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/v1/feature-flags/public`);
    console.log('レスポンス:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('エラー:', error.message);
  }
  console.log('');
  
  // 4. Cookie設定の確認
  console.log('🍪 Cookie設定の確認:');
  const { getCookieConfig, getRefreshCookieConfig } = require('../src/config/featureFlags');
  
  console.log('開発環境のCookie設定:');
  console.log('Access Token:', JSON.stringify(getCookieConfig(false), null, 2));
  console.log('Refresh Token:', JSON.stringify(getRefreshCookieConfig(false), null, 2));
  console.log('');
  
  console.log('本番環境のCookie設定:');
  console.log('Access Token:', JSON.stringify(getCookieConfig(true), null, 2));
  console.log('Refresh Token:', JSON.stringify(getRefreshCookieConfig(true), null, 2));
  console.log('');
  
  // 5. 設定変更のシミュレーション
  console.log('⚡ Feature Flag変更シミュレーション:');
  console.log('');
  console.log('従来方式（LocalStorage）を使用する場合:');
  console.log('```bash');
  console.log('export FEATURE_SECURE_COOKIE_AUTH=false');
  console.log('npm run dev');
  console.log('```');
  console.log('');
  console.log('新方式（HttpOnly Cookie）を使用する場合:');
  console.log('```bash');
  console.log('export FEATURE_SECURE_COOKIE_AUTH=true');
  console.log('export FEATURE_CSRF_SAMESITE_STRICT=true');
  console.log('npm run dev');
  console.log('```');
  console.log('');
  
  console.log('✅ テスト完了！');
}

// メイン実行
testFeatureFlags().catch(console.error);