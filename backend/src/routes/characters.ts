import type { AuthRequest } from '../middleware/auth';
import { Router, Response, NextFunction } from 'express';
import { CharacterModel } from '../models/CharacterModel';
import { UserModel } from '../models/UserModel';
import { authenticateToken, hasWritePermission } from '../middleware/auth';
import { uploadImage, optimizeImage } from '../utils/fileUpload';
import { validate, validateObjectId } from '../middleware/validation';
import { characterSchemas } from '../validation/schemas';
import { sendErrorResponse, ClientErrorCode, mapErrorToClientCode } from '../utils/errorResponse';
import log from '../utils/logger';

const router: Router = Router();

// キャラクター画像アップロードエンドポイント（認証あり）
router.post('/upload/image', 
  authenticateToken,
  uploadImage.single('image'), 
  optimizeImage(800, 800, 80), 
  async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      sendErrorResponse(res, 400, ClientErrorCode.MISSING_REQUIRED_FIELD, 'No image file provided');
      return;
    }
    
    const imageUrl = `/uploads/images/${req.file.filename}`;
    
    res.json({
      success: true,
      message: '画像のアップロードが完了しました',
      imageUrl: imageUrl
    });
  } catch (error) {
    log.error('Character image upload error', error);
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});


// キャラクター作成（管理者のみ）
router.post('/', 
  authenticateToken, 
  validate({ body: characterSchemas.create }),
  async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if user has write permission (only super_admin can create characters)
    if (!hasWritePermission(req)) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Moderator cannot create characters');
      return;
    }

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
      themeColor = '#8B5CF6',
      imageCharacterSelect,
      imageDashboard,
      imageChatAvatar,
      defaultMessage,
      affinitySettings,
      stripeProductId,
      purchasePrice
    } = req.body;

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
      themeColor,
      imageCharacterSelect,
      imageDashboard,
      imageChatAvatar,
      defaultMessage,
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
    const errorCode = mapErrorToClientCode(error);
    const statusCode = errorCode === ClientErrorCode.INVALID_INPUT ? 400 : 500;
    log.error('Character creation error', error, {
      userId: req.user?._id,
      body: req.body
    });
    sendErrorResponse(res, statusCode, errorCode, error);
  }
});

