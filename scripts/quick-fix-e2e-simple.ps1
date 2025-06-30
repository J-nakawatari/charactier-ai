# E2Eテスト自動修正スクリプト (シンプル版)
Write-Host "E2E Test Auto-Fix Tool (Windows)" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow
Write-Host ""

# 1. Create selectors.ts
Write-Host "1. Creating common selectors file..." -ForegroundColor Yellow

$selectorsContent = @'
// Common selectors definition
export const selectors = {
  admin: {
    loginEmail: 'input[type="email"]',
    loginPassword: 'input[type="password"]',
    loginSubmit: 'button[type="submit"]',
    dashboardTitle: 'h1:has-text("ダッシュボード")',
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
Write-Host "Done: tests/e2e/selectors.ts created" -ForegroundColor Green

# 2. Create test helpers
Write-Host "`n2. Creating test template..." -ForegroundColor Yellow

$helpersContent = @'
import { test, expect, Page } from '@playwright/test';
import { selectors } from './selectors';

// Admin login helper
export async function adminLogin(page: Page) {
  await page.goto('/admin/login');
  await page.locator(selectors.admin.loginEmail).fill('admin@example.com');
  await page.locator(selectors.admin.loginPassword).fill('admin123');
  await page.locator(selectors.admin.loginSubmit).click();
  await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

// Safe click helper
export async function safeClick(page: Page, selector: string) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout: 5000 });
  await element.click();
}

// Form fill helper
export async function fillForm(page: Page, formData: Record<string, string>) {
  for (const [selector, value] of Object.entries(formData)) {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible' });
    await element.fill(value.toString());
  }
}

// Success check helper
export async function expectSuccess(page: Page) {
  await expect(page.locator(selectors.common.successToast)).toBeVisible({ timeout: 5000 });
}
'@

New-Item -Path "tests/e2e" -Name "helpers.ts" -ItemType File -Force -Value $helpersContent | Out-Null
Write-Host "Done: tests/e2e/helpers.ts created" -ForegroundColor Green

# 3. Find test files with issues
Write-Host "`n3. Searching for test files with issues..." -ForegroundColor Yellow

$specFiles = Get-ChildItem -Path "tests/e2e" -Filter "*.spec.ts" -Recurse
$issueCount = 0

$report = @"
# E2E Test Issues Report
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Files needing attention:

"@

foreach ($file in $specFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $issues = @()
    
    # Check for common issues
    if ($content.Contains("page.locator('h1')")) {
        $issues += "- Use specific h1 selector (e.g., h1:has-text('specific text'))"
    }
    
    if ($content.Contains(".click()") -and -not $content.Contains("waitFor")) {
        $issues += "- Add waitFor before click operations"
    }
    
    if ($content.Contains("timeout exceeded")) {
        $issues += "- Increase timeout or add waitForLoadState"
    }
    
    if ($issues.Count -gt 0) {
        $issueCount++
        $report += "`n### $($file.Name)`n"
        $report += ($issues -join "`n") + "`n"
        Write-Host "  Found issues in: $($file.Name)" -ForegroundColor Yellow
    }
}

$report | Out-File -FilePath "e2e-test-issues.md" -Encoding UTF8
Write-Host "`nFound $issueCount files with issues" -ForegroundColor Yellow
Write-Host "Report saved to: e2e-test-issues.md" -ForegroundColor Green

# 4. Show fix examples
Write-Host "`n4. Quick fix examples:" -ForegroundColor Yellow
Write-Host @"

# Fix h1 selectors (run in PowerShell):
Get-ChildItem -Path "tests\e2e" -Filter "*.spec.ts" -Recurse | ForEach-Object {
    `$content = Get-Content `$_.FullName -Raw
    `$content = `$content -replace "page\.locator\('h1'\)", "page.locator('h1').first()"
    Set-Content -Path `$_.FullName -Value `$content
}

# Run specific test:
npm run test:e2e -- tests/e2e/admin/dashboard

# Run all admin tests:
npm run test:e2e -- tests/e2e/admin

"@ -ForegroundColor Cyan

Write-Host "`nDone!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Check e2e-test-issues.md for detailed issues"
Write-Host "2. Use tests/e2e/selectors.ts for consistent selectors"
Write-Host "3. Import helpers from tests/e2e/helpers.ts"
Write-Host "4. Run the fix commands shown above"