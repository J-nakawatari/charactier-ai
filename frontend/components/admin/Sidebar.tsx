'use client';

import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Coins, 
  Bell, 
  Shield, 
  LogOut,
  Menu,
  X,
  UserCog,
  Cpu,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const sidebarItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'ダッシュボード' },
  { href: '/admin/users', icon: Users, label: 'ユーザー管理' },
  { href: '/admin/characters', icon: MessageSquare, label: 'キャラクター管理' },
  { href: '/admin/tokens', icon: Coins, label: 'トークチケット管理' },
  { href: '/admin/models', icon: Cpu, label: 'AIモデル管理' },
  { href: '/admin/admins', icon: UserCog, label: '管理者設定' },
  { href: '/admin/notifications', icon: Bell, label: '通知管理' },
  { href: '/admin/security', icon: Shield, label: 'セキュリティ' },
  { href: '/admin/errors', icon: AlertTriangle, label: 'エラー統計' },
  { href: '/admin/settings/analytics', icon: BarChart3, label: 'Google Analytics' },
];

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    // ローカルストレージから管理者情報を取得
    const adminUserData = localStorage.getItem('adminUser');
    if (adminUserData) {
      try {
        setAdminUser(JSON.parse(adminUserData));
      } catch (error) {
        console.error('Failed to parse admin user data:', error);
      }
    }
  }, []);

  const handleLogout = () => {
    // ローカルストレージから管理者認証情報をクリア
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    
    // ログインページにリダイレクト
    router.push('/admin/login');
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap = {
      'super_admin': 'スーパー管理者',
      'admin': '管理者',
      'moderator': 'モデレーター'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

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
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-100 
        flex flex-col shadow-sm transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}
      style={{ height: '100vh', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* ヘッダー */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Charactier</h1>
        </div>
        <p className="text-sm text-gray-400 mt-1">管理者ダッシュボード</p>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 p-4 space-y-1 min-h-0 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          一般
        </div>
        {sidebarItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
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
          ツール
        </div>
        {sidebarItems.slice(5).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
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
      <div className="p-4 border-t border-gray-200 space-y-3" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 20px))' }}>
        {/* 管理者情報 */}
        {adminUser && (
          <div className="px-3 py-2 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                {adminUser.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {adminUser.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {getRoleDisplayName(adminUser.role)}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* ログアウトボタン */}
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 w-full transition-colors"
        >
          <LogOut className="w-5 h-5 text-gray-400" />
          <span>ログアウト</span>
        </button>
      </div>
    </div>
    </>
  );
}