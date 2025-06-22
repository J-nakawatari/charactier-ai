const mongoose = require('mongoose');
require('dotenv').config();

async function checkCache() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // CharacterPromptCacheモデルを直接定義
  const cacheSchema = new mongoose.Schema({}, { strict: false });
  const CharacterPromptCache = mongoose.model('CharacterPromptCache', cacheSchema);
  
  console.log('=== CharacterPromptCache 状況 ===');
  
  const count = await CharacterPromptCache.countDocuments();
  console.log(`総キャッシュ数: ${count}`);
  
  const recent = await CharacterPromptCache.find()
    .sort('-createdAt')
    .limit(5)
    .lean();
    
  console.log('\n最近のキャッシュ:');
  recent.forEach((cache, i) => {
    console.log(`\n${i + 1}. キャラクターID: ${cache.characterId}`);
    console.log(`   ユーザーID: ${cache.userId}`);
    console.log(`   作成日時: ${cache.createdAt}`);
    console.log(`   使用回数: ${cache.useCount}`);
    console.log(`   TTL: ${cache.ttl}`);
    console.log(`   親密度レベル: ${cache.promptConfig?.affinityLevel}`);
  });
  
  await mongoose.disconnect();
}

checkCache().catch(console.error);