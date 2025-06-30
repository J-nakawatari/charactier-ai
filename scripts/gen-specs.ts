#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { writeUtf8 } from './_shared/fs';

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

// テキストをスラッグ化（日本語対応版）
function slugify(text: string): string {
  // 日本語テキストをローマ字風に変換する簡易マッピング
  const japaneseToRomaji: { [key: string]: string } = {
    '認証': 'auth',
    'アカウント': 'account',
    '管理': 'management',
    '新規': 'new',
    '会員': 'member',
    '登録': 'register',
    'メール': 'email',
    'ログイン': 'login',
    'ログアウト': 'logout',
    '削除': 'delete',
    'ダッシュボード': 'dashboard',
    'ユーザー': 'user',
    '情報': 'info',
    '表示': 'display',
    'キャラクター': 'character',
    '親密度': 'affinity',
    '一覧': 'list',
    'フィルター': 'filter',
    'ソート': 'sort',
    '検索': 'search',
    'チャット': 'chat',
    '機能': 'function',
    '履歴': 'history',
    'ライブラリ': 'library',
    'ギャラリー': 'gallery',
    '画像': 'image',
    'モーダル': 'modal',
    'トークン': 'token',
    '購入': 'purchase',
    '決済': 'payment',
    'プロフィール': 'profile',
    '設定': 'settings',
    '通知': 'notification',
    'エラー': 'error',
    'ハンドリング': 'handling',
    'ネットワーク': 'network',
    'バリデーション': 'validation',
    '管理者': 'admin',
    '統計': 'stats',
    'グラフ': 'graph',
    '編集': 'edit',
    '制御': 'control',
    '作成': 'create',
    '収益': 'revenue',
    'システム': 'system',
    '監視': 'monitoring',
    'セキュリティ': 'security',
    'フロー': 'flow',
    'テスト': 'test',
    '同時': 'concurrent',
    'アクセス': 'access',
    'データ': 'data',
    '整合性': 'consistency',
    'レスポンシブ': 'responsive',
    '多言語': 'i18n',
    'パフォーマンス': 'performance',
    '本番': 'production',
    '環境': 'environment',
    '基本': 'basic',
    '変更': 'change',
    '保存': 'save',
    '確認': 'confirm',
    'パスワード': 'password',
    '選択': 'select',
    'ドロップダウン': 'dropdown',
    '詳細': 'detail',
    'リアルタイム': 'realtime',
    '必須': 'required',
    '項目': 'field',
    '入力': 'input',
    'チェック': 'check',
    '一致': 'match',
    '形式': 'format',
    '利用規約': 'terms',
    '同意': 'agree',
    '完了': 'complete',
    '送信': 'send',
    '初回': 'first',
    'ボーナス': 'bonus',
    '付与': 'grant',
    '言語': 'language',
    '反映': 'reflect',
    '受信': 'receive',
    'リンク': 'link',
    'クリック': 'click',
    '適切': 'appropriate',
    'メッセージ': 'message',
    '期限切れ': 'expired',
    'セットアップ': 'setup',
    'ページ': 'page',
    '遷移': 'transition',
    '正しい': 'correct',
    '成功': 'success',
    '誤った': 'wrong',
    'リダイレクト': 'redirect',
    'リメンバーミー': 'remember-me',
    '動作': 'operation',
    '処理': 'process',
    'トップ': 'top',
    'ローカルストレージ': 'localstorage',
    'クリア': 'clear',
    'ストリーム': 'stream',
    '切断': 'disconnect',
    'ダイアログ': 'dialog',
    '検証': 'verify',
    '残高': 'balance',
    '総': 'total',
    '数': 'count',
    'レベル': 'level',
    '経験値': 'exp',
    'バー': 'bar',
    '次': 'next',
    '必要': 'required',
    'アンロック': 'unlock',
    '全': 'all',
    '無料': 'free',
    '有料': 'paid',
    '区別': 'distinguish',
    '済み': 'completed',
    '未': 'not',
    '状態': 'status',
    'ベース': 'base',
    'のみ': 'only',
    '人気': 'popular',
    '順': 'order',
    '新着': 'newest',
    '名前': 'name',
    'タグ': 'tag',
    '性格': 'personality',
    '結果': 'result',
    'リセット': 'reset',
    '開始': 'start',
    '画面': 'screen',
    '初期': 'initial',
    'テーマカラー': 'theme-color',
    '送受信': 'send-receive',
    '返信': 'reply',
    '消費': 'consume',
    'インジケーター': 'indicator',
    '時': 'when',
    'リトライ': 'retry',
    'による': 'by',
    '獲得': 'gain',
    'アップ': 'up',
    'ポップアップ': 'popup',
    '新規': 'new',
    '過去': 'past',
    'スクロール': 'scroll',
    '日付': 'date',
    '区切り': 'separator',
    '中': 'middle',
    'プレビュー': 'preview',
    'レアリティ': 'rarity',
    'タイトル': 'title',
    '説明文': 'description',
    'キー': 'key',
    'クローズ': 'close',
    'グリッド': 'grid',
    'リスト': 'list',
    '切替': 'switch',
    'パック': 'pack',
    '価格': 'price',
    '円': 'yen',
    '利益率': 'profit-rate',
    '維持': 'maintain',
    'チェックアウト': 'checkout',
    'セッション': 'session',
    'リダイレクト': 'redirect',
    '戻り': 'return',
    '記録': 'record',
    'ボタン': 'button',
    '可能': 'possible',
    'になる': 'become',
    'こと': 'thing',
    '名': 'name',
    'アドレス': 'address',
    '内容': 'content',
    '現在': 'current',
    '新しい': 'new',
    '完了': 'complete',
    'エラー': 'error',
    '提供': 'provide',
    '更新': 'update',
    '自動': 'auto',
    '試行': 'try',
    'フォーム': 'form',
    'ハイライト': 'highlight',
    'フィールド': 'field'
  };
  
  // 日本語を英語に置換
  let result = text;
  for (const [ja, en] of Object.entries(japaneseToRomaji)) {
    result = result.replace(new RegExp(ja, 'g'), en);
  }
  
  return result
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 特殊文字を削除（英数字以外）
    .replace(/\s+/g, '-')      // スペースをハイフンに
    .replace(/-+/g, '-')       // 連続するハイフンを1つに
    .replace(/^-|-$/g, '')     // 先頭・末尾のハイフンを削除
    .substring(0, 50);         // 最大50文字に制限
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
    writeUtf8(filePath, specContent);
    created++;
  }
  
  // coverage.yamlを更新
  const sortedCoverage = Object.keys(coverageData)
    .sort()
    .reduce((acc, key) => {
      acc[key] = coverageData[key];
      return acc;
    }, {} as CoverageData);
  
  writeUtf8(coveragePath, yaml.stringify(sortedCoverage, { lineWidth: 0 }));
  
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