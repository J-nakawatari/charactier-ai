'use client';

import { SecurityEvent } from '@/mock/adminData';
import { useToast } from '@/contexts/ToastContext';
import { Eye, Ban, CheckCircle, AlertTriangle, Shield, Lock } from 'lucide-react';

interface SecurityEventsTableProps {
  events: SecurityEvent[];
}

export default function SecurityEventsTable({ events }: SecurityEventsTableProps) {
  const { success, warning, error } = useToast();
  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      low: { label: '低', color: 'bg-green-100 text-green-800' },
      medium: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
      high: { label: '高', color: 'bg-orange-100 text-orange-800' },
      critical: { label: '緊急', color: 'bg-red-100 text-red-800' }
    };
    
    const config = severityConfig[severity as keyof typeof severityConfig];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'rate_limit':
        return <Shield className="w-4 h-4 text-yellow-500" />;
      case 'unauthorized':
        return <Lock className="w-4 h-4 text-red-500" />;
      case 'suspicious_activity':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'rate_limit':
        return 'レート制限';
      case 'unauthorized':
        return '不正アクセス';
      case 'suspicious_activity':
        return '不審な活動';
      default:
        return '不明';
    }
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewEvent = (event: SecurityEvent) => {
    success('イベント詳細', `セキュリティイベント ${event.id} の詳細を表示しました`);
  };

  const handleBlockIP = (event: SecurityEvent) => {
    error('IPブロック', `IPアドレス ${event.ipAddress} をブロックしました`);
  };

  const handleResolveEvent = (event: SecurityEvent) => {
    success('解決済み', `セキュリティイベント ${event.id} を解決済みにしました`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-4 md:px-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">セキュリティイベント</h3>
        <p className="text-sm text-gray-500 mt-1">システムへの脅威とセキュリティ違反の詳細</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-full" style={{ minWidth: '900px' }}>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                種類
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                緊急度
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                説明
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IPアドレス
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                発生時刻
              </th>
              <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getTypeIcon(event.type)}
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {getTypeLabel(event.type)}
                      </div>
                      <div className="text-sm text-gray-500">ID: {event.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  {getSeverityBadge(event.severity)}
                </td>
                <td className="px-3 md:px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate" title={event.description}>
                    {event.description}
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                    {event.ipAddress}
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDateTime(event.timestamp)}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => handleViewEvent(event)}
                      className="text-gray-400 hover:text-gray-600" 
                      title="詳細表示"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleBlockIP(event)}
                      className="text-gray-400 hover:text-red-600" 
                      title="IPブロック"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleResolveEvent(event)}
                      className="text-gray-400 hover:text-green-600" 
                      title="解決済みにする"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}