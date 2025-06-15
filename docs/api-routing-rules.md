# APIルーティング設計規則

## 基本原則

### 1. 一つのAPIパスに対して一つの実装のみ
- 同じHTTPメソッド + パスの組み合わせは一箇所でのみ定義
- 重複定義は禁止

### 2. ルートファイル分離のルール

#### 小規模なAPI（1-2エンドポイント）
```javascript
// ✅ 良い例: index.tsで直接定義
app.post('/api/user/logout', authenticateToken, async (req, res) => {
  // シンプルな処理
});
```

#### 大規模なAPI（3エンドポイント以上）
```javascript
// ✅ 良い例: 別ファイルに分離
app.use('/api/user', userRoutes);
```

### 3. 移行時のルール

#### ルートファイルに分離する場合
1. 新しいルートファイルを作成
2. `app.use()`でマウント
3. **index.tsから古い定義を削除** ← 重要！

## ディレクトリ構造

```
backend/
├── src/index.ts           # メインファイル（app.use のみ）
├── routes/
│   ├── auth.js           # /api/auth/*
│   ├── user.js           # /api/user/*
│   ├── admin/
│   │   ├── users.js      # /api/admin/users/*
│   │   └── tokens.js     # /api/admin/tokens/*
│   └── characters.js     # /api/characters/*
```

## チェックリスト

### 新しいAPIエンドポイント追加時
- [ ] 既存の同じパスがないか検索済み
- [ ] 適切なルートファイルに配置済み
- [ ] 認証ミドルウェアが適切に設定済み
- [ ] OpenAPI仕様書に追記済み

### ルートファイル分離時
- [ ] 新しいルートファイル作成済み
- [ ] app.use()でマウント済み
- [ ] 古いindex.tsの定義を削除済み
- [ ] テスト実行済み

## 違反検出

```bash
# 重複チェック実行
npm run check-api-duplicates

# コミット前チェック
npm run precommit
```