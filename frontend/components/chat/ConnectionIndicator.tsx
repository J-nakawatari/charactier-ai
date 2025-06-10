'use client';

import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface ConnectionIndicatorProps {
  isConnected: boolean;
  connectionQuality: 'good' | 'poor' | 'offline';
  lastPing?: number | null;
}

export function ConnectionIndicator({ 
  isConnected, 
  connectionQuality, 
  lastPing 
}: ConnectionIndicatorProps) {
  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'good':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'poor':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'offline':
        return <WifiOff className="w-4 h-4 text-red-500" />;
    }
  };

  const getConnectionText = () => {
    if (!isConnected) return 'オフライン';
    
    switch (connectionQuality) {
      case 'good':
        return lastPing ? `${lastPing}ms` : '接続良好';
      case 'poor':
        return lastPing ? `遅延 ${lastPing}ms` : '接続不良';
      case 'offline':
        return 'オフライン';
    }
  };

  const getStatusColor = () => {
    switch (connectionQuality) {
      case 'good':
        return 'text-green-600 bg-green-50';
      case 'poor':
        return 'text-yellow-600 bg-yellow-50';
      case 'offline':
        return 'text-red-600 bg-red-50';
    }
  };

  // 接続が良好な場合は表示しない
  if (isConnected && connectionQuality === 'good' && lastPing && lastPing < 500) {
    return null;
  }

  return (
    <div className={`
      flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium
      ${getStatusColor()}
      transition-all duration-300
    `}>
      {getConnectionIcon()}
      <span className="hidden sm:inline">{getConnectionText()}</span>
    </div>
  );
}