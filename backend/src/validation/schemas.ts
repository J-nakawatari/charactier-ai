import Joi from 'joi';

// MongoDB ObjectId検証
export const objectId = Joi.string().hex().length(24).messages({
  'string.hex': 'Invalid ID format',
  'string.length': 'Invalid ID length'
});

// 共通フィールド
export const email = Joi.string().email().lowercase().trim().messages({
  'string.email': '有効なメールアドレスを入力してください'
});

export const password = Joi.string().min(6).messages({
  'string.min': 'パスワードは6文字以上で入力してください'
});

export const name = Joi.string().min(1).max(100).trim().messages({
  'string.min': '名前を入力してください',
  'string.max': '名前は100文字以内で入力してください'
});

// ローカライズされた文字列
export const localizedString = Joi.object({
  ja: Joi.string().required(),
  en: Joi.string().optional()
}).messages({
  'object.base': '日本語と英語の翻訳を含むオブジェクトである必要があります'
});

// ページネーション
export const pagination = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('createdAt', '-createdAt', 'name', '-name').default('-createdAt')
});

// 認証スキーマ
export const authSchemas = {
  register: Joi.object({
    name: name.required(),
    email: email.required(),
    password: password.required()
  }),

  login: Joi.object({
    email: email.required(),
    password: password.required()
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'string.empty': 'リフレッシュトークンが必要です'
    })
  }),

  forgotPassword: Joi.object({
    email: email.required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: password.required()
  }),

  verifyEmail: Joi.object({
    token: Joi.string().required()
  }),

  updateProfile: Joi.object({
    name: name.required()
  })
};

// キャラクター関連スキーマ
export const characterSchemas = {
  create: Joi.object({
    name: localizedString.required(),
    description: localizedString.required(),
    defaultMessage: localizedString.required(),
    characterAccessType: Joi.string().valid('free', 'purchaseOnly').required(),
    purchasePrice: Joi.when('characterAccessType', {
      is: 'purchaseOnly',
      then: Joi.number().min(0).required(),
      otherwise: Joi.number().optional()
    }),
    personalityPreset: Joi.string().optional(),
    personalityTags: Joi.array().items(Joi.string()).optional(),
    gender: Joi.string().valid('male', 'female', 'neutral').optional(),
    age: Joi.string().optional(), // Added age field
    occupation: Joi.string().optional(), // Added occupation field
    aiModel: Joi.string().valid('gpt-3.5-turbo', 'gpt-4o-mini').default('gpt-3.5-turbo'),
    imageCharacterSelect: Joi.string().uri().optional(),
    imageDashboard: Joi.string().uri().optional(),
    imageChatBackground: Joi.string().uri().optional(),
    imageChatAvatar: Joi.string().uri().optional(),
    sampleVoiceUrl: Joi.string().uri().optional(),
    themeColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().messages({
      'string.pattern.base': 'テーマカラーは#RRGGBBの形式で入力してください'
    }),
    displayOrder: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().default(true),
    stripeProductId: Joi.string().optional(),
    personalityPrompt: localizedString.required(),
    affinitySettings: Joi.object({
      maxLevel: Joi.number().min(1).max(100).default(100),
      experienceMultiplier: Joi.number().min(0.1).max(5.0).default(1.0),
      decayRate: Joi.number().min(0).max(1.0).default(0.1),
      decayThreshold: Joi.number().default(7),
      levelUpBonuses: Joi.array().items(Joi.object({
        level: Joi.number().min(1).max(100),
        bonusType: Joi.string().valid('image_unlock', 'special_message', 'feature_unlock', 'gift_bonus'),
        value: Joi.string()
      })).optional()
    }).required(),
    galleryImages: Joi.array().items(Joi.object({
      imageUrl: Joi.string().uri().required(),
      caption: localizedString.optional(),
      unlockLevel: Joi.number().integer().min(0).max(100).required()
    })).optional()
  }),

  update: Joi.object({
    name: localizedString.optional(),
    description: localizedString.optional(),
    defaultMessage: localizedString.optional(),
    characterAccessType: Joi.string().valid('free', 'purchaseOnly').optional(),
    purchasePrice: Joi.number().min(0).optional(),
    personalityPreset: Joi.string().optional(),
    personalityTags: Joi.array().items(Joi.string()).optional(),
    gender: Joi.string().valid('male', 'female', 'neutral').optional(),
    age: Joi.string().allow('').optional(), // Added age field
    occupation: Joi.string().allow('').optional(), // Added occupation field
    aiModel: Joi.string().valid('gpt-3.5-turbo', 'gpt-4o-mini').optional(),
    imageCharacterSelect: Joi.string().uri().allow('').optional(),
    imageDashboard: Joi.string().uri().allow('').optional(),
    imageChatBackground: Joi.string().uri().allow('').optional(),
    imageChatAvatar: Joi.string().uri().allow('').optional(),
    sampleVoiceUrl: Joi.string().uri().allow('').optional(),
    themeColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow('').optional(),
    displayOrder: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
    stripeProductId: Joi.string().allow('').optional(),
    personalityPrompt: localizedString.optional(),
    affinitySettings: Joi.object({
      maxLevel: Joi.number().min(1).max(100).optional(),
      experienceMultiplier: Joi.number().min(0.1).max(5.0).optional(),
      decayRate: Joi.number().min(0).max(1.0).optional(),
      decayThreshold: Joi.number().optional(),
      levelUpBonuses: Joi.array().items(Joi.object({
        level: Joi.number().min(1).max(100),
        bonusType: Joi.string().valid('image_unlock', 'special_message', 'feature_unlock', 'gift_bonus'),
        value: Joi.string()
      })).optional()
    }).optional(),
    galleryImages: Joi.array().items(Joi.object({
      url: Joi.string().uri().optional(), // Changed from imageUrl to url
      imageUrl: Joi.string().uri().optional(), // Support both url and imageUrl
      caption: localizedString.optional(),
      title: localizedString.optional(), // Added title support
      description: localizedString.optional(), // Added description support
      unlockLevel: Joi.number().integer().min(0).max(100).required(),
      rarity: Joi.string().valid('common', 'rare', 'epic', 'legendary').optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      isDefault: Joi.boolean().optional(),
      order: Joi.number().optional()
    })).optional()
  })
};

