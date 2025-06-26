import type { AuthRequest } from '../middleware/auth';
import { Router, Response, NextFunction, Request } from 'express';
import { CharacterModel } from '../models/CharacterModel';
import { UserModel } from '../models/UserModel';
import { authenticateToken, hasWritePermission } from '../middleware/auth';
import { uploadImage, optimizeImage } from '../utils/fileUpload';
import { validate, validateObjectId } from '../middleware/validation';
import { characterSchemas } from '../validation/schemas';
import { sendErrorResponse, ClientErrorCode, mapErrorToClientCode } from '../utils/errorResponse';
import log from '../utils/logger';
import { createRateLimiter } from '../middleware/rateLimiter';
import { escapeRegex } from '../utils/escapeRegex';

const router: Router = Router();

// Rate limiters
const adminRateLimit = createRateLimiter('admin');
const uploadRateLimit = createRateLimiter('upload');

// 管理者用キャラクター一覧取得（統計情報付き）
router.get('/', adminRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    if (!req.admin) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Admin access required');
      return;
    }

    const locale = (req.query.locale as string) || 'ja';
    const includeInactive = req.query.includeInactive === 'true';
    const sort = (req.query.sort as string) || 'newest';
    const keyword = (req.query.keyword as string) || '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    log.info('🔍 Admin characters API called', {
      adminId: req.admin._id,
      locale,
      includeInactive,
      sort,
      keyword,
      page,
      limit
    });

    // クエリ構築
    interface QueryFilter {
      isActive?: boolean;
      $or?: Array<{
        'name.ja'?: { $regex: string; $options: string };
        'name.en'?: { $regex: string; $options: string };
        'description.ja'?: { $regex: string; $options: string };
        'description.en'?: { $regex: string; $options: string };
        personalityTags?: { $in: RegExp[] };
        personalityPreset?: { $regex: string; $options: string };
      }>;
    }
    const query: QueryFilter = {};
    
    // 非アクティブなキャラクターも含むかどうか
    if (!includeInactive) {
      query.isActive = true;
    }

    // キーワード検索
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

    // ソート条件
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
      case 'revenue':
        sortQuery = { totalRevenue: -1 };
        break;
      case 'active':
        sortQuery = { isActive: -1, createdAt: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }

    // 総数を取得
    const total = await CharacterModel.countDocuments(query);

    // キャラクターを取得
    const characters = await CharacterModel.find(query)
      .select('-__v')
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    // 各キャラクターの統計情報を追加で取得
    const charactersWithStats = await Promise.all(
      characters.map(async (character) => {
        // ユーザー数と親密度統計を取得
        const userStats = await UserModel.aggregate([
          {
            $match: {
              'affinities.character': character._id
            }
          },
          {
            $project: {
              affinity: {
                $filter: {
                  input: '$affinities',
                  as: 'affinity',
                  cond: { $eq: ['$$affinity.character', character._id] }
                }
              }
            }
          },
          {
            $unwind: '$affinity'
          },
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              averageLevel: { $avg: '$affinity.level' },
              maxLevel: { $max: '$affinity.level' }
            }
          }
        ]);

        const stats = userStats[0] || { totalUsers: 0, averageLevel: 0, maxLevel: 0 };

        // 購入統計を取得（有料キャラクターの場合）
        let purchaseStats = { totalPurchases: 0, totalRevenue: 0 };
        if (character.characterAccessType === 'purchaseOnly') {
          const purchasedUsers = await UserModel.countDocuments({
            purchasedCharacters: character._id
          });
          purchaseStats.totalPurchases = purchasedUsers;
          purchaseStats.totalRevenue = purchasedUsers * (character.purchasePrice || 0);
        }

        return {
          ...character.toObject(),
          stats: {
            ...stats,
            ...purchaseStats,
            lastActive: character.updatedAt
          }
        };
      })
    );

    log.info(`✅ Admin fetched ${characters.length} characters with stats`);

    res.json({
      characters: charactersWithStats,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      locale,
      filter: { includeInactive, keyword, sort }
    });

  } catch (error) {
    log.error('Error fetching admin characters', error, {
      adminId: req.admin?._id,
      query: req.query
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 個別キャラクター取得（詳細統計付き）
router.get('/:id', adminRateLimit, authenticateToken, validateObjectId('id'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    if (!req.admin) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Admin access required');
      return;
    }

    const character = await CharacterModel.findById(req.params.id);
    
    if (!character) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Character not found');
      return;
    }

    // 詳細統計を取得
    const [userStats, recentChats] = await Promise.all([
      // ユーザー統計
      UserModel.aggregate([
        {
          $match: {
            'affinities.character': character._id
          }
        },
        {
          $project: {
            affinity: {
              $filter: {
                input: '$affinities',
                as: 'affinity',
                cond: { $eq: ['$$affinity.character', character._id] }
              }
            },
            purchasedCharacters: 1
          }
        },
        {
          $unwind: '$affinity'
        },
        {
          $group: {
            _id: {
              level: {
                $switch: {
                  branches: [
                    { case: { $lte: ['$affinity.level', 10] }, then: '0-10' },
                    { case: { $lte: ['$affinity.level', 30] }, then: '11-30' },
                    { case: { $lte: ['$affinity.level', 50] }, then: '31-50' },
                    { case: { $lte: ['$affinity.level', 70] }, then: '51-70' },
                    { case: { $lte: ['$affinity.level', 90] }, then: '71-90' },
                    { case: { $lte: ['$affinity.level', 100] }, then: '91-100' }
                  ],
                  default: 'Unknown'
                }
              }
            },
            count: { $sum: 1 }
          }
        }
      ]),
      
      // 最近のチャット活動（簡易版）
      UserModel.find({
        'affinities.character': character._id,
        'affinities.lastInteraction': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }).countDocuments()
    ]);

    // レベル分布を整形
    const levelDistribution = {
      '0-10': 0,
      '11-30': 0,
      '31-50': 0,
      '51-70': 0,
      '71-90': 0,
      '91-100': 0
    };
    
    userStats.forEach((stat: any) => {
      if (stat._id.level && levelDistribution.hasOwnProperty(stat._id.level)) {
        levelDistribution[stat._id.level as keyof typeof levelDistribution] = stat.count;
      }
    });

    const totalUsers = Object.values(levelDistribution).reduce((sum, count) => sum + count, 0);

    res.json({
      character: character.toObject(),
      stats: {
        totalUsers,
        levelDistribution,
        activeUsersThisWeek: recentChats,
        isActive: character.isActive,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt
      }
    });

  } catch (error) {
    log.error('Error fetching admin character details', error, {
      characterId: req.params.id,
      adminId: req.admin?._id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// キャラクターのアクティブ/非アクティブ切り替え
router.patch('/:id/toggle-active', adminRateLimit, authenticateToken, validateObjectId('id'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 書き込み権限チェック（super_adminのみ）
    if (!hasWritePermission(req)) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Only super admin can toggle character status');
      return;
    }

    const character = await CharacterModel.findById(req.params.id);
    
    if (!character) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Character not found');
      return;
    }

    // アクティブ状態を切り替え
    character.isActive = !character.isActive;
    await character.save();

    log.info('Character status toggled', {
      characterId: character._id,
      isActive: character.isActive,
      adminId: req.admin?._id
    });

    res.json({
      message: character.isActive ? 'キャラクターを有効化しました' : 'キャラクターを無効化しました',
      character: {
        _id: character._id,
        name: character.name,
        isActive: character.isActive
      }
    });

  } catch (error) {
    log.error('Error toggling character status', error, {
      characterId: req.params.id,
      adminId: req.admin?._id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// キャラクター作成（管理者用）
router.post('/', adminRateLimit, authenticateToken, validate({ body: characterSchemas.create }), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 書き込み権限チェック（super_adminのみ）
    if (!hasWritePermission(req)) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Only super admin can create characters');
      return;
    }

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
    
    log.info('Character created by admin', {
      characterId: savedCharacter._id,
      adminId: req.admin?._id,
      name: savedCharacter.name
    });

    res.status(201).json({
      message: 'キャラクターが作成されました',
      character: savedCharacter
    });

  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    const statusCode = errorCode === ClientErrorCode.INVALID_INPUT ? 400 : 500;
    log.error('Admin character creation error', error, {
      adminId: req.admin?._id,
      body: req.body
    });
    sendErrorResponse(res, statusCode, errorCode, error);
  }
});

// キャラクター更新（管理者用）
router.put('/:id', adminRateLimit, authenticateToken, validateObjectId('id'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 書き込み権限チェック（super_adminのみ）
    if (!hasWritePermission(req)) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Only super admin can update characters');
      return;
    }

    const character = await CharacterModel.findById(req.params.id);
    
    if (!character) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'Character not found');
      return;
    }

    // 更新データを適用
    const updatedCharacter = await CharacterModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    log.info('Character updated by admin', {
      characterId: character._id,
      adminId: req.admin?._id,
      updates: Object.keys(req.body)
    });

    res.json({
      message: 'キャラクターが更新されました',
      character: updatedCharacter
    });

  } catch (error) {
    log.error('Admin character update error', error, {
      characterId: req.params.id,
      adminId: req.admin?._id
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 画像アップロード（管理者用）
router.post('/upload/image', uploadRateLimit, authenticateToken, uploadImage.single('image'), optimizeImage(800, 800, 80), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 書き込み権限チェック（super_adminのみ）
    if (!hasWritePermission(req)) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Only super admin can upload images');
      return;
    }

    if (!req.file) {
      sendErrorResponse(res, 400, ClientErrorCode.MISSING_REQUIRED_FIELD, 'No image file provided');
      return;
    }
    
    const imageUrl = `/uploads/images/${req.file.filename}`;
    log.info('Image uploaded by admin', {
      adminId: req.admin?._id,
      filename: req.file.filename,
      size: req.file.size
    });
    
    res.json({
      message: '画像アップロードが完了しました',
      imageUrl,
      filename: req.file.filename,
      size: req.file.size
    });
    
  } catch (error) {
    log.error('Admin image upload error', error, {
      adminId: req.admin?._id,
      fileName: req.file?.filename
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

export default router;