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