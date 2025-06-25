import axios from 'axios';

async function testRateLimit() {
  const API_URL = process.argv[2] || 'https://charactier-ai.com/api/v1';
  const email = `test${Date.now()}@example.com`;
  
  console.log('🧪 レート制限テスト開始');
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`📧 テストメール: ${email}`);
  console.log('');

  try {
    // 1回目の登録試行
    console.log('1️⃣ 1回目の登録試行...');
    const response1 = await axios.post(`${API_URL}/auth/register`, {
      email,
      password: 'Test123456',
      locale: 'ja'
    }, {
      validateStatus: () => true,
      headers: {
        'X-Real-IP': '192.168.1.100' // テスト用の固定IP
      }
    });
    
    console.log(`   ステータス: ${response1.status}`);
    console.log(`   レスポンス:`, response1.data);
    
    if (response1.headers['x-ratelimit-remaining']) {
      console.log(`   残り回数: ${response1.headers['x-ratelimit-remaining']}`);
    }
    
    // 2回目の登録試行（別のメール）
    console.log('\n2️⃣ 2回目の登録試行（5秒後）...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const email2 = `test${Date.now()}@example.com`;
    const response2 = await axios.post(`${API_URL}/auth/register`, {
      email: email2,
      password: 'Test123456',
      locale: 'ja'
    }, {
      validateStatus: () => true,
      headers: {
        'X-Real-IP': '192.168.1.100'
      }
    });
    
    console.log(`   ステータス: ${response2.status}`);
    console.log(`   レスポンス:`, response2.data);
    
    // レート制限の情報を表示
    if (response2.status === 429) {
      console.log('\n⚠️  レート制限に到達しました');
      console.log(`   リトライまで: ${response2.data.retryAfter}秒`);
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('   レスポンス:', error.response.data);
    }
  }
}

// 実行
testRateLimit();