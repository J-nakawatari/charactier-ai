# E2Eテスト自動化ガイド

## 推奨ツール

### 1. **Playwright** （推奨）
```bash
npm install -D @playwright/test
```

#### サンプルテストコード
```typescript
// tests/user-registration.spec.ts
import { test, expect } from '@playwright/test';

test('新規ユーザー登録フロー', async ({ page }) => {
  // 1. 登録ページへ移動
  await page.goto('/ja/register');
  
  // 2. フォーム入力
  await page.fill('[name="name"]', 'テストユーザー');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'Test1234!');
  await page.fill('[name="confirmPassword"]', 'Test1234!');
  
  // 3. 利用規約に同意
  await page.check('[name="terms"]');
  
  // 4. 登録ボタンクリック
  await page.click('button[type="submit"]');
  
  // 5. メール送信確認
  await expect(page).toHaveURL('/ja/register/complete');
});

test('チャット機能', async ({ page }) => {
  // ログイン済み状態を作成
  await page.goto('/ja/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'Test1234!');
  await page.click('button[type="submit"]');
  
  // キャラクター選択
  await page.goto('/ja/characters');
  await page.click('[data-character-id="free-character-1"]');
  
  // メッセージ送信
  await page.fill('[name="message"]', 'こんにちは');
  await page.click('button[type="submit"]');
  
  // AI応答を待つ
  await page.waitForSelector('.ai-message', { timeout: 10000 });
});
```

### 2. **Cypress**
```bash
npm install -D cypress
```

### 3. **テストデータ準備スクリプト**
```typescript
// scripts/prepare-test-data.ts
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';

async function prepareTestData() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  
  const db = client.db('charactier-test');
  
  // テストユーザー作成
  const testUsers = [
    {
      email: 'test-user-1@example.com',
      password: await bcrypt.hash('Test1234!', 10),
      name: 'テストユーザー1',
      tokens: 10000,
      emailVerified: true
    },
    {
      email: 'test-user-2@example.com',
      password: await bcrypt.hash('Test1234!', 10),
      name: 'テストユーザー2',
      tokens: 5000,
      emailVerified: true,
      purchasedCharacters: ['character-1', 'character-2']
    }
  ];
  
  await db.collection('users').insertMany(testUsers);
  
  // テストキャラクター作成
  const testCharacters = [
    {
      name: { ja: 'テストキャラ1', en: 'Test Character 1' },
      characterAccessType: 'free',
      isActive: true,
      // ... 他のフィールド
    }
  ];
  
  await db.collection('characters').insertMany(testCharacters);
  
  await client.close();
}
```

## APIテスト自動化

### Jest + Supertest
```typescript
// tests/api/auth.test.ts
import request from 'supertest';
import app from '../../backend/src/app';

describe('認証API', () => {
  test('POST /api/v1/auth/register', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'テストユーザー',
        email: 'test@example.com',
        password: 'Test1234!',
        language: 'ja'
      });
      
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message');
  });
  
  test('POST /api/v1/auth/login', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test1234!'
      });
      
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
  });
});
```

## Visual Regression Testing

### Percy.io 統合
```typescript
import { percySnapshot } from '@percy/playwright';

test('キャラクター一覧ページ', async ({ page }) => {
  await page.goto('/ja/characters');
  await percySnapshot(page, 'Characters List - Japanese');
  
  // 英語版も確認
  await page.goto('/en/characters');
  await percySnapshot(page, 'Characters List - English');
});
```

## 負荷テスト

### k6 スクリプト
```javascript
// tests/load/chat-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // 20ユーザーまで増加
    { duration: '1m', target: 20 },   // 20ユーザーを維持
    { duration: '30s', target: 0 },   // 0まで減少
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500'], // 99%のリクエストが1.5秒以内
  },
};

export default function () {
  // ログイン
  const loginRes = http.post('https://charactier-ai.com/api/v1/auth/login', {
    email: 'load-test@example.com',
    password: 'LoadTest123!'
  });
  
  const accessToken = loginRes.json('accessToken');
  
  // チャットメッセージ送信
  const chatRes = http.post(
    'https://charactier-ai.com/api/v1/chat/send',
    {
      characterId: 'test-character',
      message: 'テストメッセージ'
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  check(chatRes, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  sleep(1);
}
```

## CI/CD統合

### GitHub Actions
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        npm ci
        npx playwright install
        
    - name: Run API tests
      run: npm run test:api
      
    - name: Run E2E tests
      run: npm run test:e2e
      env:
        MONGODB_URI: mongodb://localhost:27017/test
        REDIS_URL: redis://localhost:6379
        
    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: test-results
        path: test-results/
```

## モニタリング

### Synthetic Monitoring (Datadog)
```javascript
// datadog-synthetics.js
const synthetics = require('@datadog/synthetics-ci-cli');

module.exports = {
  tests: [
    {
      name: 'User Registration Flow',
      type: 'browser',
      frequency: '30m',
      locations: ['aws:ap-northeast-1'],
      steps: [
        { type: 'goto', url: 'https://charactier-ai.com/ja/register' },
        { type: 'fill', selector: '[name="email"]', value: 'monitor@example.com' },
        // ... 他のステップ
      ]
    }
  ]
};
```

## テストデータ管理

### Seed データ
```typescript
// scripts/seed-test-data.ts
export const testData = {
  users: [
    {
      type: 'free',
      email: 'free-user@test.com',
      tokens: 1000
    },
    {
      type: 'premium',
      email: 'premium-user@test.com',
      tokens: 50000,
      purchasedCharacters: ['all']
    }
  ],
  scenarios: {
    'new-user': {
      steps: ['register', 'verify-email', 'setup', 'first-chat']
    },
    'power-user': {
      steps: ['login', 'purchase-tokens', 'unlock-character', 'level-up']
    }
  }
};
```

## 実行コマンド

```json
// package.json
{
  "scripts": {
    "test:unit": "jest --testPathPattern=unit",
    "test:api": "jest --testPathPattern=api",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:visual": "percy exec -- playwright test",
    "test:load": "k6 run tests/load/chat-load-test.js",
    "test:all": "npm run test:unit && npm run test:api && npm run test:e2e"
  }
}
```