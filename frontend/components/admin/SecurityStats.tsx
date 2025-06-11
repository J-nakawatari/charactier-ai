'use client';

import { Shield, AlertTriangle, Lock, Eye } from 'lucide-react';

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  ipAddress: string;
  timestamp: string;
}

interface SecurityStatsProps {
  events: SecurityEvent[];
}

export default function SecurityStats({ events }: SecurityStatsProps) {
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(event => 
    event.timestamp.startsWith(today)
  );

  const stats = {
    totalEvents: events.length,
    todayEvents: todayEvents.length,
    criticalEvents: events.filter(e => e.severity === 'critical').length,
    rateLimit: events.filter(e => e.type === 'rate_limit').length,
    unauthorized: events.filter(e => e.type === 'unauthorized').length,
    suspicious: events.filter(e => e.type === 'suspicious_activity').length
  };

  const cards = [
    {
      title: '総セキュリティイベント',
      value: stats.totalEvents.toLocaleString(),
      icon: Shield,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: '本日のイベント',
      value: stats.todayEvents.toLocaleString(),
      icon: Eye,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: '緊急度：高',
      value: stats.criticalEvents.toLocaleString(),
      icon: AlertTriangle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
    {
      title: '不正アクセス試行',
      value: stats.unauthorized.toLocaleString(),
      icon: Lock,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className={`${card.color} p-3 rounded-lg`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{card.title}</p>
              <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}