#!/bin/bash

# API_BASE_URL}/api/ を API_BASE_URL}/api/v1/ に置換するスクリプト

echo "🔧 Fixing API paths to include v1..."

# frontend ディレクトリ内の全ての .ts と .tsx ファイルを処理
find frontend -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l '\${API_BASE_URL}/api/' {} \; | while read file; do
    # /api/v1/ が既に含まれているパスは除外
    if grep -q '\${API_BASE_URL}/api/' "$file" && ! grep -q '\${API_BASE_URL}/api/v1/' "$file"; then
        echo "📝 Updating: $file"
        # sedを使って置換
        sed -i 's|\${API_BASE_URL}/api/|\${API_BASE_URL}/api/v1/|g' "$file"
    fi
done

echo "✅ API paths updated successfully!"