// キャラクター一覧取得
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const locale = (req.query.locale as string) || 'ja';
    const characterType = (req.query.characterType as string) || 'all';
    const sort = (req.query.sort as string) || 'newest';
    const keyword = (req.query.keyword as string) || '';
    
    console.log('🚀 Characters API (TS) called with:', { locale, characterType, sort, keyword });

    // ユーザーの購入履歴を取得
    let userPurchasedCharacters: string[] = [];
    if (req.user && req.user._id) {
      const user = await UserModel.findById(req.user._id);
      if (user && user.purchasedCharacters) {
        userPurchasedCharacters = user.purchasedCharacters.map(charId => charId.toString());
      }
      console.log(`🛒 ユーザー ${req.user._id} の購入済みキャラ:`, userPurchasedCharacters);
    }
    
    // Build query
    interface QueryFilter {
      isActive: boolean;
      characterAccessType?: string;
      _id?: { $in?: string[]; $nin?: string[] };
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
    
    // キャラクタータイプフィルター
    if (characterType === 'free') {
      query.characterAccessType = 'free';
    } else if (characterType === 'purchased') {
      // 購入済みキャラのみ表示
      if (userPurchasedCharacters.length > 0) {
        query._id = { $in: userPurchasedCharacters };
      } else {
        // 購入済みキャラがない場合は空の結果を返す
        query._id = { $in: [] };
      }
    } else if (characterType === 'unpurchased') {
      // 未購入キャラのみ表示（プレミアムキャラで未購入のもの）
      query.characterAccessType = 'purchaseOnly';
      if (userPurchasedCharacters.length > 0) {
        query._id = { $nin: userPurchasedCharacters };
      }
    } else if (characterType === 'premium') {
      query.characterAccessType = 'purchaseOnly';
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
    
    console.log(`🔍 フィルター条件:`, { characterType, userPurchasedCount: userPurchasedCharacters.length });
    console.log(`🔍 適用フィルター:`, query);

    const characters = await CharacterModel.find(query)
      .select('-__v')
      .sort(sortQuery);
    
    console.log(`✅ ${characters.length}件のキャラクターを取得`);
    
    res.json({
      characters,
      total: characters.length,
      locale,
      filter: { characterType, keyword, sort }
    });

  } catch (error) {
    log.error('Error fetching characters', error, {
      userId: req.user?._id,
      query: req.query
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 親密度画像取得（/:idより前に定義する必要あり）
router.get('/:id/affinity-images', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('🖼️ Affinity images request:', {
      characterId: req.params.id,
      userId: req.user?._id
    });
    
    const character = await CharacterModel.findById(req.params.id);
    
    if (!character || !character.isActive) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Character not found or inactive');
      return;
    }

    // ユーザーの親密度レベルを取得
    let userAffinityLevel = 0;
    if (req.user && req.user._id) {
      console.log('🔍 Looking up user affinity for:', req.user._id);
      const user = await UserModel.findById(req.user._id);
      console.log('🔍 User found:', user ? 'Yes' : 'No');
      console.log('🔍 User affinities:', user?.affinities?.length || 0);
      
      if (user && user.affinities) {
        console.log('🔍 User affinities structure:', user.affinities.map((aff: any) => ({
          characterId: aff.characterId,
          character: aff.character,
          level: aff.level,
          hasCharacterId: !!aff.characterId,
          hasCharacter: !!aff.character
        })));
        
        const characterAffinity = user.affinities.find(
          (aff: any) => (aff.characterId && aff.characterId.toString() === req.params.id) ||
                        (aff.character && aff.character.toString() === req.params.id)
        );
        if (characterAffinity) {
          userAffinityLevel = characterAffinity.level || 0;
          console.log('🔍 Found character affinity level:', userAffinityLevel);
        } else {
          console.log('🔍 No affinity found for this character');
        }
      }
    }

    // ギャラリー画像を取得（unlockLevelでソート）
    const galleryImages = character.galleryImages || [];
    console.log('🔍 Character gallery images:', galleryImages.length);
    
    const sortedImages = galleryImages
      .map(img => ({
        url: img.url,
        unlockLevel: img.unlockLevel,
        title: img.title,
        description: img.description,
        rarity: img.rarity,
        tags: img.tags,
        isDefault: img.isDefault,
        order: img.order,
        createdAt: img.createdAt
      }))
      .sort((a, b) => a.unlockLevel - b.unlockLevel);

    console.log(`🖼️ キャラクター ${character.name.ja} の画像取得: ユーザーレベル ${userAffinityLevel}, 総画像数 ${sortedImages.length}`);

    // 画像が存在しない場合でも正常なレスポンスを返す
    res.json({
      images: sortedImages,
      userAffinityLevel,
      totalImages: sortedImages.length,
      unlockedCount: sortedImages.filter(img => img.unlockLevel <= userAffinityLevel).length,
      message: sortedImages.length === 0 ? 'このキャラクターにはまだ画像が設定されていません' : undefined
    });

  } catch (error) {
    log.error('Error fetching affinity images', error, {
      characterId: req.params.id,
      userId: req.user?._id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 翻訳データ取得（/:idより前に定義する必要あり）
router.get('/:id/translations', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const character = await CharacterModel.findById(req.params.id);
    
    if (!character || !character.isActive) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Character not found or inactive');
      return;
    }
    
    // 翻訳データを抽出
    const translationData = {
      name: character.name,
      description: character.description,
      personalityPreset: {
        ja: character.personalityPreset,
        en: character.personalityPreset // 現在は多言語対応していないため、同じ値を返す
      },
      personalityTags: {
        ja: character.personalityTags,
        en: character.personalityTags // 現在は多言語対応していないため、同じ値を返す
      },
      defaultMessage: character.defaultMessage
    };
    
    res.json(translationData);

  } catch (error) {
    log.error('Error fetching character translations', error, {
      characterId: req.params.id,
      userId: req.user?._id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 翻訳データ保存（/:idより前に定義する必要あり）
router.put('/:id/translations', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if user has write permission (only super_admin can update character translations)
    if (!hasWritePermission(req)) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Moderator cannot edit character translations');
      return;
    }

    const { name, description, personalityPreset, personalityTags, defaultMessage } = req.body;
    
    // バリデーション（オブジェクト構造のみチェック、空文字列は許可）
    if (!name || typeof name.ja !== 'string' || typeof name.en !== 'string') {
      sendErrorResponse(res, 400, ClientErrorCode.INVALID_INPUT, 'Invalid name structure');
      return;
    }
    
    if (!description || typeof description.ja !== 'string' || typeof description.en !== 'string') {
      sendErrorResponse(res, 400, ClientErrorCode.INVALID_INPUT, 'Invalid description structure');
      return;
    }
    
    // キャラクターの存在確認
    const character = await CharacterModel.findById(req.params.id);
    if (!character) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Character not found');
      return;
    }
    
    // 翻訳データを更新
    const updateData: Partial<{
      name: string;
      description: string;
      defaultMessage: string;
      personalityPreset: string;
      personalityTags: string[];
      voiceSettings: Record<string, unknown>;
      isActive: boolean;
    }> = {
      name,
      description,
      defaultMessage
    };
    
    // personalityPresetは現在多言語対応していないため、jaの値を使用
    if (personalityPreset && personalityPreset.ja) {
      updateData.personalityPreset = personalityPreset.ja;
    }
    
    // personalityTagsも現在多言語対応していないため、jaの値を使用
    if (personalityTags && personalityTags.ja) {
      updateData.personalityTags = personalityTags.ja;
    }
    
    const updatedCharacter = await CharacterModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    console.log('✅ Character translations updated:', updatedCharacter?._id);
    res.json({
      message: '翻訳データが更新されました',
      translations: {
        name: updatedCharacter?.name,
        description: updatedCharacter?.description,
        personalityPreset: {
          ja: updatedCharacter?.personalityPreset,
          en: updatedCharacter?.personalityPreset
        },
        personalityTags: {
          ja: updatedCharacter?.personalityTags,
          en: updatedCharacter?.personalityTags
        },
        defaultMessage: updatedCharacter?.defaultMessage
      }
    });

  } catch (error) {
    log.error('Character translation update error', error, {
      characterId: req.params.id,
      userId: req.user?._id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 個別キャラクター取得
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const character = await CharacterModel.findById(req.params.id);
    
    if (!character || !character.isActive) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Character not found or inactive');
      return;
    }
    
    console.log('🔍 Character data being returned:', {
      id: character._id,
      aiModel: character.aiModel,
      name: character.name?.ja,
      imageCharacterSelect: character.imageCharacterSelect,
      imageDashboard: character.imageDashboard,
      imageChatBackground: character.imageChatBackground,
      imageChatAvatar: character.imageChatAvatar
    });
    
    res.json(character);

  } catch (error) {
    log.error('Error fetching character', error, {
      characterId: req.params.id,
      userId: req.user?._id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// キャラクター更新（管理者のみ）
router.put('/:id', 
  authenticateToken, 
  validateObjectId('id'),
  validate({ body: characterSchemas.update }),
  async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if user has write permission (only super_admin can update characters)
    if (!hasWritePermission(req)) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Moderator cannot edit characters');
      return;
    }

    console.log('📝 Character update request:', {
      id: req.params.id,
      body: req.body
    });

    const updatedCharacter = await CharacterModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedCharacter) {
      log.error('Character not found for update', null, { characterId: req.params.id });
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Character not found');
      return;
    }
    
    console.log('✅ Character updated successfully:', updatedCharacter._id);
    res.json({
      message: 'キャラクターが更新されました',
      character: updatedCharacter
    });

  } catch (error) {
    log.error('Character update error', error, {
      characterId: req.params.id,
      userId: req.user?._id,
      body: req.body
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// キャラクター削除（論理削除）
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if user has write permission (only super_admin can delete characters)
    if (!hasWritePermission(req)) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Moderator cannot delete characters');
      return;
    }

    const updatedCharacter = await CharacterModel.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!updatedCharacter) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Character not found');
      return;
    }
    
    console.log('✅ Character deactivated:', updatedCharacter._id);
    res.json({
      message: 'キャラクターが無効化されました'
    });

  } catch (error) {
    log.error('Character deletion error', error, {
      characterId: req.params.id,
      userId: req.user?._id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 画像アップロードAPI（管理者のみ）
router.post('/upload/image', authenticateToken, uploadImage.single('image'), optimizeImage(800, 800, 80), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if user has write permission (only super_admin can upload images)
    if (!hasWritePermission(req)) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Moderator cannot upload images');
      return;
    }

    if (!req.file) {
      sendErrorResponse(res, 400, ClientErrorCode.MISSING_REQUIRED_FIELD, 'No image file provided');
      return;
    }
    
    // 管理者権限チェック
    const authReq = req as AuthRequest;
    if (!authReq.user?.isAdmin) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Admin access required');
      return;
    }
    
    const imageUrl = `/uploads/images/${req.file.filename}`;
    console.log('✅ Image uploaded successfully:', imageUrl);
    
    res.json({
      message: '画像アップロードが完了しました',
      imageUrl,
      filename: req.file.filename,
      size: req.file.size
    });
    
  } catch (error) {
    log.error('Image upload error', error, {
      userId: req.user?._id,
      fileName: req.file?.filename
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

export default router;