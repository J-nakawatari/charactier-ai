'use client';

import { 
  MessageSquare, 
  Users, 
  Coins, 
  Menu,
  X,
  Home
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface ChatSidebarProps {
  locale?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  tokenBalance: number;
  selectedCharacter?: {
    _id: string;
    name: string;
  } | null;
}

export default function ChatSidebar({ locale = 'ja' }: ChatSidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = locale || params?.locale || 'ja';
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations('sidebar');

  // ユーザーデータの取得
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        let token = localStorage.getItem('token');
        
        // localStorageにない場合はクッキーから取得を試みる
        if (!token && typeof document !== 'undefined') {
          const cookies = document.cookie.split(';');
          const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
          if (tokenCookie) {
            token = tokenCookie.split('=')[1];
          }
        }
        
        if (!token) {
          console.log('❌ No token found in localStorage or cookies');
          setLoading(false);
          return;
        }

        console.log('🔄 ChatSidebar: Fetching user data...');
        const response = await fetch('/api/auth/user', {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('✅ ChatSidebar: User data updated:', {
            name: userData.name,
            selectedCharacter: userData.selectedCharacter?.name || 'None'
          });
          setUser(userData);
        } else {
          console.error('Failed to fetch user data:', response.status);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [pathname]); // pathnameの変更を監視

  // selectedCharacterに基づく動的なチャットリンク
  const getChatHref = () => {
    if (user?.selectedCharacter?._id) {
      return `/${currentLocale}/characters/${user.selectedCharacter._id}/chat`;
    }
    // キャラクター未選択の場合は一覧へ（重複を避けるため特別な処理）
    return `/${currentLocale}/characters?from=chat`;
  };

  const sidebarItems = [
    { id: 'home', href: `/${currentLocale}`, icon: Home, label: t('home') },
    { id: 'characters', href: `/${currentLocale}/characters`, icon: Users, label: t('characters') },
    { id: 'chat', href: getChatHref(), icon: MessageSquare, label: t('chatHistory') },
    { id: 'tokens', href: `/${currentLocale}/tokens`, icon: Coins, label: t('tokens') },
  ];

  return (
    <>
      {/* ハンバーガーメニューボタン（モバイル用） */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-white/80 backdrop-blur-sm text-gray-700 rounded-lg shadow-lg lg:hidden hover:bg-white transition-colors border border-gray-200/50"
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
          {sidebarItems.map((item) => {
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
            
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-purple-50 border-l-4 border-purple-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                style={isActive ? { color: 'rgb(147, 51, 234)' } : {}}
              >
                <item.icon 
                  className="w-5 h-5" 
                  style={isActive ? { color: 'rgb(147, 51, 234)' } : { color: '#9CA3AF' }}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 簡素化されたフッター */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-400 text-center">
            AI Character Chat
          </div>
        </div>
      </div>
    </>
  );
}