// シンプルなNode.jsスクリプト
// 使用方法: MONGODB_URI=mongodb://... node add-video-field-simple.js

const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI環境変数が設定されていません');
    console.log('使用方法: MONGODB_URI=mongodb://... node add-video-field-simple.js');
    process.exit(1);
  }
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ MongoDBに接続しました');
    
    const db = client.db();
    const collection = db.collection('characters');
    
    // videoChatBackgroundフィールドが存在しないドキュメントを更新
    const result = await collection.updateMany(
      { videoChatBackground: { $exists: false } },
      { $set: { videoChatBackground: null } }
    );
    
    console.log(`✅ ${result.modifiedCount}個のキャラクターを更新しました`);
    
    // 星乃ゆまの確認
    const yuma = await collection.findOne({ _id: new ObjectId('685913353428f47f2088e2ba') });
    if (yuma) {
      console.log('\n🔍 星乃ゆまの確認:');
      console.log('  name:', yuma.name?.ja || 'Unknown');
      console.log('  videoChatBackground:', yuma.videoChatBackground);
      console.log('  フィールド存在:', 'videoChatBackground' in yuma);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await client.close();
    console.log('\n✅ MongoDBから切断しました');
  }
}

main();