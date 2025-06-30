# E2Eテスト自動修正スクリプト (Windows PowerShell版)

Write-Host "🚀 E2Eテスト自動修正ツール (Windows版)" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow
Write-Host ""

# 修正統計
$FixedCount = 0
$TotalErrors = 0

# 1. selectors.tsを作成
Write-Host "1. 共通セレクタファイルを作成中..." -ForegroundColor Yellow

$selectorsContent = @'
// 共通セレクタ定義
export const selectors = {
  admin: {
    loginEmail: 'input[type="email"]',
    loginPassword: 'input[type="password"]',
    loginSubmit: 'button[type="submit"]',
    dashboardTitle: 'h1:has-text("ダッシュボード")',
    
    // サイドバー
    sidebarCharacters: 'a:has-text("キャラクター管理")',
    sidebarTokens: 'a:has-text("トークチケット管理")',
    sidebarUsers: 'a:has-text("ユーザー管理")',
  },
  
  character: {
    createButton: 'button:has-text("新規作成")',
    editButton: 'button:has-text("編集")',
    deleteButton: 'button:has-text("削除")',
    saveButton: 'button:has-text("保存")',
    
    nameInput: 'input[name="name.ja"]',
    descriptionInput: 'textarea[name="description.ja"]',
  },
  
  token: {
    packTab: 'button:has-text("パック管理")',
    userTab: 'button:has-text("ユーザー管理")',
    createPackButton: 'button:has-text("新規作成")',
    
    packNameInput: 'input[name="name"]',
    packPriceInput: 'input[name="price"]',
    packTokenInput: 'input[name="tokenAmount"]',
  },
  
  common: {
    successToast: '.toast-success, .success-message, [role="alert"]:has-text("成功")',
    errorToast: '.toast-error, .error-message, [role="alert"]:has-text("エラー")',
    modalOverlay: '.modal-overlay, [role="dialog"]',
  }
};
'@

New-Item -Path "tests/e2e" -Name "selectors.ts" -ItemType File -Force -Value $selectorsContent | Out-Null
Write-Host "✅ tests/e2e/selectors.ts を作成しました" -ForegroundColor Green

# 2. base-template.spec.tsを作成
Write-Host "`n2. テストテンプレートを作成中..." -ForegroundColor Yellow

$templateContent = @'
import { test, expect } from '@playwright/test';
import { selectors } from './selectors';

// 共通のbeforeEach
export async function adminLogin(page) {
  await page.goto('/admin/login');
  await page.locator(selectors.admin.loginEmail).fill('admin@example.com');
  await page.locator(selectors.admin.loginPassword).fill('admin123');
  await page.locator(selectors.admin.loginSubmit).click();
  await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

// 要素の安全な取得
export async function safeClick(page, selector) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout: 5000 });
  await element.click();
}

// フォーム入力ヘルパー
export async function fillForm(page, formData) {
  for (const [selector, value] of Object.entries(formData)) {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible' });
    await element.fill(value.toString());
  }
}

// 成功確認
export async function expectSuccess(page) {
  await expect(page.locator(selectors.common.successToast)).toBeVisible({ timeout: 5000 });
}
'@

New-Item -Path "tests/e2e" -Name "base-template.spec.ts" -ItemType File -Force -Value $templateContent | Out-Null
Write-Host "✅ tests/e2e/base-template.spec.ts を作成しました" -ForegroundColor Green

# 3. strict mode violationの修正
Write-Host "`n3. Strict mode violation エラーを検索中..." -ForegroundColor Yellow

$specFiles = Get-ChildItem -Path "tests/e2e" -Filter "*.spec.ts" -Recurse
$issueFiles = @()

foreach ($file in $specFiles) {
    $content = Get-Content $file.FullName -Raw
    $hasIssue = $false
    
    # h1セレクタの問題をチェック
    if ($content -match 'page\.locator\(''h1''\)\.textContent\(\)') {
        $hasIssue = $true
        Write-Host "  ⚠️  $($file.Name): h1セレクタを修正が必要" -ForegroundColor Yellow
    }
    
    # buttonセレクタの問題をチェック
    if ($content -match 'page\.locator\(''button''\)' -and $content -notmatch 'button:has-text') {
        $hasIssue = $true
        Write-Host "  ⚠️  $($file.Name): buttonセレクタに:has-text()を追加推奨" -ForegroundColor Yellow
    }
    
    if ($hasIssue) {
        $issueFiles += $file
    }
}

# 4. 修正が必要なファイルのリストを作成
Write-Host "`n4. 修正が必要なファイルのリストを作成中..." -ForegroundColor Yellow

$reportContent = @"
# 修正が必要なE2Eテストファイル
生成日: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## 自動検出された問題

"@

foreach ($file in $issueFiles) {
    $content = Get-Content $file.FullName -Raw
    $issues = @()
    
    if ($content -match 'page\.locator\(''h1''\)') {
        $issues += "- [ ] h1セレクタをより具体的に（例: h1:has-text('特定のテキスト')）"
    }
    
    if ($content -match '\.click\(\)' -and $content -notmatch 'waitFor') {
        $issues += "- [ ] クリック前に要素の表示を待つ（.waitFor({ state: 'visible' })）"
    }
    
    if ($issues.Count -gt 0) {
        $reportContent += "`n### $($file.Name)`n"
        $reportContent += ($issues -join "`n") + "`n"
    }
}

$reportContent | Out-File -FilePath "fix-required-tests.md" -Encoding UTF8
Write-Host "✅ fix-required-tests.md を作成しました" -ForegroundColor Green

# 5. 一括修正のサンプルコマンドを表示
Write-Host "`n5. 一括修正のサンプルコマンド:" -ForegroundColor Yellow
Write-Host @"

# PowerShellでの一括置換例:

# h1セレクタを修正
Get-ChildItem -Path "tests/e2e" -Filter "*.spec.ts" -Recurse | ForEach-Object {
    (Get-Content `$_.FullName) -replace 'page\.locator\(''h1''\)', 'page.locator(''h1'').first()' | Set-Content `$_.FullName
}

# 特定のテストだけ実行
npm run test:e2e -- tests/e2e/admin/dashboard

"@ -ForegroundColor Cyan

Write-Host "`n✅ 完了！" -ForegroundColor Green
Write-Host "`n📌 次のステップ:" -ForegroundColor Yellow
Write-Host "1. fix-required-tests.md を確認して手動修正"
Write-Host "2. tests/e2e/selectors.ts を使ってセレクタを統一"
Write-Host "3. tests/e2e/base-template.spec.ts のヘルパー関数を活用"