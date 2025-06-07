export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalCharacters: number;
  totalTokensUsed: number;
  apiErrors: number;
  securityEvents: number;
}

export interface CharacterData {
  id: string;
  name: string;
  personalityType: string;
  traits: string[];
  price: number;
  isFree: boolean;
  isActive: boolean;
  totalChats: number;
  avgIntimacy: number;
  createdAt: string;
}

export interface UserStats {
  month: string;
  activeUsers: number;
  newUsers: number;
  churnRate: number;
}

export interface TokenUsage {
  date: string;
  tokensUsed: number;
  revenue: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface SecurityEvent {
  id: string;
  type: 'rate_limit' | 'unauthorized' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ipAddress: string;
  timestamp: string;
}

export interface UserData {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  tokenBalance: number;
  totalSpent: number;
  registrationDate: string;
  lastLogin: string;
  chatCount: number;
  unlockedCharacters: string[];
  avgIntimacy: number;
  isTrialUser: boolean;
}

// Mock Data
export const mockDashboardStats: DashboardStats = {
  totalUsers: 12547,
  activeUsers: 8934,
  totalCharacters: 12,
  totalTokensUsed: 2847593,
  apiErrors: 23,
  securityEvents: 5
};

export const mockCharacters: CharacterData[] = [
  {
    id: "1",
    name: "美咲",
    personalityType: "優しい",
    traits: ["天然", "癒し系", "おっとり"],
    price: 980,
    isFree: true,
    isActive: true,
    totalChats: 15234,
    avgIntimacy: 45.6,
    createdAt: "2024-01-15"
  },
  {
    id: "2", 
    name: "リン",
    personalityType: "ツンデレ",
    traits: ["強気", "恥ずかしがり", "素直になれない"],
    price: 1480,
    isFree: false,
    isActive: true,
    totalChats: 9876,
    avgIntimacy: 38.2,
    createdAt: "2024-02-01"
  },
  {
    id: "3",
    name: "さくら",
    personalityType: "明るい",
    traits: ["元気", "ポジティブ", "好奇心旺盛"],
    price: 1280,
    isFree: false,
    isActive: false,
    totalChats: 5432,
    avgIntimacy: 52.1,
    createdAt: "2024-02-20"
  }
];

export const mockUserStats: UserStats[] = [
  { month: "Jan", activeUsers: 6500, newUsers: 1200, churnRate: 12.5 },
  { month: "Feb", activeUsers: 7200, newUsers: 1450, churnRate: 11.8 },
  { month: "Mar", activeUsers: 7800, newUsers: 1650, churnRate: 10.2 },
  { month: "Apr", activeUsers: 8100, newUsers: 1380, churnRate: 9.8 },
  { month: "May", activeUsers: 8650, newUsers: 1520, churnRate: 8.9 },
  { month: "Jun", activeUsers: 8934, newUsers: 1680, churnRate: 8.2 }
];

export const mockTokenUsage: TokenUsage[] = [
  { date: "2024-06-01", tokensUsed: 125000, revenue: 15600 },
  { date: "2024-06-02", tokensUsed: 134000, revenue: 16800 },
  { date: "2024-06-03", tokensUsed: 118000, revenue: 14750 },
  { date: "2024-06-04", tokensUsed: 142000, revenue: 17750 },
  { date: "2024-06-05", tokensUsed: 156000, revenue: 19500 },
  { date: "2024-06-06", tokensUsed: 163000, revenue: 20375 },
  { date: "2024-06-07", tokensUsed: 171000, revenue: 21375 }
];

export const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "warning",
    title: "APIエラー率上昇",
    message: "過去24時間でAPIエラー率が5%を超えています。",
    isRead: false,
    createdAt: "2024-06-07T10:30:00Z"
  },
  {
    id: "2", 
    type: "info",
    title: "新規ユーザー登録",
    message: "本日の新規ユーザー登録数が目標を達成しました。",
    isRead: true,
    createdAt: "2024-06-07T09:15:00Z"
  },
  {
    id: "3",
    type: "success",
    title: "トークン売上好調",
    message: "今月のトークン売上が前月比120%を達成しました。",
    isRead: false,
    createdAt: "2024-06-06T18:45:00Z"
  }
];

export const mockSecurityEvents: SecurityEvent[] = [
  {
    id: "1",
    type: "rate_limit",
    severity: "medium",
    description: "IP制限超過（100req/min）",
    ipAddress: "192.168.1.100",
    timestamp: "2024-06-07T11:23:00Z"
  },
  {
    id: "2",
    type: "unauthorized",
    severity: "high", 
    description: "不正なJWTトークン使用試行",
    ipAddress: "203.104.209.234",
    timestamp: "2024-06-07T10:45:00Z"
  },
  {
    id: "3",
    type: "suspicious_activity",
    severity: "critical",
    description: "短時間で大量のアカウント作成試行",
    ipAddress: "45.77.156.123",
    timestamp: "2024-06-07T09:12:00Z"
  }
];

export const mockUsers: UserData[] = [
  {
    id: "user_1",
    email: "tanaka@example.com",
    name: "田中太郎",
    status: "active",
    tokenBalance: 45200,
    totalSpent: 2980,
    registrationDate: "2024-01-15T09:30:00Z",
    lastLogin: "2024-06-07T14:22:00Z",
    chatCount: 156,
    unlockedCharacters: ["1", "2"],
    avgIntimacy: 67.3,
    isTrialUser: false
  },
  {
    id: "user_2", 
    email: "suzuki.hanako@gmail.com",
    name: "鈴木花子",
    status: "active",
    tokenBalance: 12800,
    totalSpent: 1480,
    registrationDate: "2024-02-03T16:45:00Z",
    lastLogin: "2024-06-07T10:15:00Z", 
    chatCount: 89,
    unlockedCharacters: ["1"],
    avgIntimacy: 42.1,
    isTrialUser: false
  },
  {
    id: "user_3",
    email: "yamada.jiro@example.com", 
    name: "山田次郎",
    status: "inactive",
    tokenBalance: 95000,
    totalSpent: 0,
    registrationDate: "2024-05-20T11:20:00Z",
    lastLogin: "2024-05-25T09:40:00Z",
    chatCount: 12,
    unlockedCharacters: ["1"],
    avgIntimacy: 18.5,
    isTrialUser: true
  },
  {
    id: "user_4",
    email: "watanabe.mai@example.com",
    name: "渡辺舞",
    status: "active", 
    tokenBalance: 78300,
    totalSpent: 4960,
    registrationDate: "2024-01-08T13:15:00Z",
    lastLogin: "2024-06-06T21:30:00Z",
    chatCount: 234,
    unlockedCharacters: ["1", "2", "3"],
    avgIntimacy: 81.2,
    isTrialUser: false
  },
  {
    id: "user_5",
    email: "sato.ken@example.com",
    name: "佐藤健",
    status: "suspended",
    tokenBalance: 2100,
    totalSpent: 980,
    registrationDate: "2024-03-12T08:45:00Z",
    lastLogin: "2024-06-01T15:20:00Z",
    chatCount: 67,
    unlockedCharacters: ["1"],
    avgIntimacy: 28.7,
    isTrialUser: false
  }
];