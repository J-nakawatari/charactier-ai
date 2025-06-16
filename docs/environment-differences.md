# 環境差異による問題の解決ガイド

## 問題の根本原因

本番環境とローカル環境でアーキテクチャが異なることによる問題が頻発しています。

### ローカル環境
```
ブラウザ
  ↓
localhost:3000 (Next.js)
  ↓ (Route Handler経由)
localhost:5000 (Express.js)
```

### 本番環境
```
ブラウザ
  ↓
Nginx (https://charactier-ai.com)
  ├→ / → localhost:3000 (Next.js)
  └→ /api → localhost:5000 (Express.js)
```

## よくある間違いパターン

### 1. ❌ 本番環境でドメインURLを使用
```typescript
const backendUrl = isProduction 
  ? 'https://charactier-ai.com/api/user/profile'  // 無限ループ！
  : 'http://localhost:5000/api/user/profile';
```

### 2. ❌ ハードコードされたURL
```typescript
// バックエンドAPIを直接呼ぶ
fetch('http://localhost:5000/api/...'); // 本番で動かない
```

### 3. ❌ 環境変数の未設定
```typescript
process.env.BACKEND_URL // 本番環境で未定義
```

## 正しい実装方法

### 1. ✅ 環境変数を使用
```typescript
// .env.local (ローカル)
BACKEND_URL=http://localhost:5000

// .env.production (本番)
BACKEND_URL=http://localhost:5000  // 内部通信なのでlocalhostのまま！
```

### 2. ✅ Route Handler内での正しいAPI呼び出し
```typescript
// app/api/user/profile/route.ts
export async function GET(request: NextRequest) {
  // 環境変数を使用、デフォルト値も設定
  const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/user/profile`;
  
  const response = await fetch(backendUrl, {
    headers: {
      // 認証ヘッダーの転送
      'Authorization': request.headers.get('Authorization') || '',
    }
  });
  
  return NextResponse.json(await response.json());
}
```

### 3. ✅ クライアントサイドからのAPI呼び出し
```typescript
// クライアントコンポーネント内
// 相対パスを使用（Nginxが適切にルーティング）
const response = await fetch('/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## チェックリスト

本番デプロイ前に確認すること：

1. [ ] 環境変数が正しく設定されているか
2. [ ] APIのURLがハードコードされていないか
3. [ ] Route Handler内でのバックエンド呼び出しが内部通信(localhost)を使用しているか
4. [ ] クライアントサイドからのAPI呼び出しが相対パスを使用しているか
5. [ ] Nginxの設定が正しいか（/apiはバックエンド、それ以外はフロントエンド）

## デバッグ方法

```bash
# 本番サーバーで
# 1. 環境変数の確認
pm2 env charactier-frontend
pm2 env charactier-backend

# 2. ログの確認
pm2 logs charactier-frontend --lines 100
pm2 logs charactier-backend --lines 100

# 3. Nginx設定の確認
sudo nginx -t
cat /etc/nginx/sites-available/charactier-ai
```

## 今後の改善案

1. **環境変数の一元管理**
   - `.env.example` ファイルの作成
   - 環境変数チェックスクリプトの追加

2. **API呼び出しのラッパー関数**
   ```typescript
   // utils/api.ts
   export const backendFetch = (path: string, options?: RequestInit) => {
     const url = `${process.env.BACKEND_URL || 'http://localhost:5000'}${path}`;
     return fetch(url, options);
   };
   ```

3. **環境差異テスト**
   - ローカルでNginxを使用した本番環境シミュレーション
   - Docker Composeでの統一環境構築