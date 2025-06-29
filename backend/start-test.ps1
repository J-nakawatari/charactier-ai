# PowerShell script for starting backend in test mode
Write-Host "🚀 Starting backend in TEST mode" -ForegroundColor Green
Write-Host "📋 Setting environment variables:" -ForegroundColor Yellow
Write-Host "  NODE_ENV: test" -ForegroundColor Cyan
Write-Host "  DISABLE_RATE_LIMIT: true" -ForegroundColor Cyan
Write-Host ""

$env:NODE_ENV = "test"
$env:DISABLE_RATE_LIMIT = "true"

# Start the backend
npm run dev