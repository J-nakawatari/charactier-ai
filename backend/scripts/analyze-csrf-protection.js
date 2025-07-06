#!/usr/bin/env node

/**
 * CSRF保護状態分析スクリプト
 * すべてのエンドポイントのCSRF保護状態を可視化
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// カラー出力用
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// 結果を格納
const results = {
  protected: [],
  unprotected: [],
  excluded: [],
  stats: {
    total: 0,
    protected: 0,
    unprotected: 0,
    byMethod: {}
  }
};

// CSRF除外パス（リフレッシュ、Webhook等）
const excludedPaths = [
  '/auth/refresh',
  '/auth/admin/refresh',
  '/webhook',
  '/health',
  '/csrf-token'
];

// ファイルからルート定義を抽出
function extractRoutes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const routes = [];
  
  // router.METHOD または app.METHOD パターン
  const routeRegex = /(router|app)\.(get|post|put|patch|delete|use)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  const matches = content.matchAll(routeRegex);
  
  for (const match of matches) {
    const method = match[2].toUpperCase();
    const path = match[3];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    
    // verifyCsrfTokenが同じ行または近くの行にあるかチェック
    const routeEndIndex = content.indexOf(')', match.index);
    const routeDefinition = content.substring(match.index, routeEndIndex);
    const hasCSRF = routeDefinition.includes('verifyCsrfToken');
    
    routes.push({
      method,
      path,
      file: filePath.replace(process.cwd() + '/', ''),
      line: lineNumber,
      hasCSRF,
      isExcluded: excludedPaths.some(excluded => path.includes(excluded))
    });
  }
  
  // routeRegistry.define パターン
  const registryRegex = /routeRegistry\.define\s*\(\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]\s*,\s*['"`]([^'"`]+)['"`]/gi;
  const registryMatches = content.matchAll(registryRegex);
  
  for (const match of registryMatches) {
    const method = match[1].toUpperCase();
    const path = match[2];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    
    const routeEndIndex = content.indexOf(')', match.index);
    const routeDefinition = content.substring(match.index, routeEndIndex);
    const hasCSRF = routeDefinition.includes('verifyCsrfToken');
    
    routes.push({
      method,
      path,
      file: filePath.replace(process.cwd() + '/', ''),
      line: lineNumber,
      hasCSRF,
      isExcluded: excludedPaths.some(excluded => path.includes(excluded))
    });
  }
  
  return routes;
}

// メイン処理
function analyzeCSRFProtection() {
  console.log(`${colors.cyan}=== CSRF保護状態分析 ===${colors.reset}\n`);
  
  // バックエンドのルートファイルを検索
  const files = glob.sync('src/**/*.{js,ts}', {
    ignore: ['**/node_modules/**', '**/tests/**', '**/test/**', '**/*.test.ts', '**/*.spec.ts']
  });
  
  // 各ファイルからルートを抽出
  files.forEach(file => {
    const routes = extractRoutes(file);
    routes.forEach(route => {
      results.stats.total++;
      
      // メソッド別統計
      if (!results.stats.byMethod[route.method]) {
        results.stats.byMethod[route.method] = { total: 0, protected: 0 };
      }
      results.stats.byMethod[route.method].total++;
      
      if (route.isExcluded) {
        results.excluded.push(route);
      } else if (route.hasCSRF) {
        results.protected.push(route);
        results.stats.protected++;
        results.stats.byMethod[route.method].protected++;
      } else {
        // GETとHEADは通常CSRF保護不要
        if (route.method !== 'GET' && route.method !== 'HEAD') {
          results.unprotected.push(route);
          results.stats.unprotected++;
        }
      }
    });
  });
  
  // 結果を表示
  console.log(`${colors.blue}📊 統計情報${colors.reset}`);
  console.log(`総エンドポイント数: ${results.stats.total}`);
  console.log(`CSRF保護済み: ${colors.green}${results.stats.protected}${colors.reset}`);
  console.log(`未保護（要対応）: ${colors.red}${results.stats.unprotected}${colors.reset}`);
  console.log(`除外対象: ${colors.yellow}${results.excluded.length}${colors.reset}\n`);
  
  // メソッド別統計
  console.log(`${colors.blue}📈 メソッド別統計${colors.reset}`);
  Object.entries(results.stats.byMethod).forEach(([method, stats]) => {
    if (method !== 'GET' && method !== 'HEAD') {
      const percentage = stats.total > 0 ? Math.round((stats.protected / stats.total) * 100) : 0;
      console.log(`${method}: ${stats.protected}/${stats.total} (${percentage}%)`);
    }
  });
  console.log('');
  
  // 未保護のエンドポイント一覧
  if (results.unprotected.length > 0) {
    console.log(`${colors.red}❌ CSRF保護が必要なエンドポイント${colors.reset}`);
    results.unprotected.forEach(route => {
      console.log(`${route.method} ${route.path}`);
      console.log(`  📄 ${route.file}:${route.line}`);
    });
    console.log('');
  }
  
  // 保護済みエンドポイント一覧（確認用）
  if (process.argv.includes('--verbose')) {
    console.log(`${colors.green}✅ CSRF保護済みエンドポイント${colors.reset}`);
    results.protected.forEach(route => {
      console.log(`${route.method} ${route.path}`);
      console.log(`  📄 ${route.file}:${route.line}`);
    });
    console.log('');
  }
  
  // レポートファイル生成
  const report = {
    generated: new Date().toISOString(),
    stats: results.stats,
    unprotected: results.unprotected,
    protected: results.protected,
    excluded: results.excluded
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'csrf-protection-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log(`${colors.cyan}📝 詳細レポートを生成しました: scripts/csrf-protection-report.json${colors.reset}`);
  
  // 未保護のエンドポイントがある場合は警告
  if (results.unprotected.length > 0) {
    console.log(`\n${colors.yellow}⚠️  警告: ${results.unprotected.length}個のエンドポイントがCSRF攻撃に対して脆弱です${colors.reset}`);
    return 1;
  }
  
  return 0;
}

// 実行
const exitCode = analyzeCSRFProtection();
process.exit(exitCode);