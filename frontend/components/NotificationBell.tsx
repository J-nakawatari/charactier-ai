'use client';

import { Bell } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'ja';

  const handleClick = () => {
    // ダッシュボードに遷移
    router.push(`/${locale}/dashboard`);
  };

  return (
    <button
      onClick={handleClick}
      className={`relative p-2 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
      aria-label="通知"
    >
      <Bell className="w-5 h-5 text-gray-600" />
    </button>
  );
}