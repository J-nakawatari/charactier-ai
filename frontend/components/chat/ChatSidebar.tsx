'use client';

import { 
  MessageSquare, 
  Users, 
  Coins, 
  Menu,
  X,
  Home,
  Images
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { TokenPurchaseModal } from './TokenPurchaseModal';

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
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const t = useTranslations('sidebar');

  // ユーザーデータの取得
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // APIを再度有効化
        const response = await fetch('/api/v1/user/profile');
        if (response.ok) {
          const data = await response.json();
          console.log('ChatSidebar - User data from API:', data.user);
          setUser(data.user);
        } else {
          // エラー時はlocalStorageから取得
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const userData = JSON.parse(userStr);
            console.log('ChatSidebar - User data from localStorage:', userData);
            setUser(userData);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [pathname]); // パス変更時に再取得

  // selectedCharacterに基づく動的なチャットリンク
  const getChatHref = () => {
    // 現在のURLからキャラクターIDを取得（チャットページにいる場合）
    const pathParts = pathname.split('/');
    const chatIndex = pathParts.indexOf('chat');
    if (chatIndex > 0 && pathParts[chatIndex - 1] && pathParts[chatIndex - 2] === 'characters') {
      // 現在チャットページにいる場合は、そのキャラクターIDを使用
      const characterId = pathParts[chatIndex - 1];
      console.log('Chat link using current path:', characterId);
      return `/${currentLocale}/characters/${characterId}/chat`;
    }
    
    // selectedCharacterがある場合
    if (user?.selectedCharacter?._id) {
      console.log('Chat link using selectedCharacter:', user.selectedCharacter._id);
      return `/${currentLocale}/characters/${user.selectedCharacter._id}/chat`;
    }
    
    // localStorageから最後に選択したキャラクターIDを取得
    if (typeof window !== 'undefined') {
      const lastCharacterId = localStorage.getItem('lastSelectedCharacterId');
      if (lastCharacterId) {
        console.log('Chat link using localStorage:', lastCharacterId);
        return `/${currentLocale}/characters/${lastCharacterId}/chat`;
      }
    }
    
    // キャラクター未選択の場合は一覧へ
    console.log('Chat link: no character selected, redirecting to character list');
    return `/${currentLocale}/characters?from=chat`;
  };

  const chatHref = getChatHref();
  console.log('ChatSidebar - computed chatHref:', chatHref);
  
  const sidebarItems = [
    { id: 'home', href: `/${currentLocale}/dashboard`, icon: Home, label: t('home') },
    { id: 'characters', href: `/${currentLocale}/characters`, icon: Users, label: t('characters') },
    { id: 'chat', href: chatHref, icon: MessageSquare, label: t('chatHistory') },
    { id: 'library', href: `/${currentLocale}/library`, icon: Images, label: t('library') },
    { id: 'tokens', href: null, icon: Coins, label: t('tokens'), onClick: () => setShowPurchaseModal(true) },
  ];

  return (
    <>
      {/* ハンバーガーメニューボタン（モバイル用） */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 z-50 p-2 bg-white/80 backdrop-blur-sm text-gray-700 rounded-lg shadow-lg lg:hidden hover:bg-white transition-colors border border-gray-200/50"
        style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}
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
        fixed inset-0 z-50 w-64 bg-white border-r border-gray-100 
        flex flex-col shadow-sm transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* Safe area top padding */}
        <div className="h-[env(safe-area-inset-top,0px)]" />
        
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Image 
              src="/uploads/logo.png" 
              alt="Charactier" 
              width={32}
              height={32}
              className="rounded-lg object-cover"
            />
            <h1 className="text-xl font-semibold text-gray-900">Charactier</h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">{t('appDescription')}</p>
        </div>

        {/* ユーザー情報 */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-purple-600">
                {(user?.name || 'U').charAt(0).toUpperCase()}
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
        <nav className="flex-1 p-4 space-y-1 min-h-0 overflow-y-auto">
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