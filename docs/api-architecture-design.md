# API アーキテクチャ設計書

## 設計原則

### 1. エンドポイントの明確な分離

#### バックエンド（Express）のエンドポイント
すべて `/api/v1/` で始まる
```
GET  /api/v1/users/profile      - ユーザープロフィール取得
PUT  /api/v1/users/profile      - ユーザープロフィール更新
GET  /api/v1/users/dashboard    - ダッシュボード情報取得
POST /api/v1/users/select-character - キャラクター選択
```

#### フロントエンド（Next.js Route Handler）のエンドポイント
すべて `/api/` で始まる（v1なし）
```
GET  /api/user/profile     - バックエンドの /api/v1/users/profile をプロキシ
GET  /api/user/dashboard   - バックエンドの /api/v1/users/dashboard をプロキシ
```

### 2. 環境に依存しない内部通信

#### ❌ 間違った例
```typescript
// 本番環境で外部ドメインを使う
const url = process.env.NODE_ENV === 'production' 
  ? 'https://charactier-ai.com/api/...'
  : 'http://localhost:5000/api/...';
```

#### ✅ 正しい例
```typescript
// 常に内部通信用のURLを使う
const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:5000';
const url = `${BACKEND_INTERNAL_URL}/api/v1/...`;
```

### 3. 統一されたAPIクライアント

```typescript
// utils/backend-client.ts
export class BackendClient {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:5000';
  }
  
  async fetch(path: string, options?: RequestInit) {
    const url = `${this.baseUrl}/api/v1${path}`;
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      }
    });
  }
}

// 使用例
const client = new BackendClient();
const response = await client.fetch('/users/profile', {
  headers: { 'Authorization': authHeader }
});
```

## 移行計画

### Phase 1: バックエンドのエンドポイント整理
1. 既存のエンドポイントを `/api/v1/` に移行
2. 重複するエンドポイントを統合
3. RESTful な命名規則に統一

### Phase 2: フロントエンドのRoute Handler整理
1. プロキシ専用のRoute Handlerに限定
2. ビジネスロジックはバックエンドに移動
3. 統一されたエラーハンドリング

### Phase 3: 環境変数の整理
1. `BACKEND_INTERNAL_URL` の導入
2. 本番環境でも `localhost:5000` を使用
3. 環境依存のコードを排除

## 期待される効果

1. **環境差異の解消** - ローカルと本番で同じコードパスを使用
2. **デバッグの容易化** - エンドポイントの役割が明確
3. **保守性の向上** - 一貫性のある設計
4. **パフォーマンス向上** - 不要な外部通信を排除