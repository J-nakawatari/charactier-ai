const express = require('express');
const router = express.Router();
const auth = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/middleware/auth');
const User = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/models/User');
const Character = require('../../data/ai-character-feature-simplify-terms-privacy-pages/backend/models/Character');

// POST /api/user/select-character - キャラ選択保存API
router.post('/select-character', auth, async (req, res) => {
  try {
    const { characterId } = req.body;

    // バリデーション
    if (!characterId) {
      return res.status(400).json({ 
        error: 'characterIdが必要です',
        code: 'MISSING_CHARACTER_ID'
      });
    }

    // ユーザーの存在確認
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        error: 'ユーザーが見つかりません',
        code: 'USER_NOT_FOUND'
      });
    }

    // キャラクターの存在確認とアクセス権限チェック
    const character = await Character.findById(characterId);
    if (!character || !character.isActive) {
      return res.status(404).json({ 
        error: 'キャラクターが見つかりません',
        code: 'CHARACTER_NOT_FOUND'
      });
    }

    // アクセス権限の詳細チェック
    let hasAccess = false;
    let accessReason = '';

    switch (character.characterAccessType) {
      case 'free':
        // 無料キャラクターは誰でもアクセス可能
        hasAccess = true;
        accessReason = 'free_character';
        break;
        
      case 'token-based':
        // トークン制キャラクターはトークン残高があれば利用可能
        hasAccess = user.tokenBalance > 0;
        accessReason = hasAccess ? 'token_available' : 'insufficient_tokens';
        break;
        
      case 'purchaseOnly':
        // 買い切りキャラクターは購入済みかチェック
        const hasPurchased = user.purchasedCharacters?.some(
          purchase => purchase.character.toString() === characterId
        );
        hasAccess = hasPurchased;
        accessReason = hasAccess ? 'purchased' : 'not_purchased';
        break;
        
      default:
        hasAccess = false;
        accessReason = 'unknown_access_type';
    }

    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'このキャラクターへのアクセス権限がありません',
        code: 'ACCESS_DENIED',
        reason: accessReason,
        characterAccessType: character.characterAccessType,
        requiresPurchase: character.characterAccessType === 'purchaseOnly',
        requiresTokens: character.characterAccessType === 'token-based'
      });
    }

    // 以前の選択キャラクター情報を保存（ログ用）
    const previousSelectedCharacter = user.selectedCharacter;

    // キャラクター選択を更新
    user.selectedCharacter = characterId;
    
    // 親密度エントリーが存在しない場合は作成
    const existingAffinity = user.affinities?.find(
      a => a.character.toString() === characterId
    );

    if (!existingAffinity) {
      if (!user.affinities) {
        user.affinities = [];
      }
      user.affinities.push({
        character: characterId,
        level: 0,
        experience: 0,
        lastInteractedAt: new Date(),
        lastVisitStreak: 0
      });
    } else {
      // 既存の親密度情報を更新
      existingAffinity.lastInteractedAt = new Date();
    }

    await user.save();

    // ログ出力
    console.log(`✅ キャラクター選択更新: ユーザー${user._id} -> キャラクター${characterId}`);
    if (previousSelectedCharacter) {
      console.log(`   前回選択: ${previousSelectedCharacter} -> 新規選択: ${characterId}`);
    } else {
      console.log(`   初回キャラクター選択: ${characterId}`);
    }

    // レスポンス構築
    const response = {
      success: true,
      selectedCharacter: {
        _id: character._id,
        name: character.name,
        characterAccessType: character.characterAccessType,
        accessReason
      },
      userState: {
        selectedCharacterId: characterId,
        tokenBalance: user.tokenBalance || 0,
        hasAccess: true
      },
      metadata: {
        previousSelection: previousSelectedCharacter,
        selectionTime: new Date(),
        isFirstSelection: !previousSelectedCharacter
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Character selection error:', error);
    res.status(500).json({ 
      error: 'キャラクター選択の保存中にエラーが発生しました',
      message: error.message,
      code: 'CHARACTER_SELECTION_ERROR'
    });
  }
});

module.exports = router;