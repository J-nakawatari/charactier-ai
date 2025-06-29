@echo off
echo 🚀 Starting backend in TEST mode
echo 📋 Setting environment variables:
echo   NODE_ENV: test
echo   DISABLE_RATE_LIMIT: true
echo.

set NODE_ENV=test
set DISABLE_RATE_LIMIT=true

npm run dev