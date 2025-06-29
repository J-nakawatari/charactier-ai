#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { execSync } from 'child_process';

interface CoverageData {
  [key: string]: 'pending' | 'ready';
}

interface CoverageSummary {
  total: number;
  ready: number;
  pending: number;
  percentage: number;
  bySection: {
    [section: string]: {
      total: number;
      ready: number;
      pending: number;
      percentage: number;
    };
  };
  timestamp: string;
}

// Playwrightのテスト一覧を取得
function getPlaywrightTests(): Set<string> {
  const testIds = new Set<string>();
  
  try {
    // playwright listコマンドを実行
    const output = execSync('npx playwright test --list', { encoding: 'utf-8' });
    const lines = output.split('\n');
    
    // テストIDを抽出（Test IDコメントから）
    for (const line of lines) {
      const match = line.match(/Test ID:\s+([a-z0-9.-]+)/);
      if (match) {
        testIds.add(match[1]);
      }
    }
  } catch (error) {
    console.warn('Warning: Could not get Playwright test list. Running basic coverage analysis.');
  }
  
  return testIds;
}

// カバレッジレポートを生成
function generateReport(coverageData: CoverageData, implementedTests: Set<string>): CoverageSummary {
  const summary: CoverageSummary = {
    total: 0,
    ready: 0,
    pending: 0,
    percentage: 0,
    bySection: {},
    timestamp: new Date().toISOString()
  };
  
  // 各テストの状態を集計
  for (const [testId, status] of Object.entries(coverageData)) {
    summary.total++;
    
    // セクションを抽出
    const section = testId.split('.')[0];
    if (!summary.bySection[section]) {
      summary.bySection[section] = {
        total: 0,
        ready: 0,
        pending: 0,
        percentage: 0
      };
    }
    
    summary.bySection[section].total++;
    
    // ステータスをカウント
    if (status === 'ready' && (implementedTests.size === 0 || implementedTests.has(testId))) {
      summary.ready++;
      summary.bySection[section].ready++;
    } else {
      summary.pending++;
      summary.bySection[section].pending++;
    }
  }
  
  // パーセンテージを計算
  summary.percentage = summary.total > 0 ? Math.round((summary.ready / summary.total) * 100) : 0;
  
  for (const section of Object.values(summary.bySection)) {
    section.percentage = section.total > 0 ? Math.round((section.ready / section.total) * 100) : 0;
  }
  
  return summary;
}

// メイン処理
async function main() {
  const coveragePath = path.join(process.cwd(), 'coverage.yaml');
  const reportDir = path.join(process.cwd(), 'coverage');
  const summaryPath = path.join(reportDir, 'summary.json');
  const detailPath = path.join(reportDir, 'detail.md');
  
  // coverage.yamlを読み込み
  if (!fs.existsSync(coveragePath)) {
    console.error('Error: coverage.yaml not found. Run "npm run gen:specs" first.');
    process.exit(1);
  }
  
  const coverageData: CoverageData = yaml.parse(fs.readFileSync(coveragePath, 'utf-8'));
  
  // 実装済みテストを取得
  const implementedTests = getPlaywrightTests();
  
  // レポートを生成
  const summary = generateReport(coverageData, implementedTests);
  
  // レポートディレクトリを作成
  fs.mkdirSync(reportDir, { recursive: true });
  
  // サマリーをJSON形式で保存
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  // 詳細レポートをMarkdown形式で生成
  let detailReport = `# Test Coverage Report

Generated: ${new Date().toLocaleString()}

## Summary

- **Total Tests**: ${summary.total}
- **Implemented**: ${summary.ready} (${summary.percentage}%)
- **Pending**: ${summary.pending}

## Coverage by Section

`;
  
  for (const [section, stats] of Object.entries(summary.bySection)) {
    detailReport += `### ${section}\n`;
    detailReport += `- Total: ${stats.total}\n`;
    detailReport += `- Ready: ${stats.ready} (${stats.percentage}%)\n`;
    detailReport += `- Pending: ${stats.pending}\n\n`;
    
    // プログレスバーを追加
    const barLength = 20;
    const filledLength = Math.round((stats.percentage / 100) * barLength);
    const emptyLength = barLength - filledLength;
    const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
    detailReport += `Progress: [${progressBar}] ${stats.percentage}%\n\n`;
  }
  
  // 未実装テストのリスト
  detailReport += `## Pending Tests\n\n`;
  const pendingTests = Object.entries(coverageData)
    .filter(([_, status]) => status === 'pending')
    .map(([id]) => id);
  
  if (pendingTests.length > 0) {
    for (const testId of pendingTests.slice(0, 20)) {
      detailReport += `- ${testId}\n`;
    }
    if (pendingTests.length > 20) {
      detailReport += `\n... and ${pendingTests.length - 20} more\n`;
    }
  } else {
    detailReport += `All tests are implemented! 🎉\n`;
  }
  
  // 詳細レポートを保存
  fs.writeFileSync(detailPath, detailReport);
  
  // コンソール出力
  console.log('\n📊 Test Coverage Report');
  console.log('======================');
  console.log(`Total Coverage: ${summary.percentage}% (${summary.ready}/${summary.total})`);
  console.log('\nBy Section:');
  
  for (const [section, stats] of Object.entries(summary.bySection)) {
    const barLength = 20;
    const filledLength = Math.round((stats.percentage / 100) * barLength);
    const emptyLength = barLength - filledLength;
    const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
    console.log(`  ${section}: [${progressBar}] ${stats.percentage}% (${stats.ready}/${stats.total})`);
  }
  
  console.log(`\n✅ Reports saved to:`);
  console.log(`   - ${summaryPath}`);
  console.log(`   - ${detailPath}`);
}

// エラーハンドリング
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});