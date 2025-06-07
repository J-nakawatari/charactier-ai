'use client';

import { Shield, AlertTriangle, Clock } from 'lucide-react';
import { SecurityEvent } from '@/mock/adminData';

interface SecurityAlertsProps {
  events: SecurityEvent[];
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'text-red-600 bg-red-100 border-red-200';
    case 'high':
      return 'text-orange-600 bg-orange-100 border-orange-200';
    case 'medium':
      return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    default:
      return 'text-blue-600 bg-blue-100 border-blue-200';
  }
};

const getSeverityText = (severity: string) => {
  switch (severity) {
    case 'critical':
      return '緊急';
    case 'high':
      return '高';
    case 'medium':
      return '中';
    default:
      return '低';
  }
};

export default function SecurityAlerts({ events }: SecurityAlertsProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">セキュリティイベント</h3>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>リアルタイム</span>
        </div>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-start space-x-3 p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow"
          >
            <div className="flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(event.severity)}`}>
                    {getSeverityText(event.severity)}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {event.type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-900 mb-2">
                {event.description}
              </p>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-mono">{event.ipAddress}</span>
                <span>
                  {new Date(event.timestamp).toLocaleString('ja-JP', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <button className="w-full text-sm text-gray-600 hover:text-gray-700 py-2">
          セキュリティログを表示
        </button>
      </div>
    </div>
  );
}