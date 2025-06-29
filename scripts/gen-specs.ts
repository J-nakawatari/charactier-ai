#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface TestItem {
  id: string;
  title: string;
  group: string;
  subGroup?: string;
  status: 'pending' | 'ready';
}

interface CoverageData {
  [key: string]: 'pending' | 'ready';
}

// テキストをスラッグ化（英数字とハイフンのみ）
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 特殊文字を削除
    .replace(/\s+/g, '-')      // スペースをハイフンに
    .replace(/-+/g, '-')       // 連続するハイフンを1つに
    .replace(/^-|-$/g, '');    // 先頭・末尾のハイフンを削除
}

// Markdownファイルを解析してテスト項目を抽出
function parseChecklist(content: string): TestItem[] {
  // Windows改行コード(\r\n)とUnix改行コード(\n)の両方に対応
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const items: TestItem[] = [];
  
  // console.log('Total lines in file:', lines.length);
  
  let currentSection = '';
  let currentGroup = '';
  let currentSubGroup = '';
  let sectionPrefix = '';
  
  for (const line of lines) {
    // セクション検出（## 🔍 ユーザー画面 (Frontend) など）
    const sectionMatch = line.match(/^##\s+[^\s]+\s+(.+?)(?:\s+\(.+\))?$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      sectionPrefix = currentSection === 'ユーザー画面' ? 'user' : 
                      currentSection === '管理画面' ? 'admin' : 
                      slugify(currentSection);
      // console.log('Found section:', currentSection, '-> prefix:', sectionPrefix);
      continue;
    }
    
    // グループ検出（### 1. 認証・アカウント管理 など）
    const groupMatch = line.match(/^###\s+\d+\.\s+(.+)$/);
    if (groupMatch) {
      currentGroup = groupMatch[1];
      // console.log('Found group:', currentGroup);
      continue;
    }
    
    // サブグループ検出（- [ ] **新規会員登録** など）
    const subGroupMatch = line.match(/^-\s+\[\s*\]\s+\*\*(.+?)\*\*$/);
    if (subGroupMatch) {
      currentSubGroup = subGroupMatch[1];
      // console.log('Found subgroup:', currentSubGroup);
      continue;
    }
    
    // テスト項目検出（  - [ ] 必須項目の入力チェック など）
    const itemMatch = line.match(/^\s+-\s+\[\s*\]\s+(.+)$/);
    if (itemMatch && currentGroup && currentSubGroup) {
      const title = itemMatch[1];
      // console.log('Found item:', title, 'in', currentGroup, '/', currentSubGroup);
      
      // IDを生成
      const groupSlug = slugify(currentGroup);
      const subGroupSlug = slugify(currentSubGroup);
      const titleSlug = slugify(title);
      const id = `${sectionPrefix}.${groupSlug}.${subGroupSlug}.${titleSlug}`;
      
      items.push({
        id,
        title,
        group: `${sectionPrefix}/${groupSlug}`,
        subGroup: subGroupSlug,
        status: 'pending'
      });
    }
  }
  
  return items;
}

// Playwrightのspecファイルを生成
function generateSpecFile(item: TestItem): string {
  const template = `import { test, expect } from '@playwright/test';

test.describe('${item.group.split('/')[1].replace(/-/g, ' ')} - ${item.subGroup?.replace(/-/g, ' ')}', () => {
  test('${item.title}', async ({ page }) => {
    test.fixme('auto-generated; implement me');
    
    // TODO: Implement test for: ${item.title}
    // Test ID: ${item.id}
    
    // Example structure:
    // await page.goto('/ja/...');
    // await expect(page.locator('...')).toBeVisible();
  });
});
`;
  
  return template;
}

// メイン処理
async function main() {
  const checklistPath = path.join(process.cwd(), 'docs/testing-checklist.md');
  const testsDir = path.join(process.cwd(), 'tests/e2e');
  const coveragePath = path.join(process.cwd(), 'coverage.yaml');
  
  // チェックリストを読み込み
  if (!fs.existsSync(checklistPath)) {
    console.error('Error: docs/testing-checklist.md not found');
    process.exit(1);
  }
  
  const content = fs.readFileSync(checklistPath, 'utf-8');
  // console.log('File read successfully, length:', content.length);
  
  const items = parseChecklist(content);
  
  console.log(`Found ${items.length} test items`);
  
  // 既存のcoverage.yamlを読み込み（存在する場合）
  let coverageData: CoverageData = {};
  if (fs.existsSync(coveragePath)) {
    const existingCoverage = fs.readFileSync(coveragePath, 'utf-8');
    coverageData = yaml.parse(existingCoverage) || {};
  }
  
  // テストファイルを生成
  let created = 0;
  let skipped = 0;
  
  for (const item of items) {
    // coverage.yamlに追加（既存のステータスは保持）
    if (!coverageData[item.id]) {
      coverageData[item.id] = 'pending';
    }
    
    // ファイルパスを生成
    const [section, group] = item.group.split('/');
    const fileName = `${item.subGroup}.spec.ts`;
    const dirPath = path.join(testsDir, section, group);
    const filePath = path.join(dirPath, fileName);
    
    // 既存ファイルはスキップ
    if (fs.existsSync(filePath)) {
      skipped++;
      continue;
    }
    
    // ディレクトリを作成
    fs.mkdirSync(dirPath, { recursive: true });
    
    // specファイルを生成
    const specContent = generateSpecFile(item);
    fs.writeFileSync(filePath, specContent);
    created++;
  }
  
  // coverage.yamlを更新
  const sortedCoverage = Object.keys(coverageData)
    .sort()
    .reduce((acc, key) => {
      acc[key] = coverageData[key];
      return acc;
    }, {} as CoverageData);
  
  fs.writeFileSync(coveragePath, yaml.stringify(sortedCoverage, { lineWidth: 0 }));
  
  console.log(`\n✅ Test generation complete:`);
  console.log(`   - Created: ${created} new spec files`);
  console.log(`   - Skipped: ${skipped} existing files`);
  console.log(`   - Total tests: ${items.length}`);
  console.log(`\n📊 Coverage data saved to: coverage.yaml`);
  console.log(`📁 Test files generated in: tests/e2e/`);
}

// エラーハンドリング
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});