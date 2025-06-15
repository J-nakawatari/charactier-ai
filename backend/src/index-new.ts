// RouteRegistryを使った新しいindex.ts - 重複が物理的に不可能

import express from 'express';
import RouteRegistry from './core/RouteRegistry';
import { authenticateToken } from './middleware/auth';

const app: express.Application = express();

// RouteRegistryにExpressアプリを設定
RouteRegistry.setApp(app);

// ルート定義（重複不可能）
try {
  // ✅ 正常な定義
  RouteRegistry.define('GET', '/api/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  // ❌ これは実行時エラーになる
  // RouteRegistry.define('GET', '/api/health', (req, res) => {
  //   res.json({ duplicate: true });
  // });

  // ✅ 認証付きルート
  RouteRegistry.define('POST', '/api/user/logout', authenticateToken, async (req, res) => {
    // ログアウト処理
    res.json({ success: true });
  });

  // ---------------- Dashboard ----------------------
  // ※まだルーター実装が無いので読み込みを無効化しておく
  // import dashboardRoutes from '../routes/dashboard';
  
  // RouteRegistry.define(
  //   'GET',
  //   '/api/dashboard',
  //   authenticateToken,
  //   dashboardRoutes.getDashboard             // or whatever you had
  // );

} catch (error) {
  console.error('🔴 ルート定義エラー:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// サーバー起動時に登録済みルートを表示
app.listen(3004, () => {
  console.log('🚀 Server started on port 3004');
  console.log('\n📋 登録済みAPIルート:');
  RouteRegistry.getRegisteredRoutes().forEach(({ route, file }) => {
    console.log(`  ${route} (${file})`);
  });
});

export default app;