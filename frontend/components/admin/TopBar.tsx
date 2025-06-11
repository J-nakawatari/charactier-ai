'use client';

import { useState, useEffect } from 'react';
import { Bell, User, ChevronDown, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export default function TopBar() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  useEffect(() => {
    // ドロップダウンが開いているときに外側クリックで閉じる
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isDropdownOpen]);

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
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 左側：タイトル */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Charactier AI 管理システム
          </h1>
        </div>

        {/* 右側：通知 + ユーザー情報 */}
        <div className="flex items-center space-x-4">
          {/* 通知ベル */}
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell className="w-5 h-5" />
            {/* 通知バッジ（例） */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* 管理者プロフィール */}
          {adminUser && (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {adminUser.name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {adminUser.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getRoleDisplayName(adminUser.role)}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {/* ドロップダウンメニュー */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{adminUser.name}</p>
                    <p className="text-xs text-gray-500">{adminUser.email}</p>
                  </div>
                  
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>プロフィール</span>
                  </button>
                  
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>ログアウト</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}