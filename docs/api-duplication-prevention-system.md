# 🔴 API重複防止システム - 実装ガイド

## 概要

このシステムは、Express.js アプリケーションでAPI エンドポイントの重複を**機械的に防ぐ**ための包括的なソリューションです。

人的ルールではなく、**実行時エラー**、**型レベル制約**、**静的解析**、**Git フック**を組み合わせて、API重複を物理的に不可能にします。

## システム構成

### 1. RouteRegistry（実行時防止）

API重複を検出した瞬間にアプリケーションを停止する中央集権型ルート管理システム。

**ファイル**: `backend/src/core/RouteRegistry.ts`

```typescript
import express, { RequestHandler } from 'express';

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
export type RouteKey = `${HTTPMethod}:${string}`;

export class RouteRegistry {
  private registeredRoutes = new Set<RouteKey>();
  private app: express.Application;

  constructor(app: express.Application) {
    this.app = app;
  }

  define(method: HTTPMethod, path: string, ...handlers: RequestHandler[]): void {
    const routeKey: RouteKey = `${method}:${path}`;
    
    if (this.registeredRoutes.has(routeKey)) {
      throw new Error(`🔴 APIルート重複エラー: ${method} ${path} は既に登録されています`);
    }
    
    this.registeredRoutes.add(routeKey);
    
    const methodName = method.toLowerCase() as keyof express.Application;
    (this.app[methodName] as Function)(path, ...handlers);
    
    console.log(`✅ ルート登録: ${method} ${path}`);
  }

  use(path: string, router: express.Router): void {
    this.app.use(path, router);
    console.log(`✅ ルーター登録: ${path}`);
  }
}
```

**使用方法**:

```typescript
// 従来の方法（重複の可能性あり）
app.get('/api/users', handler);
app.get('/api/users', anotherHandler); // 😱 重複！

// RouteRegistry使用（重複時に即座にエラー）
import routeRegistry from './core/RouteRegistry';

routeRegistry.setApp(app);
routeRegistry.define('GET', '/api/users', handler);
routeRegistry.define('GET', '/api/users', anotherHandler); // 🔴 実行時エラー！
```

### 2. 自動検出スクリプト（静的解析）

既存コードベース内のAPI重複を検出する自動スクリプト。

**ファイル**: `scripts/check-api-duplicates.js`

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function findAPIRoutes(filePath, content) {
  const routes = [];
  const fileName = path.basename(filePath);
  
  // app.use()でマウントされるルート
  const useMatches = content.match(/app\.use\(['"`]([^'"`]+)['"`],\s*(\w+)\)/g);
  if (useMatches) {
    useMatches.forEach(match => {
      const [, routePath, routerName] = match.match(/app\.use\(['"`]([^'"`]+)['"`],\s*(\w+)\)/);
      routes.push({
        type: 'use',
        path: routePath,
        method: 'ALL',
        file: fileName,
        router: routerName
      });
    });
  }
  
  // 直接定義されるルート
  const directMatches = content.match(/app\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]/g);
  if (directMatches) {
    directMatches.forEach(match => {
      const [, method, routePath] = match.match(/app\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]/);
      routes.push({
        type: 'direct',
        path: routePath,
        method: method.toUpperCase(),
        file: fileName
      });
    });
  }
  
  return routes;
}

