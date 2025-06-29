
# E2Eテストエラー抽出 (PowerShell版)

Write-Host "📊 E2Eテストエラー抽出ツール (PowerShell版)" -ForegroundColor Cyan

# テスト実行とエラー抽出
Write-Host "テストを実行中..." -ForegroundColor Yellow
npx playwright test --reporter=list 2>&1 | Tee-Object -FilePath test-results-ps.txt

# エラーのみ抽出
$errors = Get-Content test-results-ps.txt | Select-String -Pattern "✗|Error:|Timeout|Expected"

# サマリー表示
$totalTests = (Get-Content test-results-ps.txt | Select-String -Pattern "✓|✗").Count
$failedTests = (Get-Content test-results-ps.txt | Select-String -Pattern "✗").Count
$passedTests = $totalTests - $failedTests

Write-Host ""
Write-Host "## テスト結果サマリー" -ForegroundColor Green
Write-Host "総テスト数: $totalTests"
Write-Host "✓ 成功: $passedTests" -ForegroundColor Green
Write-Host "✗ 失敗: $failedTests" -ForegroundColor Red

# エラーを表示
if ($failedTests -gt 0) {
    Write-Host ""
    Write-Host "## 失敗したテスト" -ForegroundColor Red
    $errors | Select-Object -First 20 | ForEach-Object { Write-Host $_ }
    
    # ファイルに保存
    $errors | Out-File -FilePath test-errors-ps.txt
    Write-Host ""
    Write-Host "💾 エラー詳細を test-errors-ps.txt に保存しました。" -ForegroundColor Yellow
}
