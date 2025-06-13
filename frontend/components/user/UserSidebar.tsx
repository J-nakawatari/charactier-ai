'use client';

import { 
  MessageSquare, 
  Users, 
  Heart, 
  Coins, 
  Settings, 
  LogOut,
  Menu,
  X,
  Home,
  ShoppingCart,
  History,
  Images
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { logout } from '../../utils/auth';
import { TokenPurchaseModal } from '../chat/TokenPurchaseModal';

interface UserSidebarProps {
  locale?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  tokenBalance: number;
  selectedCharacter?: string; // ObjectIdの文字列
  isSetupComplete?: boolean;
}

export default function UserSidebar({ locale = 'ja' }: UserSidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = locale || params?.locale || 'ja';
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const t = useTranslations('sidebar');

  // ユーザーデータの取得
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // 最新のユーザー情報をAPIから取得
        const token = localStorage.getItem('accessToken');
        if (token) {
          const response = await fetch('/api/user/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log('✅ API user data received:', userData);
            // APIレスポンスからユーザー情報を取得
            const user = userData.user || userData;
            setUser(user);
            setLoading(false);
            return;
          }
        }
        
        // APIから取得できない場合はlocalStorageのデータを使用
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          setUser(userData);
          setLoading(false);
          return;
        }
        
        console.log('❌ No user data found');
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [pathname]); // pathnameの変更を監視

  // ログアウト処理
  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      logout();
    }
  };

  // selectedCharacterに基づく動的なチャットリンク
  const getChatHref = () => {
    console.log('🔍 Chat href generation:', {
      user: user,
      selectedCharacter: user?.selectedCharacter,
      currentLocale: currentLocale
    });
    
    if (user?.selectedCharacter) {
      const chatUrl = `/${currentLocale}/characters/${user.selectedCharacter}/chat`;
      console.log('✅ Chat URL generated:', chatUrl);
      return chatUrl;
    }
    // キャラクター未選択の場合は一覧へ（重複を避けるため特別な処理）
    const fallbackUrl = `/${currentLocale}/characters?from=chat`;
    console.log('⚠️ No selected character, fallback URL:', fallbackUrl);
    return fallbackUrl;
  };

  const sidebarItems = [
    { id: 'home', href: `/${currentLocale}/dashboard`, icon: Home, label: t('home') },
    { id: 'characters', href: `/${currentLocale}/characters`, icon: Users, label: t('characters') },
    { id: 'chat', href: getChatHref(), icon: MessageSquare, label: t('chatHistory') },
    { id: 'library', href: `/${currentLocale}/library`, icon: Images, label: t('library') },
    { id: 'tokens', href: null, icon: Coins, label: t('tokens'), onClick: () => setShowPurchaseModal(true) },
    { id: 'purchase-history', href: `/${currentLocale}/purchase-history`, icon: ShoppingCart, label: t('purchaseHistory') },
    { id: 'settings', href: `/${currentLocale}/settings`, icon: Settings, label: t('settings') },
  ];

  return (
    <>
      {/* ハンバーガーメニューボタン（モバイル用） */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 p-3 bg-purple-600 text-white rounded-lg shadow-lg lg:hidden hover:bg-purple-700 transition-colors"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* オーバーレイ（モバイル用） */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* サイドバー */}
      <div className={`
        fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-100 
        flex flex-col shadow-sm overflow-y-auto transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Charactier</h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">{t('appDescription')}</p>
        </div>

        {/* ユーザー情報 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-purple-600">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {loading ? 'Loading...' : (user?.name || t('user'))}
              </p>
              <p className="text-xs text-gray-500">
                {loading ? '...' : t('tokenBalance', { count: user?.tokenBalance || 0 })}
              </p>
            </div>
          </div>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 p-4 space-y-1 min-h-0">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {t('menu')}
          </div>
          {sidebarItems.slice(0, 4).map((item) => {
            // チャット画面(/characters/[id]/chat)の場合、チャット履歴をアクティブにする
            const isChatPage = pathname.includes('/characters/') && pathname.includes('/chat');
            // キャラ一覧画面(/characters)の場合、キャラクター一覧をアクティブにする
            const isCharacterPage = pathname.includes('/characters') && !pathname.includes('/chat');
            
            // 動的なチャットリンクのアクティブ状態を判定
            let isActive = pathname === item.href;
            
            if (item.id === 'chat') {
              // チャット履歴の場合：現在のページがチャット画面ならアクティブ
              isActive = isChatPage;
            } else if (item.id === 'characters') {
              // キャラクター一覧の場合：キャラクター関連ページでアクティブ（チャット画面以外）
              isActive = isCharacterPage;
            }
            
            if (item.onClick) {
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setIsOpen(false);
                    item.onClick();
                  }}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left ${
                    isActive
                      ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-700' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            }
            
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-700' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-6">
            {t('account')}
          </div>
          {sidebarItems.slice(4).map((item) => {
            const isActive = pathname === item.href;
            
            if (item.onClick) {
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setIsOpen(false);
                    item.onClick();
                  }}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left ${
                    isActive
                      ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-700' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            }
            
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-700' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 w-full transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="w-5 h-5 text-gray-400 hover:text-red-600" />
            <span>{t('logout')}</span>
          </button>
        </div>
      </div>

      {/* トークン購入モーダル */}
      <TokenPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        currentTokens={user?.tokenBalance || 0}
        onPurchaseSuccess={(newTokens) => {
          setUser(prev => prev ? { ...prev, tokenBalance: newTokens } : null);
          setShowPurchaseModal(false);
        }}
      />
    </>
  );
}