function checkDuplicates() {
  const backendPath = path.join(__dirname, '../backend');
  const indexFile = path.join(backendPath, 'src/index.ts');
  
  if (!fs.existsSync(indexFile)) {
    console.error('❌ index.ts not found');
    return;
  }
  
  const indexContent = fs.readFileSync(indexFile, 'utf8');
  const routes = findAPIRoutes(indexFile, indexContent);
  
  // パス別にグループ化
  const pathGroups = {};
  routes.forEach(route => {
    if (!pathGroups[route.path]) {
      pathGroups[route.path] = [];
    }
    pathGroups[route.path].push(route);
  });
  
  // 重複チェック（同じHTTPメソッドのみ）
  const duplicates = Object.entries(pathGroups)
    .filter(([path, routes]) => {
      if (!path.startsWith('/api')) return false;
      
      const methodGroups = {};
      routes.forEach(route => {
        if (!methodGroups[route.method]) {
          methodGroups[route.method] = [];
        }
        methodGroups[route.method].push(route);
      });
      
      return Object.values(methodGroups).some(group => group.length > 1);
    });
  
  if (duplicates.length === 0) {
    console.log('✅ 重複するAPIエンドポイントは見つかりませんでした');
    return;
  }
  
  console.log('🔴 重複するAPIエンドポイントが見つかりました：\n');
  
  duplicates.forEach(([path, routes]) => {
    console.log(`📍 ${path}`);
    routes.forEach(route => {
      const info = route.type === 'use' 
        ? `  - ${route.method} (${route.file}) -> ${route.router}`
        : `  - ${route.method} (${route.file}) -> 直接定義`;
      console.log(info);
    });
    console.log('');
  });
  
  process.exit(1);
}

checkDuplicates();
```

### 3. ESLintカスタムルール（開発時防止）

コード記述時にリアルタイムでAPI重複を検出するESLintルール。

**ファイル**: `backend/eslint-plugin-custom-api-rules/index.js`

```javascript
const noDuplicateRoutes = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent duplicate API route definitions',
      category: 'Best Practices',
      recommended: true
    },
    fixable: null,
    schema: []
  },
  create(context) {
    const registeredRoutes = new Set();
    
    return {
      CallExpression(node) {
        if (
          node.callee &&
          node.callee.type === 'MemberExpression' &&
          node.callee.object &&
          node.callee.object.name === 'app' &&
          ['get', 'post', 'put', 'delete'].includes(node.callee.property.name) &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal'
        ) {
          const method = node.callee.property.name.toUpperCase();
          const path = node.arguments[0].value;
          const routeKey = `${method}:${path}`;
          
          if (registeredRoutes.has(routeKey)) {
            context.report({
              node,
              message: `🔴 重複するAPIルート: ${method} ${path} は既に定義されています`
            });
          } else {
            registeredRoutes.add(routeKey);
          }
        }
      }
    };
  }
};

const useRouteRegistry = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer using RouteRegistry over direct app methods',
      category: 'Best Practices',
      recommended: true
    },
    fixable: 'code',
    schema: []
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee &&
          node.callee.type === 'MemberExpression' &&
          node.callee.object &&
          node.callee.object.name === 'app' &&
          ['get', 'post', 'put', 'delete'].includes(node.callee.property.name)
        ) {
          const method = node.callee.property.name;
          
          context.report({
            node,
            message: `⚠️ app.${method}() の代わりに routeRegistry.define() を使用してください`,
            fix(fixer) {
              const methodUpper = method.toUpperCase();
              const sourceCode = context.getSourceCode();
              const argsText = node.arguments.map(arg => sourceCode.getText(arg)).join(', ');
              
              return fixer.replaceText(
                node,
                `routeRegistry.define('${methodUpper}', ${argsText})`
              );
            }
          });
        }
      }
    };
  }
};

module.exports = {
  rules: {
    'no-duplicate-routes': noDuplicateRoutes,
    'use-route-registry': useRouteRegistry
  }
};
```

**ESLint設定**: `backend/.eslintrc.js`

```javascript
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'custom-api-rules'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    
    // カスタムルール: API重複検出
    'custom-api-rules/no-duplicate-routes': 'error',
    'custom-api-rules/use-route-registry': 'warn'
  }
}
```

### 4. Git Hooks（コミット時防止）

コミット時に自動的にAPI重複をチェックし、重複があればコミットを拒否。

**ファイル**: `.git/hooks/pre-commit`

```bash
#!/bin/sh
# 機械的にAPI重複を防ぐpre-commitフック

echo "🔍 API重複チェック実行中..."

