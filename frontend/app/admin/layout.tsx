'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/admin/Sidebar';

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
    const adminToken = localStorage.getItem('adminAccessToken');
    const adminUser = localStorage.getItem('adminUser');
    
    if (!adminToken || !adminUser) {
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
    } catch (error) {
      console.error('Admin auth error:', error);
      router.push('/admin/login');
      return;
    }
    
    setIsLoading(false);
  }, [pathname, router, isLoginPage]);

  if (isLoginPage) {
    // ログインページではサイドバーなし
    return (
      <main className="min-h-screen bg-white">
        {children}
      </main>
    );
  }

  if (isLoading) {
    // 認証チェック中
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // 認証されていない場合は何も表示しない（リダイレクト中）
    return null;
  }

  // 認証済みの場合、サイドバーありレイアウト
  return (
    <>
      <Sidebar />
      <main className="lg:ml-64 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {children}
      </main>
    </>
  );
}