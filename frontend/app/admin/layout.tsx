'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/admin/Sidebar';
import TopBar from '@/components/admin/TopBar';
import CsrfTokenInitializer from '@/components/CsrfTokenInitializer';
import { initAdminTokenRefresh, stopAdminTokenRefresh } from '@/utils/adminTokenRefresh';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setIsLoading(false);
      return;
    }

    // 管理者認証チェック
    // HttpOnlyクッキーを使用するため、adminUserの存在のみチェック
    const adminUser = localStorage.getItem('adminUser');
    
    if (!adminUser) {
      router.push('/admin/login');
      return;
    }

    try {
      const user = JSON.parse(adminUser);
      if (!user.isAdmin) {
        router.push('/admin/login');
        return;
      }
      
      setIsAuthenticated(true);
      
      // 管理者トークン自動リフレッシュを初期化
      initAdminTokenRefresh();
    } catch (error) {
      console.error('Admin auth error:', error);
      router.push('/admin/login');
      return;
    }
    
    setIsLoading(false);
    
    // クリーンアップ: コンポーネントがアンマウントされたらリフレッシュを停止
    return () => {
      stopAdminTokenRefresh();
    };
  }, [pathname, router, isLoginPage]);

  if (isLoginPage) {
    // ログインページではサイドバーなし
    return (
      <main className="min-h-dvh bg-white">
        {children}
      </main>
    );
  }

  if (isLoading) {
    // 認証チェック中
    return (
      <div className="min-h-dvh bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // 認証されていない場合は何も表示しない（リダイレクト中）
    return null;
  }

  // 認証済みの場合、サイドバー + トップバーありレイアウト
  return (
    <>
      <Sidebar />
      <div className="lg:ml-64 min-h-dvh bg-gradient-to-br from-gray-50 to-gray-100">
        <TopBar />
        <main className="p-6">
          {children}
        </main>
      </div>
      {/* CSRFトークン初期化 */}
      <CsrfTokenInitializer />
    </>
  );
}