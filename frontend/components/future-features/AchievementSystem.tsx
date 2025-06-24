'use client';

import { useState, useEffect } from 'react';
import { 
  Trophy, 
  Star, 
  Award, 
  Target, 
  Calendar, 
  MessageCircle, 
  Heart, 
  Zap,
  Crown,
  Gift,
  Clock,
  TrendingUp,
  Lock,
  Check
} from 'lucide-react';

// 🏆 実績データ型定義
interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'conversation' | 'affinity' | 'loyalty' | 'efficiency' | 'social' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  icon: string;
  unlockedAt?: string;
  progress?: {
    current: number;
    target: number;
  };
  reward?: {
    type: 'tokens' | 'badge' | 'unlock' | 'title';
    amount?: number;
    description: string;
  };
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'limited';
  expiresAt: string;
  progress: {
    current: number;
    target: number;
  };
  reward: {
    type: 'tokens' | 'achievement';
    amount?: number;
    achievementId?: string;
  };
  completed: boolean;
}

interface AchievementSystemProps {
  userId: string;
  className?: string;
}

export default function AchievementSystem({ userId, className = '' }: AchievementSystemProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'achievements' | 'challenges' | 'leaderboard'>('achievements');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // 🔄 実績データ取得
  const fetchAchievements = async () => {
    try {
      setLoading(true);
      
      // TODO: 実際のAPIエンドポイント実装
      // const response = await fetch(`/api/v1/user/achievements`);
      // const data = await response.json();
      
      // モックデータ
      const mockAchievements: Achievement[] = [
        {
          id: 'first_chat',
          name: '初回会話',
          description: 'はじめてキャラクターと会話しました',
          category: 'conversation',
          rarity: 'common',
          icon: 'MessageCircle',
          unlockedAt: '2024-01-10T10:30:00Z',
          reward: { type: 'tokens', amount: 100, description: '100トークン獲得' }
        },
        {
          id: 'chat_master',
          name: '会話マスター',
          description: '100回の会話を達成',
          category: 'conversation',
          rarity: 'uncommon',
          icon: 'Trophy',
          unlockedAt: '2024-01-15T14:20:00Z',
          reward: { type: 'badge', description: '会話マスターバッジ獲得' }
        },
        {
          id: 'deep_bond',
          name: '深い絆',
          description: 'キャラクターとの親密度レベル20を達成',
          category: 'affinity',
          rarity: 'rare',
          icon: 'Heart',
          unlockedAt: '2024-01-12T16:45:00Z',
          reward: { type: 'unlock', description: '特別イラスト解放' }
        },
        {
          id: 'daily_devotee',
          name: '毎日の信者',
          description: '30日連続でログイン',
          category: 'loyalty',
          rarity: 'epic',
          icon: 'Calendar',
          progress: { current: 18, target: 30 },
          reward: { type: 'tokens', amount: 1000, description: '1000トークン獲得' }
        },
        {
          id: 'efficiency_expert',
          name: '効率の専門家',
          description: 'トークン効率90%以上を7日間維持',
          category: 'efficiency',
          rarity: 'rare',
          icon: 'Zap',
          progress: { current: 4, target: 7 },
          reward: { type: 'title', description: '「効率マスター」称号獲得' }
        },
        {
          id: 'legendary_bond',
          name: '伝説の絆',
          description: 'キャラクターとの親密度レベル50を達成',
          category: 'affinity',
          rarity: 'legendary',
          icon: 'Crown',
          progress: { current: 24, target: 50 },
          reward: { type: 'unlock', description: '限定エンディング解放' }
        }
      ];

      const mockChallenges: Challenge[] = [
        {
          id: 'daily_chat',
          name: '今日のチャット',
          description: '本日3回以上会話する',
          type: 'daily',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          progress: { current: 1, target: 3 },
          reward: { type: 'tokens', amount: 50 },
          completed: false
        },
        {
          id: 'weekly_explorer',
          name: '今週の探索者',
          description: '異なる3人のキャラクターと会話する',
          type: 'weekly',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          progress: { current: 2, target: 3 },
          reward: { type: 'tokens', amount: 200 },
          completed: false
        },
        {
          id: 'monthly_master',
          name: '今月のマスター',
          description: '月間会話数100回を達成',
          type: 'monthly',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          progress: { current: 67, target: 100 },
          reward: { type: 'achievement', achievementId: 'monthly_champion' },
          completed: false
        }
      ];

      setTimeout(() => {
        setAchievements(mockAchievements);
        setChallenges(mockChallenges);
        setLoading(false);
      }, 500);

    } catch (error) {
      console.error('Achievements fetch error:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, [userId]);

  // 🎨 レアリティ色設定
  const getRarityConfig = (rarity: string) => {
    const configs = {
      common: { 
        color: 'border-gray-200 bg-gray-50', 
        text: 'text-gray-700',
        badge: 'bg-gray-100 text-gray-800',
        glow: ''
      },
      uncommon: { 
        color: 'border-green-200 bg-green-50', 
        text: 'text-green-700',
        badge: 'bg-green-100 text-green-800',
        glow: 'shadow-green-100'
      },
      rare: { 
        color: 'border-blue-200 bg-blue-50', 
        text: 'text-blue-700',
        badge: 'bg-blue-100 text-blue-800',
        glow: 'shadow-blue-100'
      },
      epic: { 
        color: 'border-purple-200 bg-purple-50', 
        text: 'text-purple-700',
        badge: 'bg-purple-100 text-purple-800',
        glow: 'shadow-purple-100'
      },
      legendary: { 
        color: 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50', 
        text: 'text-yellow-700',
        badge: 'bg-yellow-100 text-yellow-800',
        glow: 'shadow-yellow-100 shadow-lg'
      }
    };
    return configs[rarity as keyof typeof configs] || configs.common;
  };

  // 🎯 アイコン取得
  const getAchievementIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      MessageCircle, Trophy, Heart, Calendar, Zap, Crown, Target, Star, Award, Gift, Clock, TrendingUp
    };
    const Icon = icons[iconName] || Trophy;
    return <Icon className="w-6 h-6" />;
  };

  // 📊 進捗バー
  const ProgressBar = ({ current, target, className = '' }: { current: number; target: number; className?: string }) => (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div 
        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${Math.min((current / target) * 100, 100)}%` }}
      />
    </div>
  );

  // 🏆 実績カード
  const AchievementCard = ({ achievement }: { achievement: Achievement }) => {
    const config = getRarityConfig(achievement.rarity);
    const isUnlocked = !!achievement.unlockedAt;
    const isInProgress = !!achievement.progress && !isUnlocked;

    return (
      <div className={`rounded-lg border-2 p-4 transition-all duration-300 hover:shadow-md ${config.color} ${config.glow} ${!isUnlocked ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-full ${isUnlocked ? 'bg-white' : 'bg-gray-200'}`}>
            {isUnlocked ? (
              <div className={config.text}>
                {getAchievementIcon(achievement.icon)}
              </div>
            ) : (
              <Lock className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div className="flex flex-col items-end space-y-1">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.badge}`}>
              {achievement.rarity}
            </span>
            {isUnlocked && (
              <Check className="w-4 h-4 text-green-500" />
            )}
          </div>
        </div>

        <h3 className={`font-semibold mb-1 ${config.text}`}>
          {achievement.name}
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          {achievement.description}
        </p>

        {isInProgress && achievement.progress && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>進捗</span>
              <span>{achievement.progress.current} / {achievement.progress.target}</span>
            </div>
            <ProgressBar current={achievement.progress.current} target={achievement.progress.target} />
          </div>
        )}

        {achievement.reward && (
          <div className="bg-white/50 rounded-lg p-2">
            <p className="text-xs text-gray-600">
              <Gift className="w-3 h-3 inline mr-1" />
              報酬: {achievement.reward.description}
            </p>
          </div>
        )}
      </div>
    );
  };

  // 🎯 チャレンジカード
  const ChallengeCard = ({ challenge }: { challenge: Challenge }) => {
    const timeLeft = new Date(challenge.expiresAt).getTime() - Date.now();
    const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
    const progressPercent = (challenge.progress.current / challenge.progress.target) * 100;

    return (
      <div className={`rounded-lg border p-4 ${challenge.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{challenge.name}</h3>
            <p className="text-sm text-gray-600">{challenge.description}</p>
          </div>
          <div className="text-right">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              challenge.type === 'daily' ? 'bg-blue-100 text-blue-800' :
              challenge.type === 'weekly' ? 'bg-purple-100 text-purple-800' :
              challenge.type === 'monthly' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {challenge.type === 'daily' ? '毎日' :
               challenge.type === 'weekly' ? '毎週' :
               challenge.type === 'monthly' ? '毎月' : '限定'}
            </span>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>進捗: {challenge.progress.current} / {challenge.progress.target}</span>
            <span className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {hoursLeft > 0 ? `${hoursLeft}時間後` : '期限切れ'}
            </span>
          </div>
          <ProgressBar current={challenge.progress.current} target={challenge.progress.target} />
        </div>

        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-600">
            <Gift className="w-3 h-3 inline mr-1" />
            報酬: {challenge.reward.type === 'tokens' ? `${challenge.reward.amount}トークン` : '特別実績'}
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filteredAchievements = filterCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === filterCategory);

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Trophy className="w-6 h-6 text-yellow-500 mr-2" />
          実績システム
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          あなたの成果とチャレンジをトラッキング
        </p>
      </div>

      {/* タブナビゲーション */}
      <div className="px-6 py-3 border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'achievements', label: '実績', icon: Award },
            { key: 'challenges', label: 'チャレンジ', icon: Target },
            { key: 'leaderboard', label: 'ランキング', icon: TrendingUp }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center space-x-2 pb-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === key
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* コンテンツ */}
      <div className="p-6">
        {activeTab === 'achievements' && (
          <div>
            {/* フィルター */}
            <div className="mb-6">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg "
              >
                <option value="all">すべて</option>
                <option value="conversation">会話</option>
                <option value="affinity">親密度</option>
                <option value="loyalty">忠誠度</option>
                <option value="efficiency">効率性</option>
                <option value="social">ソーシャル</option>
                <option value="special">特別</option>
              </select>
            </div>

            {/* 実績グリッド */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAchievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="space-y-4">
            {challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">ランキング機能は準備中です</p>
          </div>
        )}
      </div>
    </div>
  );
}