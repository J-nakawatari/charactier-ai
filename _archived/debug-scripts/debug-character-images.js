const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

// LocalizedString スキーマ
const LocalizedStringSchema = new mongoose.Schema({
  ja: { type: String, required: true },
  en: { type: String, required: true }
}, { _id: false });

// 正しいCharacter スキーマを再定義
const CharacterSchema = new mongoose.Schema({
  name: { type: LocalizedStringSchema, required: true },
  description: { type: LocalizedStringSchema, required: true },
  personalityPrompt: { type: LocalizedStringSchema, required: true },
  adminPrompt: { type: LocalizedStringSchema, required: true },
  defaultMessage: { type: LocalizedStringSchema, required: true },
  limitMessage: { type: LocalizedStringSchema, required: true },
  imageCharacterSelect: { type: String },
  imageDashboard: { type: String },
  imageChatBackground: { type: String },
  imageChatAvatar: { type: String },
  aiModel: { type: String, enum: ['gpt-3.5-turbo', 'gpt-4o-mini', 'o4-mini'], default: 'o4-mini' },
  characterAccessType: { type: String, enum: ['free', 'purchaseOnly'], default: 'free' },
  personalityPreset: { type: String },
  personalityTags: [String],
  gender: { type: String, enum: ['male', 'female', 'neutral'] },
  age: { type: String },
  occupation: { type: String },
  voice: { type: String },
  themeColor: { type: String, default: '#8B5CF6' },
  isActive: { type: Boolean, default: true },
  requiresUnlock: { type: Boolean, default: false },
  purchasePrice: { type: Number, min: 0 },
  stripeProductId: { type: String },
  purchaseType: { type: String, enum: ['buy'] },
  affinitySettings: {
    maxLevel: { type: Number, default: 100 },
    experienceMultiplier: { type: Number, default: 1.0 },
    decayRate: { type: Number, default: 0.1 },
    decayThreshold: { type: Number, default: 7 }
  },
  totalUsers: { type: Number, default: 0 },
  totalMessages: { type: Number, default: 0 },
  averageAffinityLevel: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  galleryImages: [{
    url: String,
    unlockLevel: Number,
    title: LocalizedStringSchema,
    description: LocalizedStringSchema,
    rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' },
    tags: [String],
    isDefault: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  versionKey: false
});

const Character = mongoose.model('Character', CharacterSchema);

async function debugCharacterImages() {
  try {
    console.log('🔌 MongoDB接続中...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB接続成功');

    // 最新のキャラクターレコードを取得（updatedAt順）
    console.log('\n📊 最新のキャラクターレコードを取得中...');
    const latestCharacters = await Character.find({})
      .sort({ updatedAt: -1 })
      .limit(5);

    if (latestCharacters.length === 0) {
      console.log('❌ キャラクターレコードが見つかりません');
      return;
    }

    console.log(`\n📝 最新の${latestCharacters.length}件のキャラクターレコード:`);
    console.log('=' + '='.repeat(80));

    latestCharacters.forEach((character, index) => {
      console.log(`\n${index + 1}. キャラクター: ${character.name?.ja || character.name?.en || 'Unknown'}`);
      console.log(`   ID: ${character._id}`);
      console.log(`   更新日時: ${character.updatedAt}`);
      console.log(`   作成日時: ${character.createdAt}`);
      console.log(`   英語名: ${character.name?.en || 'N/A'}`);
      console.log('\n   📸 画像フィールドの状態:');
      
      const imageFields = [
        'imageCharacterSelect',
        'imageDashboard', 
        'imageChatBackground',
        'imageChatAvatar'
      ];

      imageFields.forEach(field => {
        const value = character[field];
        let status = '';
        
        if (value === null) {
          status = '❌ null';
        } else if (value === undefined) {
          status = '❓ undefined';
        } else if (value === '') {
          status = '⚪ 空文字';
        } else {
          status = `✅ 設定済み: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`;
        }
        
        console.log(`   - ${field}: ${status}`);
      });
      
      console.log('\n   🗂️ その他の主要フィールド:');
      console.log(`   - characterAccessType: ${character.characterAccessType}`);
      console.log(`   - isActive: ${character.isActive}`);
      console.log(`   - purchasePrice: ${character.purchasePrice}`);
      console.log(`   - aiModel: ${character.aiModel}`);
      console.log(`   - personalityPreset: ${character.personalityPreset}`);
      
      // 生データの一部を表示
      console.log('\n   🗃️ 生データサンプル:');
      console.log(`   - name: ${JSON.stringify(character.name, null, 2)}`);
      console.log(`   - description: ${JSON.stringify(character.description?.ja?.substring(0, 50) + (character.description?.ja?.length > 50 ? '...' : ''), null, 2)}`);
    });

    // 画像フィールドの統計を取得
    console.log('\n\n📈 全キャラクターの画像フィールド統計:');
    console.log('=' + '='.repeat(50));
    
    const allCharacters = await Character.find({});
    const stats = {
      total: allCharacters.length,
      imageCharacterSelect: { null: 0, undefined: 0, empty: 0, set: 0 },
      imageDashboard: { null: 0, undefined: 0, empty: 0, set: 0 },
      imageChatBackground: { null: 0, undefined: 0, empty: 0, set: 0 },
      imageChatAvatar: { null: 0, undefined: 0, empty: 0, set: 0 }
    };

    allCharacters.forEach(character => {
      ['imageCharacterSelect', 'imageDashboard', 'imageChatBackground', 'imageChatAvatar'].forEach(field => {
        const value = character[field];
        if (value === null) {
          stats[field].null++;
        } else if (value === undefined) {
          stats[field].undefined++;
        } else if (value === '') {
          stats[field].empty++;
        } else {
          stats[field].set++;
        }
      });
    });

    Object.keys(stats).forEach(field => {
      if (field === 'total') return;
      console.log(`\n${field}:`);
      console.log(`  - null: ${stats[field].null}件`);
      console.log(`  - undefined: ${stats[field].undefined}件`);
      console.log(`  - 空文字: ${stats[field].empty}件`);
      console.log(`  - 設定済み: ${stats[field].set}件`);
    });

    console.log(`\n📊 総キャラクター数: ${stats.total}件`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB接続を終了しました');
  }
}

// スクリプト実行
debugCharacterImages();