# 1. API重複チェック
node scripts/check-api-duplicates.js
if [ $? -ne 0 ]; then
  echo "❌ API重複が検出されました"
  exit 1
fi

# 2. TypeScriptコンパイルチェック
cd backend
npm run type-check
if [ $? -ne 0 ]; then
  echo "❌ TypeScript: 型エラーが検出されました"
  exit 1
fi
cd ..

echo "✅ 全てのAPI重複チェックが完了しました"
```

## 実装手順

### ステップ1: RouteRegistryの導入

1. `RouteRegistry.ts` を作成
2. `index.ts` で初期化:

```typescript
import routeRegistry from './core/RouteRegistry';

const app = express();
routeRegistry.setApp(app);
```

3. 既存の `app.get()` を `routeRegistry.define()` に置換:

```typescript
// Before
app.get('/api/users', handler);

// After
routeRegistry.define('GET', '/api/users', handler);
```

### ステップ2: 検出スクリプトの追加

1. `scripts/check-api-duplicates.js` を作成
2. `package.json` にスクリプト追加:

```json
{
  "scripts": {
    "check-api-duplicates": "node scripts/check-api-duplicates.js"
  }
}
```

### ステップ3: ESLintルールの設定

1. `eslint-plugin-custom-api-rules/` ディレクトリ作成
2. カスタムルールファイル作成
3. `.eslintrc.js` でプラグイン有効化

### ステップ4: Git Hooks設定

1. `.git/hooks/pre-commit` 作成
2. 実行権限付与: `chmod +x .git/hooks/pre-commit`

## 利点

### 🔴 完全な重複防止
- **実行時**: RouteRegistryが即座にエラーを投げる
- **開発時**: ESLintがリアルタイムで警告
- **コミット時**: Git hooksが自動チェック
- **CI/CD時**: 自動検出スクリプトで検証

### 🚀 開発効率向上
- 重複によるバグを事前に防止
- デバッグ時間の大幅削減
- APIエンドポイントの一元管理

### 📊 可視性向上
- 登録済みルートの完全なトレーサビリティ
- どのファイルでどのAPIが定義されているかを明確化

## 他プロジェクトへの応用

### 最小構成での導入

1. **RouteRegistryのみ** - 実行時防止だけでも効果大
2. **検出スクリプト追加** - 既存コードベースの棚卸し
3. **Git hooks設定** - チーム全体での強制適用

### カスタマイズポイント

- **パスパターン**: 対象とするAPIパスのフィルタリング
- **HTTPメソッド**: 対象メソッドの追加・除外
- **エラーメッセージ**: プロジェクト固有のメッセージに変更
- **ログ出力**: デバッグ情報の詳細度調整

### フレームワーク対応

- **Express.js**: 完全対応（本実装）
- **Fastify**: RouteRegistryをFastify用に調整
- **Koa.js**: ルーター登録方法を変更
- **NestJS**: デコレータベースの検出ロジック追加

## トラブルシューティング

### よくある問題

1. **Git hooksが動作しない**
   - 実行権限を確認: `ls -la .git/hooks/pre-commit`
   - パスの問題: フルパスで指定

2. **ESLintルールが効かない**
   - プラグインの読み込み確認
   - `.eslintrc.js` の設定確認

3. **RouteRegistryでエラーが出る**
   - 初期化順序の確認
   - app インスタンスの設定確認

### デバッグ方法

```typescript
// RouteRegistry のデバッグ出力
console.log('登録済みルート:', routeRegistry.getRegisteredRoutes());

// 重複チェックのテスト
try {
  routeRegistry.define('GET', '/test', handler);
  routeRegistry.define('GET', '/test', handler); // エラーになるはず
} catch (error) {
  console.log('期待通りエラー:', error.message);
}
```

## まとめ

このAPI重複防止システムは、**機械的な制約**により人的ミスを排除し、Express.js アプリケーションの信頼性を大幅に向上させます。

他のプロジェクトでも段階的に導入することで、API重複によるバグを根本的に防止できます。