// チャットスキーマ
export const chatSchemas = {
  sendMessage: Joi.object({
    message: Joi.string().min(1).max(2000).trim().required().messages({
      'string.empty': 'メッセージが空です',
      'string.max': 'メッセージが長すぎます（2000文字以内）'
    }),
    sessionId: Joi.string().optional()
  }),

  getHistory: Joi.object({
    locale: Joi.string().valid('ja', 'en').default('ja')
  })
};

// 決済関連スキーマ
export const paymentSchemas = {
  createTokenPack: Joi.object({
    name: Joi.string().required(),
    tokens: Joi.number().integer().min(1).required(),
    price: Joi.number().min(0).required(),
    stripePriceId: Joi.string().required(),
    bonusTokens: Joi.number().integer().min(0).default(0),
    displayOrder: Joi.number().integer().min(0).default(0),
    isActive: Joi.boolean().default(true),
    profitMargin: Joi.number().min(0).max(100).default(99)
  }),

  purchaseTokenPack: Joi.object({
    tokenPackId: objectId.required(),
    quantity: Joi.number().integer().min(1).max(10).default(1)
  }),

  purchaseCharacter: Joi.object({
    characterId: objectId.required()
  })
};

// 管理者スキーマ
export const adminSchemas = {
  updateUserBalance: Joi.object({
    newBalance: Joi.number().integer().min(0).required().messages({
      'number.min': '有効なトークン残高を指定してください'
    })
  }),

  searchUsers: Joi.object({
    search: Joi.string().trim().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  updateModelSettings: Joi.object({
    model: Joi.string().valid('gpt-3.5-turbo', 'gpt-4o-mini').required(),
    enabled: Joi.boolean().required(),
    costPerInput: Joi.number().min(0).optional(),
    costPerOutput: Joi.number().min(0).optional()
  })
};

// ファイルアップロードスキーマ
export const uploadSchemas = {
  uploadImage: Joi.object({
    fieldname: Joi.string().valid(
      'imageCharacterSelect',
      'imageDashboard',
      'imageChatBackground',
      'imageChatAvatar',
      'galleryImage'
    ).required()
  })
};