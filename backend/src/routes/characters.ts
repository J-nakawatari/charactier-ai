import { Router, Request, Response } from 'express';
import { CharacterModel } from '../models/CharacterModel';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// キャラクター作成（管理者のみ）
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📥 Received character creation request:', {
      headers: req.headers,
      body: req.body,
      user: req.user
    });
    
    const {
      name,
      description,
      characterAccessType = 'free',
      aiModel = 'gpt-4o-mini',
      gender,
      personalityPreset,
      personalityTags = [],
      personalityPrompt,
      adminPrompt,
      themeColor = '#8B5CF6',
      imageCharacterSelect,
      imageDashboard,
      imageChatAvatar,
      defaultMessage,
      limitMessage,
      affinitySettings,
      stripeProductId,
      purchasePrice
    } = req.body;

    // バリデーション
    if (!name || !name.ja || !name.en) {
      res.status(400).json({
        error: 'Name is required in both Japanese and English',
        message: '日本語と英語の名前が必要です'
      });
      return;
    }

    if (!description || !description.ja || !description.en) {
      res.status(400).json({
        error: 'Description is required in both Japanese and English',
        message: '日本語と英語の説明が必要です'
      });
      return;
    }

    // 新しいキャラクターを作成
    const character = new CharacterModel({
      name,
      description,
      characterAccessType,
      aiModel,
      gender,
      personalityPreset,
      personalityTags,
      personalityPrompt,
      adminPrompt,
      themeColor,
      imageCharacterSelect,
      imageDashboard,
      imageChatAvatar,
      defaultMessage,
      limitMessage,
      affinitySettings,
      stripeProductId,
      purchasePrice,
      isActive: true
    });

    const savedCharacter = await character.save();
    console.log('✅ Character created:', savedCharacter._id);

    res.status(201).json({
      message: 'キャラクターが作成されました',
      character: savedCharacter
    });

  } catch (error) {
    console.error('❌ Character creation error:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      // Mongooseのバリデーションエラーの詳細を解析
      const validationError = error as Error & { errors?: Record<string, { message: string }> };
      const fieldErrors: string[] = [];
      
      if (validationError.errors) {
        Object.keys(validationError.errors).forEach(field => {
          const fieldError = validationError.errors?.[field];
          if (fieldError) {
            fieldErrors.push(`${field}: ${fieldError.message}`);
          }
        });
      }
      
      res.status(400).json({
        error: 'Validation error',
        message: '入力データに問題があります',
        details: fieldErrors.length > 0 ? fieldErrors.join(', ') : error.message,
        fieldErrors: fieldErrors
      });
    } else {
      res.status(500).json({
        error: 'Character creation failed',
        message: 'キャラクターの作成に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// キャラクター一覧取得
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const locale = (req.query.locale as string) || 'ja';
    const characterType = (req.query.characterType as string) || 'all';
    const sort = (req.query.sort as string) || 'newest';
    const keyword = (req.query.keyword as string) || '';
    
    // Build query
    interface QueryFilter {
      isActive: boolean;
      characterAccessType?: string;
      $or?: Array<{
        'name.ja'?: { $regex: string; $options: string };
        'name.en'?: { $regex: string; $options: string };
        'description.ja'?: { $regex: string; $options: string };
        'description.en'?: { $regex: string; $options: string };
        personalityTags?: { $in: RegExp[] };
        personalityPreset?: { $regex: string; $options: string };
      }>;
    }
    const query: QueryFilter = { isActive: true };
    
    if (characterType === 'initial') {
      query.characterAccessType = 'initial';
    } else if (characterType === 'premium') {
      query.characterAccessType = 'premium';
    }
    
    if (keyword) {
      const searchTerm = keyword.toLowerCase();
      query.$or = [
        { 'name.ja': { $regex: searchTerm, $options: 'i' } },
        { 'name.en': { $regex: searchTerm, $options: 'i' } },
        { 'description.ja': { $regex: searchTerm, $options: 'i' } },
        { 'description.en': { $regex: searchTerm, $options: 'i' } },
        { personalityTags: { $in: [new RegExp(searchTerm, 'i')] } },
        { personalityPreset: { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    // Build sort
    let sortQuery: Record<string, 1 | -1> = {};
    switch (sort) {
      case 'popular':
        sortQuery = { totalConversations: -1 };
        break;
      case 'newest':
        sortQuery = { createdAt: -1 };
        break;
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
      case 'name':
        sortQuery = { [`name.${locale}`]: 1 };
        break;
      case 'affinity':
        sortQuery = { averageAffinity: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }
    
    const characters = await CharacterModel.find(query)
      .select('-__v')
      .sort(sortQuery);
    
    res.json({
      characters,
      total: characters.length,
      locale,
      filter: { characterType, keyword, sort }
    });

  } catch (error) {
    console.error('❌ Error fetching characters:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'キャラクター一覧の取得に失敗しました'
    });
  }
});

// 個別キャラクター取得
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const character = await CharacterModel.findById(req.params.id);
    
    if (!character || !character.isActive) {
      res.status(404).json({
        error: 'Character not found',
        message: 'キャラクターが見つかりません'
      });
      return;
    }
    
    res.json(character);

  } catch (error) {
    console.error('❌ Error fetching character:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'キャラクターの取得に失敗しました'
    });
  }
});

// キャラクター更新（管理者のみ）
router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const updatedCharacter = await CharacterModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedCharacter) {
      res.status(404).json({
        error: 'Character not found',
        message: 'キャラクターが見つかりません'
      });
      return;
    }
    
    console.log('✅ Character updated:', updatedCharacter._id);
    res.json({
      message: 'キャラクターが更新されました',
      character: updatedCharacter
    });

  } catch (error) {
    console.error('❌ Character update error:', error);
    res.status(500).json({
      error: 'Update failed',
      message: 'キャラクターの更新に失敗しました'
    });
  }
});

// キャラクター削除（論理削除）
router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const updatedCharacter = await CharacterModel.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!updatedCharacter) {
      res.status(404).json({
        error: 'Character not found',
        message: 'キャラクターが見つかりません'
      });
      return;
    }
    
    console.log('✅ Character deactivated:', updatedCharacter._id);
    res.json({
      message: 'キャラクターが無効化されました'
    });

  } catch (error) {
    console.error('❌ Character deletion error:', error);
    res.status(500).json({
      error: 'Deletion failed',
      message: 'キャラクターの削除に失敗しました'
    });
  }
});

export default router;