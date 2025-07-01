#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const mdDir = process.argv[2] || 'docs/ss/08/playwright-report/data';
const outputFile = process.argv[3] || 'coverage/consolidated-errors.md';

try {
  const files = readdirSync(mdDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  let content = '# 統合エラーレポート\n\n';
  content += `生成日時: ${new Date().toISOString()}\n`;
  content += `総ファイル数: ${files.length}\n\n`;

  const errorPatterns = {
    'Verification Error': [],
    'ログイン失敗': [],
    'その他のエラー': []
  };

  files.forEach((file, index) => {
    const filePath = join(mdDir, file);
    const fileContent = readFileSync(filePath, 'utf-8');
    
    // エラーパターンを分類
    if (fileContent.includes('Verification Error')) {
      errorPatterns['Verification Error'].push(file);
    } else if (fileContent.includes('操作に失敗しました')) {
      errorPatterns['ログイン失敗'].push(file);
    } else {
      errorPatterns['その他のエラー'].push(file);
    }

    content += `## ${index + 1}. ${file}\n\n`;
    content += fileContent;
    content += '\n---\n\n';
  });

  // サマリーを追加
  let summary = '# エラーサマリー\n\n';
  Object.entries(errorPatterns).forEach(([pattern, files]) => {
    summary += `## ${pattern}: ${files.length}件\n`;
    if (files.length > 0) {
      summary += files.slice(0, 5).map(f => `- ${f}`).join('\n');
      if (files.length > 5) {
        summary += `\n- ... 他${files.length - 5}件`;
      }
      summary += '\n\n';
    }
  });

  // サマリーを先頭に追加
  content = summary + '\n---\n\n' + content;

  writeFileSync(outputFile, content, 'utf-8');
  console.log(`✅ ${outputFile} に ${files.length} 個のファイルを統合しました`);

} catch (error) {
  console.error('Error consolidating files:', error);
  process.exit(1);
}