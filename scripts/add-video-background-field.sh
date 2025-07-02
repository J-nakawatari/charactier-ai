#!/bin/bash

# 色付きの出力用
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📊 videoChatBackgroundフィールドをすべてのキャラクターに追加します...${NC}"

# MongoDB接続情報を.envから読み込む
# スクリプトがどこから実行されても動作するように複数のパスをチェック
if [ -f .env ]; then
    source .env
elif [ -f ../.env ]; then
    source ../.env
elif [ -f /var/www/charactier-ai/.env ]; then
    source /var/www/charactier-ai/.env
elif [ -f /var/www/charactier-ai/backend/.env ]; then
    source /var/www/charactier-ai/backend/.env
else
    echo -e "${RED}❌ .envファイルが見つかりません${NC}"
    echo "現在のディレクトリ: $(pwd)"
    echo "チェックしたパス:"
    echo "  - ./.env"
    echo "  - ../.env"
    echo "  - /var/www/charactier-ai/.env"
    echo "  - /var/www/charactier-ai/backend/.env"
    exit 1
fi

# MongoDBコマンドを実行
mongo "$MONGODB_URI" --eval '
db.characters.updateMany(
    { videoChatBackground: { $exists: false } },
    { $set: { videoChatBackground: null } }
);

var result = db.characters.updateMany(
    { videoChatBackground: { $exists: false } },
    { $set: { videoChatBackground: null } }
);

print("✅ 更新完了: " + result.modifiedCount + "個のキャラクターを更新しました");

// 星乃ゆまの確認
var yuma = db.characters.findOne({ _id: ObjectId("685913353428f47f2088e2ba") });
if (yuma) {
    print("\n🔍 星乃ゆまの確認:");
    print("  name: " + yuma.name.ja);
    print("  videoChatBackground: " + yuma.videoChatBackground);
    print("  フィールド存在: " + ("videoChatBackground" in yuma));
}
'

echo -e "${GREEN}✅ 完了しました！${NC}"