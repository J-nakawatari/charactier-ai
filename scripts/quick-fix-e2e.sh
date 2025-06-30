#!/bin/bash

# E2Eテストの一般的なエラーを自動修正するスクリプト

echo "🚀 E2Eテスト自動修正ツール"
echo "========================="
echo ""

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 修正統計
FIXED_COUNT=0
TOTAL_ERRORS=0

# 1. strict mode violationの修正
echo -e "${YELLOW}1. Strict mode violation エラーを修正中...${NC}"
find tests/e2e -name "*.spec.ts" -type f | while read file; do
    # h1要素の修正
    if grep -q "page\.locator('h1')\.textContent()" "$file"; then
        echo "  📝 $file を修正中..."
        sed -i.bak -E "s/page\.locator\('h1'\)\.textContent\(\)/page.locator('h1').first().textContent()/g" "$file"
        ((FIXED_COUNT++))
    fi
    
    # button要素の修正
    if grep -q "page\.locator('button')" "$file"; then
        # has-textがない場合は追加を提案
        if ! grep -q "button:has-text" "$file"; then
            echo -e "  ${YELLOW}⚠️  $file: button セレクタに :has-text() を追加することを推奨${NC}"
        fi
    fi
done

# 2. 要素の可視性待機を追加
echo -e "\n${YELLOW}2. 要素の可視性待機を追加中...${NC}"
find tests/e2e -name "*.spec.ts" -type f | while read file; do
    # clickの前にwaitForを追加（まだない場合）
    if grep -q "\.click()" "$file" && ! grep -q "waitFor.*visible" "$file"; then
        echo -e "  ${YELLOW}⚠️  $file: .click() の前に .waitFor({ state: 'visible' }) を追加することを推奨${NC}"
    fi
done

# 3. 共通のセレクタパターンを最適化
echo -e "\n${YELLOW}3. セレクタパターンを最適化中...${NC}"
cat > tests/e2e/selectors.ts << 'EOF'
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
EOF

# 4. 基本テストテンプレートを生成
echo -e "\n${YELLOW}4. 基本テストテンプレートを生成中...${NC}"
cat > tests/e2e/base-template.spec.ts << 'EOF'
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
EOF

# 5. 問題のあるテストファイルをリスト化
echo -e "\n${YELLOW}5. 修正が必要なファイルをリスト化中...${NC}"
echo "# 修正が必要なE2Eテストファイル" > fix-required-tests.md
echo "生成日: $(date)" >> fix-required-tests.md
echo "" >> fix-required-tests.md

find tests/e2e -name "*.spec.ts" -type f | while read file; do
    ISSUES=""
    
    # よくある問題をチェック
    if grep -q "page\.locator('h1')\." "$file"; then
        ISSUES="$ISSUES\n  - [ ] h1セレクタをより具体的に"
    fi
    
    if grep -q "\.click()" "$file" && ! grep -q "waitFor" "$file"; then
        ISSUES="$ISSUES\n  - [ ] クリック前に要素の表示を待つ"
    fi
    
    if grep -q "timeout.*exceeded" "$file"; then
        ISSUES="$ISSUES\n  - [ ] タイムアウトを延長または非同期処理を改善"
    fi
    
    if [ -n "$ISSUES" ]; then
        echo "## $file" >> fix-required-tests.md
        echo -e "$ISSUES" >> fix-required-tests.md
        echo "" >> fix-required-tests.md
    fi
done

# 6. 一括実行スクリプトを生成
echo -e "\n${YELLOW}6. 一括テスト実行スクリプトを生成中...${NC}"
cat > run-e2e-parallel.sh << 'EOF'
#!/bin/bash

# 並列実行でE2Eテストを高速化

echo "🚀 E2Eテストを並列実行します..."

# テストファイルをグループに分割
ADMIN_TESTS=$(find tests/e2e/admin -name "*.spec.ts" | head -5)
USER_TESTS=$(find tests/e2e/user -name "*.spec.ts" | head -5)

# 並列実行
echo "管理画面テストを実行中..."
npx playwright test $ADMIN_TESTS --workers=3 &
PID1=$!

echo "ユーザー画面テストを実行中..."
npx playwright test $USER_TESTS --workers=3 &
PID2=$!

# 完了を待つ
wait $PID1 $PID2

echo "✅ テスト完了"
EOF

chmod +x run-e2e-parallel.sh

# 結果サマリー
echo -e "\n${GREEN}✅ 自動修正完了！${NC}"
echo ""
echo "📊 結果:"
echo "  - セレクタ定義: tests/e2e/selectors.ts"
echo "  - テストテンプレート: tests/e2e/base-template.spec.ts"
echo "  - 修正必要リスト: fix-required-tests.md"
echo "  - 並列実行スクリプト: run-e2e-parallel.sh"
echo ""
echo "📌 次のステップ:"
echo "1. fix-required-tests.md を確認して手動修正"
echo "2. selectors.ts を使ってセレクタを統一"
echo "3. base-template.spec.ts のヘルパー関数を活用"
echo "4. ./run-e2e-parallel.sh で並列実行してテスト時間短縮"