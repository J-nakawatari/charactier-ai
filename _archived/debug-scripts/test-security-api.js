#!/usr/bin/env node

/**
 * 🧪 セキュリティAPI統合テスト
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3004';

// テスト用の管理者JWT（本番では環境変数から取得）
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NjBjYzIxZjg5ODE4ZGNhZTAwN2I3NDQiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MzM5NjU4MjB9.test-token';

async function testSecurityAPIs() {
  console.log('🧪 セキュリティAPI統合テストを開始...\n');

  try {
    // 1. セキュリティイベント取得テスト
    console.log('1️⃣ セキュリティイベント取得テスト');
    const eventsResponse = await axios.get(`${BASE_URL}/api/admin/security-events`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    }).catch(error => ({ error: error.response?.data || error.message }));

    if (eventsResponse.error) {
      console.log('❌ エラー:', eventsResponse.error);
    } else {
      console.log('✅ 成功:', {
        eventsCount: eventsResponse.data.events?.length || 0,
        totalCount: eventsResponse.data.totalCount || 0
      });
    }

    // 2. セキュリティ統計取得テスト
    console.log('\n2️⃣ セキュリティ統計取得テスト');
    const statsResponse = await axios.get(`${BASE_URL}/api/admin/security-stats`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    }).catch(error => ({ error: error.response?.data || error.message }));

    if (statsResponse.error) {
      console.log('❌ エラー:', statsResponse.error);
    } else {
      console.log('✅ 成功:', statsResponse.data);
    }

    // 3. 違反解決テスト（実際の違反IDがあれば）
    if (eventsResponse.data?.events?.length > 0) {
      const firstEvent = eventsResponse.data.events[0];
      if (!firstEvent.isResolved) {
        console.log('\n3️⃣ 違反解決テスト');
        const resolveResponse = await axios.post(
          `${BASE_URL}/api/admin/resolve-violation/${firstEvent.id}`,
          { notes: 'テスト解決' },
          { headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` } }
        ).catch(error => ({ error: error.response?.data || error.message }));

        if (resolveResponse.error) {
          console.log('❌ エラー:', resolveResponse.error);
        } else {
          console.log('✅ 成功:', resolveResponse.data);
        }
      } else {
        console.log('\n3️⃣ 違反解決テスト - スキップ（解決済み違反のみ）');
      }
    } else {
      console.log('\n3️⃣ 違反解決テスト - スキップ（違反記録なし）');
    }

  } catch (error) {
    console.error('🚨 テスト実行エラー:', error.message);
  }

  console.log('\n🧪 テスト完了！');
}

// メイン実行
testSecurityAPIs();