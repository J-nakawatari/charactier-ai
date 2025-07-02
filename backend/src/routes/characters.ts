import type { AuthRequest } from '../middleware/auth';
import { Router, Response, NextFunction, Request } from 'express';
import { CharacterModel } from '../models/CharacterModel';
import { UserModel } from '../models/UserModel';
import { AdminModel } from '../models/AdminModel';
import { authenticateToken, hasWritePermission } from '../middleware/auth';
import { uploadImage, optimizeImage } from '../utils/fileUpload';
import { validate, validateObjectId } from '../middleware/validation';
import { characterSchemas } from '../validation/schemas';
import { sendErrorResponse, ClientErrorCode, mapErrorToClientCode } from '../utils/errorResponse';
import log from '../utils/logger';
import { createRateLimiter } from '../middleware/rateLimiter';
import { escapeRegex } from '../utils/escapeRegex';

const router: Router = Router();

// レートリミッターを作成
const generalRateLimit = createRateLimiter('general');
const adminRateLimit = createRateLimiter('admin');

// キャラクター作成（管理者のみ）
router.post('/', 
  adminRateLimit,
  authenticateToken,
  validate({ body: characterSchemas.create }),
  async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if user has write permission (only super_admin can create characters)
    if (!hasWritePermission(req)) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Moderator cannot create characters');
      return;
    }

    log.info('Character creation request received', {
      userId: req.user?._id,
      characterName: req.body.name
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

    // Ensure English translations have values (use Japanese as fallback)
    const normalizedName = {
      ja: name?.ja || '',
      en: name?.en || name?.ja || ''
    };

    const normalizedDescription = {
      ja: description?.ja || '',
      en: description?.en || description?.ja || ''
    };

    const normalizedDefaultMessage = {
      ja: defaultMessage?.ja || 'こんにちは！よろしくお願いします。',
      en: defaultMessage?.en || defaultMessage?.ja || 'Hello! Nice to meet you!'
    };

    const normalizedPersonalityPrompt = personalityPrompt || {
      ja: personalityPreset ? `${personalityPreset}な性格のキャラクターです。` : 'フレンドリーで親しみやすいキャラクターです。',
      en: personalityPreset ? `A character with ${personalityPreset} personality.` : 'A friendly and approachable character.'
    };

    const normalizedAffinitySettings = affinitySettings || {
      maxLevel: 100,
      experienceMultiplier: 1.0,
      decayRate: 0.1,
      decayThreshold: 7,
      levelUpBonuses: []
    };

    // 新しいキャラクターを作成
    const character = new CharacterModel({
      name: normalizedName,
      description: normalizedDescription,
      characterAccessType,
      aiModel,
      gender,
      personalityPreset,
      personalityTags,
      personalityPrompt: normalizedPersonalityPrompt,
      themeColor,
      imageCharacterSelect,
      imageDashboard,
      imageChatAvatar,
      defaultMessage: normalizedDefaultMessage,
      affinitySettings: normalizedAffinitySettings,
      stripeProductId,
      purchasePrice,
      isActive: true
    });

    const savedCharacter = await character.save();
    log.info('Character created successfully', { characterId: savedCharacter._id });

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
router.get('/', generalRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const locale = (req.query.locale as string) || 'ja';
    const characterType = (req.query.characterType as string) || 'all';
    const sort = (req.query.sort as string) || 'custom';
    const keyword = (req.query.keyword as string) || '';
    
    log.debug('Characters API called', { locale, characterType, sort, hasKeyword: !!keyword });

    // ユーザーの購入履歴を取得
    let userPurchasedCharacters: string[] = [];
    if (req.user && req.user._id) {
      const user = await UserModel.findById(req.user._id);
      if (user && user.purchasedCharacters) {
        userPurchasedCharacters = user.purchasedCharacters.map(charId => charId.toString());
      }
      log.debug('User purchased characters loaded', { userId: req.user._id, count: userPurchasedCharacters.length });
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
      const searchTerm = escapeRegex(keyword.toLowerCase());
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
      case 'custom':
        sortQuery = { sortOrder: 1, createdAt: -1 };
        break;
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
        sortQuery = { sortOrder: 1, createdAt: -1 };
    }
    
    log.debug('Character filter applied', { characterType, userPurchasedCount: userPurchasedCharacters.length });

    const characters = await CharacterModel.find(query)
      .select('-__v')
      .sort(sortQuery);
    
    log.debug('Characters fetched', { count: characters.length });
    
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
router.get('/:id/affinity-images', generalRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    log.debug('Affinity images request', {
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
      log.debug('Looking up user affinity', { userId: req.user._id });
      const user = await UserModel.findById(req.user._id);
      log.debug('User lookup result', { found: !!user, affinityCount: user?.affinities?.length || 0 });
      
      if (user && user.affinities) {
        log.debug('User affinities structure', { count: user.affinities.length });
        
        const characterAffinity = user.affinities.find(
          (aff: any) => (aff.characterId && aff.characterId.toString() === req.params.id) ||
                        (aff.character && aff.character.toString() === req.params.id)
        );
        if (characterAffinity) {
          userAffinityLevel = characterAffinity.level || 0;
          log.debug('Character affinity found', { level: userAffinityLevel });
        } else {
          log.debug('No affinity found for character');
        }
      }
    }

    // ギャラリー画像を取得（unlockLevelでソート）
    const galleryImages = character.galleryImages || [];
    log.debug('Character gallery images', { count: galleryImages.length });
    
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

    log.debug('Character images fetched', { characterName: character.name.ja, userLevel: userAffinityLevel, totalImages: sortedImages.length });

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

// 翻訳データ取得（管理者ルートに移動しました）
/* router.get('/:id/translations', generalRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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
}); */

// 翻訳データ保存（管理者ルートに移動しました）
/* router.put('/:id/translations', adminRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // authenticateTokenミドルウェアで既に認証済み
    if (!req.admin) {
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED, 'Admin authentication required');
      return;
    }

    // 認証情報をログ
    log.debug('Character translation update - Auth', {
      adminId: req.admin._id,
      adminRole: req.admin.role
    });
    
    // Check if admin is super_admin
    if (req.admin.role !== 'super_admin') {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Only super admin can edit characters');
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
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    log.info('Character translations updated', { characterId: updatedCharacter?._id });
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
}); */

// 個別キャラクター取得
router.get('/:id', generalRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const character = await CharacterModel.findById(req.params.id);
    
    if (!character || !character.isActive) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Character not found or inactive');
      return;
    }
    
    log.debug('Character data fetched', {
      id: character._id,
      aiModel: character.aiModel,
      hasImages: !!character.imageCharacterSelect
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
  adminRateLimit,
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

    log.debug('Character update request', {
      id: req.params.id,
      updateFields: Object.keys(req.body)
    });

    // 安全な更新データの作成（許可されたフィールドのみ）
    const allowedFields = [
      'name', 'description', 'aiModel', 'characterAccessType', 'requiresUnlock',
      'purchasePrice', 'personalityPreset', 'personalityTags', 'gender', 'age',
      'occupation', 'personalityPrompt', 'adminPrompt', 'voice', 'themeColor',
      'imageCharacterSelect', 'imageDashboard', 'imageChatBackground', 'imageChatAvatar',
      'sampleVoiceUrl', 'galleryImages', 'stripeProductId', 'purchaseType',
      'defaultMessage', 'limitMessage', 'affinitySettings', 'levelRewards',
      'specialMessages', 'giftPreferences', 'isActive'
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const updatedCharacter = await CharacterModel.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!updatedCharacter) {
      log.error('Character not found for update', null, { characterId: req.params.id });
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Character not found');
      return;
    }
    
    log.info('Character updated successfully', { characterId: updatedCharacter._id });
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
router.delete('/:id', adminRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if user has write permission (only super_admin can delete characters)
    if (!hasWritePermission(req)) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Moderator cannot delete characters');
      return;
    }

    const updatedCharacter = await CharacterModel.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true, runValidators: true }
    );
    
    if (!updatedCharacter) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Character not found');
      return;
    }
    
    log.info('Character deactivated', { characterId: updatedCharacter._id });
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
router.post('/upload/image', adminRateLimit, authenticateToken, uploadImage.single('image'), optimizeImage(800, 800, 80), async (req: AuthRequest, res: Response): Promise<void> => {
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
    log.info('Image uploaded successfully', { path: imageUrl });
    
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