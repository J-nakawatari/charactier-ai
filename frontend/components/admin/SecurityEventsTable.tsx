'use client';

import { useToast } from '@/contexts/ToastContext';
import { Eye, Ban, CheckCircle, AlertTriangle, Shield, Lock, MessageSquare, Brain } from 'lucide-react';

// 🛡️ ViolationRecordベースのセキュリティイベント型定義
interface SecurityEvent {
  id: string;
  type: 'content_violation' | 'ai_moderation';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  userEmail?: string;
  detectedWord?: string;
  messageContent?: string;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

interface SecurityEventsTableProps {
  events: SecurityEvent[];
  onResolveViolation: (eventId: string, notes?: string) => void;
}

export default function SecurityEventsTable({ events, onResolveViolation }: SecurityEventsTableProps) {
  const { success, warning, error } = useToast();
  
  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      low: { label: '低', color: 'bg-green-100 text-green-800' },
      medium: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
      high: { label: '高', color: 'bg-red-100 text-red-800' }
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
      case 'content_violation':
        return <MessageSquare className="w-4 h-4 text-red-500" />;
      case 'ai_moderation':
        return <Brain className="w-4 h-4 text-orange-500" />;
      default:
        return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'content_violation':
        return '禁止用語検出';
      case 'ai_moderation':
        return 'AI モデレーション';
      default:
        return '不明';
    }
  };

  const handleResolve = (event: SecurityEvent) => {
    if (event.isResolved) return;
    
    const notes = prompt('解決理由を入力してください（任意）:');
    onResolveViolation(event.id, notes || undefined);
    success('違反を解決済みにしました');
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewEvent = (event: SecurityEvent) => {
    const details = [
      `違反ID: ${event.id}`,
      `種類: ${getTypeLabel(event.type)}`,
      `重要度: ${event.severity}`,
      `理由: ${event.message}`,
      event.detectedWord ? `検出語: ${event.detectedWord}` : '',
      event.messageContent ? `メッセージ: ${event.messageContent}` : '',
      `ユーザー: ${event.userEmail || 'N/A'}`,
      `IP: ${event.ipAddress || 'N/A'}`,
      `解決状況: ${event.isResolved ? '解決済み' : '未解決'}`
    ].filter(Boolean).join('\n');
    
    alert(details);
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
                  <div className="text-sm text-gray-900">
                    <div className="font-medium">{event.message}</div>
                    {event.detectedWord && (
                      <div className="text-xs text-red-600 mt-1">
                        検出語: {event.detectedWord}
                      </div>
                    )}
                    {event.userEmail && (
                      <div className="text-xs text-gray-500 mt-1">
                        ユーザー: {event.userEmail}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                    {event.ipAddress || 'N/A'}
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{formatDateTime(event.timestamp)}</div>
                  {event.isResolved && (
                    <div className="text-xs text-green-600 mt-1">解決済み</div>
                  )}
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
                    {!event.isResolved && (
                      <button 
                        onClick={() => handleResolve(event)}
                        className="text-gray-400 hover:text-green-600" 
                        title="解決済みにする"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {event.isResolved && (
                      <span className="text-green-600 text-xs">✓</span>
                    )}
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