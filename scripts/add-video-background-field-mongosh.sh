#!/bin/bash

# 色付きの出力用
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📊 videoChatBackgroundフィールドをすべてのキャラクターに追加します...${NC}"

# MongoDB接続情報を.envから読み込む
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
elif [ -f ../.env ]; then
    export $(grep -v '^#' ../.env | xargs)
else
    echo -e "${RED}❌ .envファイルが見つかりません${NC}"
    exit 1
fi

# MongoDBコマンドを実行
mongosh "$MONGODB_URI" --eval '
// videoChatBackgroundフィールドが存在しないドキュメントを更新
const result = db.characters.updateMany(
    { videoChatBackground: { $exists: false } },
    { $set: { videoChatBackground: null } }
);

console.log("✅ 更新完了: " + result.modifiedCount + "個のキャラクターを更新しました");

// 星乃ゆまの確認
const yuma = db.characters.findOne({ _id: ObjectId("685913353428f47f2088e2ba") });
if (yuma) {
    console.log("\n🔍 星乃ゆまの確認:");
    console.log("  name: " + yuma.name.ja);
    console.log("  videoChatBackground: " + yuma.videoChatBackground);
    console.log("  フィールド存在: " + ("videoChatBackground" in yuma));
    
    // すべてのフィールドを表示
    console.log("\n📋 すべてのフィールド:");
    Object.keys(yuma).forEach(key => {
        if (key.includes("video") || key.includes("Video")) {
            console.log("  " + key + ": " + yuma[key]);
        }
    });
}
'

echo -e "${GREEN}✅ 完了しました！${NC}"