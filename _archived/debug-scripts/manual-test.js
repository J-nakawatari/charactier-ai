#!/usr/bin/env node

/**
 * 🧪 手動テスト - 実装機能の動作確認
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');

const BASE_URL = 'http://localhost:3004';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 有効なJWTトークンを生成
const generateTestToken = () => {
  const payload = {
    userId: '60d0fe4f5311236168a109ca',
    role: 'admin',
    email: 'admin@test.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24時間
  };

  return jwt.sign(payload, JWT_SECRET);
};

const testAPI = async (endpoint, method = 'GET', data = null) => {
  try {
    const token = generateTestToken();
    console.log(`🧪 Testing ${method} ${endpoint}`);

    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    console.log(`✅ ${endpoint}: ${response.status} - ${JSON.stringify(response.data).substring(0, 100)}...`);
    return { success: true, data: response.data };

  } catch (error) {
    if (error.response) {
      console.log(`❌ ${endpoint}: ${error.response.status} - ${error.response.data?.error || error.response.data}`);
    } else {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
};

const runManualTests = async () => {
  console.log('🚀 手動テスト開始');
  console.log('━'.repeat(50));

  // 1. セキュリティAPI
  console.log('\n🛡️ セキュリティAPI テスト');
  await testAPI('/api/admin/security-events');
  await testAPI('/api/admin/security-stats');

  // 2. TokenUsage分析API
  console.log('\n📊 TokenUsage分析API テスト');
  await testAPI('/api/admin/token-analytics/overview');
  await testAPI('/api/admin/token-analytics/profit-analysis');
  await testAPI('/api/admin/token-analytics/usage-trends');
  await testAPI('/api/admin/token-analytics/anomaly-detection');

  // 3. キャッシュAPI
  console.log('\n🗄️ キャッシュAPI テスト');
  await testAPI('/api/admin/cache/performance');
  await testAPI('/api/admin/cache/characters');
  await testAPI('/api/admin/cache/top-performing');
  await testAPI('/api/admin/cache/invalidation-stats');
  await testAPI('/api/admin/cache/cleanup', 'POST');

  // 4. 基本API確認
  console.log('\n🔍 基本API テスト');
  await testAPI('/api/user/dashboard', 'GET');

  console.log('\n🏁 手動テスト完了');
};

// 実行
runManualTests().catch(console.error);