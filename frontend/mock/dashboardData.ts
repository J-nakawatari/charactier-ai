// ダッシュボードAPIモックデータ
// 実装計画書: user-dashboard-implementation-plan.md に基づく

interface LocalizedString {
  ja: string;
  en: string;
}

interface DashboardResponse {
  // ユーザー基本情報
  user: {
    _id: string;
    name: string;
    email: string;
    createdAt: Date;
    lastLoginAt: Date;
  };
  
  // トークン残高・統計
  tokens: {
    balance: number;
    totalPurchased: number;
    totalUsed: number;
    recentUsage: Array<{
      date: string;
      amount: number;
    }>;
  };
  
  // 親密度・キャラクター関係
  affinities: Array<{
    character: {
      _id: string;
      name: LocalizedString;
      imageCharacterSelect: string;
      themeColor: string; // グラフ表示用テーマカラー
    };
    level: number;
    experience: number;
    experienceToNext: number;
    maxExperience: number;
    unlockedImages: string[];
    nextUnlockLevel: number;
  }>;
  
  // 最近のチャット履歴（最新3件）
  recentChats: Array<{
    _id: string;
    character: {
      _id: string;
      name: LocalizedString;
      imageCharacterSelect: string;
    };
    lastMessage: string;
    lastMessageAt: Date;
    messageCount: number;
  }>;
  
  // 購入履歴サマリ
  purchaseHistory: Array<{
    type: 'token' | 'character';
    amount: number;
    date: Date;
    details: string;
  }>;
  
  // ログイン履歴（最新10件に制限）
  loginHistory: Array<{
    date: Date;
    platform: 'web' | 'mobile';
    ipAddress: string;
  }>;
  
  // お知らせ
  notifications: Array<{
    _id: string;
    title: LocalizedString;
    message: LocalizedString;
    type: 'info' | 'warning' | 'success';
    isRead: boolean;
    createdAt: Date;
  }>;
  
  // バッジ・実績
  badges: Array<{
    _id: string;
    name: LocalizedString;
    description: LocalizedString;
    iconUrl: string;
    isUnlocked: boolean;
    unlockedAt?: Date;
    progress?: number;
    maxProgress?: number;
  }>;
  
  // 統計データ（グラフ用）
  analytics: {
    chatCountPerDay: Array<{ date: string; count: number }>;
    tokenUsagePerDay: Array<{ date: string; amount: number }>;
    affinityProgress: Array<{ 
      characterName: string; 
      level: number; 
      color: string; // Character.themeColorから取得
    }>;
  };
}

