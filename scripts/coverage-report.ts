#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface CoverageData {
  [key: string]: 'pending' | 'ready';
}

interface TestGroup {
  name: string;
  tests: {
    id: string;
    status: 'pending' | 'ready';
  }[];
}

interface SummaryReport {
  total: number;
  ready: number;
  pending: number;
  coverage: number;
  sections: {
    [key: string]: {
      total: number;
      ready: number;
      pending: number;
      coverage: number;
      groups: TestGroup[];
    };
  };
}

// カバレッジレポートを生成
function generateReport() {
  const coveragePath = path.join(process.cwd(), 'coverage.yaml');
  
  if (!fs.existsSync(coveragePath)) {
    console.error('Error: coverage.yaml not found');
    console.error('Run "npm run gen:specs" first to generate coverage data');
    process.exit(1);
  }
  
  const coverageData: CoverageData = yaml.parse(fs.readFileSync(coveragePath, 'utf-8'));
  
  // セクション別に集計
  const summary: SummaryReport = {
    total: 0,
    ready: 0,
    pending: 0,
    coverage: 0,
    sections: {}
  };
  
  // テストをグループ化
  for (const [testId, status] of Object.entries(coverageData)) {
    const parts = testId.split('.');
    const section = parts[0]; // user, admin, testfield
    const group = parts[1];   // authaccountmanagement, etc
    const subGroup = parts[2]; // newmemberregister, etc
    
    // セクション初期化
    if (!summary.sections[section]) {
      summary.sections[section] = {
        total: 0,
        ready: 0,
        pending: 0,
        coverage: 0,
        groups: []
      };
    }
    
    // グループを探す
    let testGroup = summary.sections[section].groups.find(g => g.name === group);
    if (!testGroup) {
      testGroup = { name: group, tests: [] };
      summary.sections[section].groups.push(testGroup);
    }
    
    // テストを追加
    testGroup.tests.push({ id: testId, status });
    
    // カウント
    summary.total++;
    summary.sections[section].total++;
    
    if (status === 'ready') {
      summary.ready++;
      summary.sections[section].ready++;
    } else {
      summary.pending++;
      summary.sections[section].pending++;
    }
  }
  
  // カバレッジ率を計算
  summary.coverage = Math.round((summary.ready / summary.total) * 100);
  for (const section of Object.values(summary.sections)) {
    section.coverage = Math.round((section.ready / section.total) * 100);
  }
  
  // レポートを出力
  console.log('\n📊 E2E Test Coverage Report');
  console.log('==========================\n');
  
  console.log(`Total Tests: ${summary.total}`);
  console.log(`✅ Ready: ${summary.ready}`);
  console.log(`⏳ Pending: ${summary.pending}`);
  console.log(`📈 Coverage: ${summary.coverage}%\n`);
  
  // セクション別詳細
  for (const [sectionName, section] of Object.entries(summary.sections)) {
    console.log(`\n## ${sectionName.toUpperCase()}`);
    console.log(`Tests: ${section.total} | Ready: ${section.ready} | Coverage: ${section.coverage}%`);
    
    // グループ別のサマリー
    for (const group of section.groups) {
      const readyCount = group.tests.filter(t => t.status === 'ready').length;
      const percentage = Math.round((readyCount / group.tests.length) * 100);
      const bar = generateProgressBar(percentage);
      
      console.log(`  ${group.name}: ${bar} ${percentage}% (${readyCount}/${group.tests.length})`);
    }
  }
  
  // JSONサマリーを保存
  const summaryPath = path.join(process.cwd(), 'coverage', 'summary.json');
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log(`\n💾 Summary saved to: coverage/summary.json`);
  
  // 未実装のテスト一覧を出力（オプション）
  if (process.argv.includes('--pending')) {
    console.log('\n⏳ Pending Tests:');
    for (const [testId, status] of Object.entries(coverageData)) {
      if (status === 'pending') {
        console.log(`  - ${testId}`);
      }
    }
  }
}

// プログレスバーを生成
function generateProgressBar(percentage: number): string {
  const width = 20;
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  
  return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
}

// メイン実行
generateReport();