// モックデータ生成
export const mockDashboardData: DashboardResponse = {
  user: {
    _id: "user_123456",
    name: "田中太郎",
    email: "tanaka@example.com",
    createdAt: new Date("2024-01-15T10:30:00Z"),
    lastLoginAt: new Date("2025-01-09T08:15:00Z")
  },

  tokens: {
    balance: 2500, // 20%以下の場合は警告色
    totalPurchased: 15000,
    totalUsed: 12500,
    recentUsage: [
      { date: "2025-01-09", amount: 450 },
      { date: "2025-01-08", amount: 320 },
      { date: "2025-01-07", amount: 180 },
      { date: "2025-01-06", amount: 290 },
      { date: "2025-01-05", amount: 410 },
      { date: "2025-01-04", amount: 220 },
      { date: "2025-01-03", amount: 380 }
    ]
  },

  affinities: [
    {
      character: {
        _id: "char_luna",
        name: { ja: "ルナ", en: "Luna" },
        imageCharacterSelect: "/characters/luna.png",
        themeColor: "#E91E63" // ピンク
      },
      level: 23,
      experience: 1250,
      experienceToNext: 150,
      maxExperience: 1400,
      unlockedImages: [
        "/characters/luna/unlock_10.png",
        "/characters/luna/unlock_20.png"
      ],
      nextUnlockLevel: 30
    },
    {
      character: {
        _id: "char_miko",
        name: { ja: "ミコ", en: "Miko" },
        imageCharacterSelect: "/characters/miko.png",
        themeColor: "#9C27B0" // パープル
      },
      level: 15,
      experience: 890,
      experienceToNext: 110,
      maxExperience: 1000,
      unlockedImages: [
        "/characters/miko/unlock_10.png"
      ],
      nextUnlockLevel: 20
    },
    {
      character: {
        _id: "char_zen",
        name: { ja: "ゼン", en: "Zen" },
        imageCharacterSelect: "/characters/zen.png",
        themeColor: "#2196F3" // ブルー
      },
      level: 8,
      experience: 420,
      experienceToNext: 80,
      maxExperience: 500,
      unlockedImages: [],
      nextUnlockLevel: 10
    }
  ],

  recentChats: [
    {
      _id: "chat_001",
      character: {
        _id: "char_luna",
        name: { ja: "ルナ", en: "Luna" },
        imageCharacterSelect: "/characters/luna.png"
      },
      lastMessage: "また今度お話ししましょうね♪",
      lastMessageAt: new Date("2025-01-09T14:30:00Z"),
      messageCount: 45
    },
    {
      _id: "chat_002", 
      character: {
        _id: "char_miko",
        name: { ja: "ミコ", en: "Miko" },
        imageCharacterSelect: "/characters/miko.png"
      },
      lastMessage: "今日も一日お疲れ様でした！",
      lastMessageAt: new Date("2025-01-08T19:45:00Z"),
      messageCount: 28
    },
    {
      _id: "chat_003",
      character: {
        _id: "char_zen",
        name: { ja: "ゼン", en: "Zen" },
        imageCharacterSelect: "/characters/zen.png"
      },
      lastMessage: "何か困ったことがあったら相談してくださいね",
      lastMessageAt: new Date("2025-01-07T16:20:00Z"),
      messageCount: 12
    }
  ],

  purchaseHistory: [
    {
      type: 'token',
      amount: 5000,
      date: new Date("2025-01-05T10:15:00Z"),
      details: "トークンパック: 5,000トークン"
    },
    {
      type: 'character',
      amount: 1200,
      date: new Date("2024-12-28T14:20:00Z"),
      details: "キャラクター購入: ルナ"
    },
    {
      type: 'token',
      amount: 10000,
      date: new Date("2024-12-15T09:30:00Z"),
      details: "トークンパック: 10,000トークン"
    },
    {
      type: 'character',
      amount: 1200,
      date: new Date("2024-12-10T16:45:00Z"),
      details: "キャラクター購入: ミコ"
    }
  ],

  loginHistory: [
    { date: new Date("2025-01-09T08:15:00Z"), platform: 'web', ipAddress: "192.168.1.100" },
    { date: new Date("2025-01-08T19:30:00Z"), platform: 'mobile', ipAddress: "192.168.1.101" },
    { date: new Date("2025-01-07T12:45:00Z"), platform: 'web', ipAddress: "192.168.1.100" },
    { date: new Date("2025-01-06T20:10:00Z"), platform: 'mobile', ipAddress: "192.168.1.101" },
    { date: new Date("2025-01-05T09:25:00Z"), platform: 'web', ipAddress: "192.168.1.100" },
    { date: new Date("2025-01-04T15:50:00Z"), platform: 'web', ipAddress: "192.168.1.100" },
    { date: new Date("2025-01-03T11:15:00Z"), platform: 'mobile', ipAddress: "192.168.1.101" },
    { date: new Date("2025-01-02T17:30:00Z"), platform: 'web', ipAddress: "192.168.1.100" },
    { date: new Date("2025-01-01T13:45:00Z"), platform: 'mobile', ipAddress: "192.168.1.101" },
    { date: new Date("2024-12-31T22:00:00Z"), platform: 'web', ipAddress: "192.168.1.100" }
  ],

  notifications: [
    {
      _id: "notif_001",
      title: { ja: "新年キャンペーン開始！", en: "New Year Campaign Started!" },
      message: { ja: "1月31日まで全トークンパック20%オフ！", en: "20% off all token packs until January 31st!" },
      type: 'info',
      isRead: false,
      createdAt: new Date("2025-01-01T00:00:00Z")
    },
    {
      _id: "notif_002",
      title: { ja: "親密度レベルアップ", en: "Affinity Level Up" },
      message: { ja: "ルナとの親密度がLv.23に上がりました！", en: "Your affinity with Luna reached Level 23!" },
      type: 'success',
      isRead: true,
      createdAt: new Date("2025-01-08T14:30:00Z")
    },
    {
      _id: "notif_003",
      title: { ja: "トークン残量警告", en: "Token Balance Warning" },
      message: { ja: "トークン残量が少なくなっています。補充をお忘れなく！", en: "Your token balance is running low. Don't forget to recharge!" },
      type: 'warning',
      isRead: false,
      createdAt: new Date("2025-01-09T10:00:00Z")
    }
  ],

  badges: [
    {
      _id: "badge_001",
      name: { ja: "初心者", en: "Beginner" },
      description: { ja: "初回ログインを達成", en: "Completed first login" },
      iconUrl: "/icon/badge_beginner.svg",
      isUnlocked: true,
      unlockedAt: new Date("2024-01-15T10:30:00Z"),
      progress: 1,
      maxProgress: 1
    },
    {
      _id: "badge_002",
      name: { ja: "チャットマスター", en: "Chat Master" },
      description: { ja: "100回のチャットを達成", en: "Completed 100 chats" },
      iconUrl: "/icon/badge_chat_master.svg",
      isUnlocked: false,
      progress: 73,
      maxProgress: 100
    },
    {
      _id: "badge_003",
      name: { ja: "親密度マスター", en: "Affinity Master" },
      description: { ja: "任意のキャラクターとの親密度をLv.30に到達", en: "Reach Level 30 affinity with any character" },
      iconUrl: "/icon/badge_affinity_master.svg",
      isUnlocked: false,
      progress: 23,
      maxProgress: 30
    },
    {
      _id: "badge_004",
      name: { ja: "コレクター", en: "Collector" },
      description: { ja: "5体のキャラクターを購入", en: "Purchase 5 characters" },
      iconUrl: "/icon/badge_collector.svg",
      isUnlocked: false,
      progress: 2,
      maxProgress: 5
    }
  ],

  analytics: {
    chatCountPerDay: [
      { date: "2025-01-03", count: 5 },
      { date: "2025-01-04", count: 3 },
      { date: "2025-01-05", count: 8 },
      { date: "2025-01-06", count: 4 },
      { date: "2025-01-07", count: 6 },
      { date: "2025-01-08", count: 7 },
      { date: "2025-01-09", count: 9 }
    ],
    tokenUsagePerDay: [
      { date: "2025-01-03", amount: 380 },
      { date: "2025-01-04", amount: 220 },
      { date: "2025-01-05", amount: 410 },
      { date: "2025-01-06", amount: 290 },
      { date: "2025-01-07", amount: 180 },
      { date: "2025-01-08", amount: 320 },
      { date: "2025-01-09", amount: 450 }
    ],
    affinityProgress: [
      { characterName: "ルナ", level: 23, color: "#E91E63" },
      { characterName: "ミコ", level: 15, color: "#9C27B0" },
      { characterName: "ゼン", level: 8, color: "#2196F3" }
    ]
  }
};

// トークン残量警告のケース（20%以下）
export const mockDashboardDataLowTokens: DashboardResponse = {
  ...mockDashboardData,
  tokens: {
    ...mockDashboardData.tokens,
    balance: 800, // 15000の20%以下 = 3000以下（警告色表示）
  }
};

// API モックレスポンス関数
export const getMockDashboardData = (lowTokens: boolean = false): DashboardResponse => {
  return lowTokens ? mockDashboardDataLowTokens : mockDashboardData;
};

// 通知既読API モック
export const mockReadNotification = (notificationId: string) => {
  return {
    success: true,
    notificationId,
    readAt: new Date()
  };
};

export const mockReadAllNotifications = (count: number) => {
  return {
    success: true,
    readCount: count,
    readAt: new Date()
  };
};