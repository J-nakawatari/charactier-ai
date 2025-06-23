'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Volume2, 
  VolumeX, 
  Wifi, 
  WifiOff,
  Clock,
  User,
  MessageSquare,
  Brain
} from 'lucide-react';

// 🛡️ リアルタイムセキュリティイベント型
interface SecurityEvent {
  id: string;
  type: 'content_violation' | 'ai_moderation';
  severity: 'low' | 'medium' | 'high';
  userId: string;
  violationType: string;
  detectedWord?: string;
  messageContent?: string;
  ipAddress?: string;
  userAgent?: string;
  moderationCategories?: Record<string, any>;
  action: string;
  timestamp: string;
}

interface RealtimeSecurityMonitorProps {
  maxEvents?: number;
  enableSound?: boolean;
  autoScroll?: boolean;
}

export default function RealtimeSecurityMonitor({ 
  maxEvents = 50, 
  enableSound = true, 
  autoScroll = true 
}: RealtimeSecurityMonitorProps) {
  const { warning, error: showError } = useToast();
  
  // 📊 状態管理
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(enableSound);
  const [eventStats, setEventStats] = useState({
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    lastEventTime: null as string | null
  });

  // 🔄 SSE接続管理
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventsContainerRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // 🔊 アラート音生成
  const playAlertSound = useCallback((severity: string) => {
    if (!soundEnabled) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // 重要度に応じた音の設定
      const frequency = severity === 'high' ? 800 : severity === 'medium' ? 600 : 400;
      const duration = severity === 'high' ? 0.3 : 0.2;

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.error('Alert sound error:', error);
    }
  }, [soundEnabled]);

  // 🔄 SSE接続開始
  const connectToSecurityStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');
    
    try {
      // SSEはクッキー認証を使用するため、credentialsを指定
      const eventSource = new EventSource('/api/admin/security/events-stream');

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('🛡️ セキュリティストリーム接続成功');
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // 再接続タイマーをクリア
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connected') {
            console.log('🛡️ セキュリティストリーム接続確認');
            return;
          }
          
          if (data.type === 'heartbeat') {
            console.log('💓 セキュリティストリームハートビート');
            return;
          }

          if (data.type === 'security_event') {
            const securityEvent = data.event;
            console.log('🚨 新しいセキュリティイベント:', securityEvent);
            
            // イベントリストに追加
            setEvents(prevEvents => {
              const newEvents = [securityEvent, ...prevEvents].slice(0, maxEvents);
              return newEvents;
            });

            // 統計更新
            setEventStats(prev => ({
              total: prev.total + 1,
              high: prev.high + (securityEvent.severity === 'high' ? 1 : 0),
              medium: prev.medium + (securityEvent.severity === 'medium' ? 1 : 0),
              low: prev.low + (securityEvent.severity === 'low' ? 1 : 0),
              lastEventTime: securityEvent.timestamp
            }));

            // アラート音再生
            playAlertSound(securityEvent.severity);

            // 重要度に応じたトースト通知
            if (securityEvent.severity === 'high') {
              warning(`🚨 高リスク違反検出: ${securityEvent.violationType}`);
            }

            // 自動スクロール
            if (autoScroll && eventsContainerRef.current) {
              setTimeout(() => {
                eventsContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }, 100);
            }
          }
        } catch (error) {
          console.error('Security event parse error:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('🚨 セキュリティストリームエラー:', error);
        setIsConnected(false);
        setConnectionStatus('error');
        
        // 5秒後に再接続試行
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 セキュリティストリーム再接続試行...');
          connectToSecurityStream();
        }, 5000);
      };

    } catch (error) {
      console.error('🚨 セキュリティストリーム初期化エラー:', error);
      setConnectionStatus('error');
      showError('セキュリティストリームの接続に失敗しました');
    }
  }, [showError, maxEvents, autoScroll, warning, playAlertSound]);

  // 🎨 重要度バッジ
  const getSeverityBadge = (severity: string) => {
    const config = {
      high: { label: '高', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      medium: { label: '中', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      low: { label: '低', color: 'bg-green-100 text-green-800', icon: Shield }
    };
    
    const severityConfig = config[severity as keyof typeof config] || config.low;
    const Icon = severityConfig.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${severityConfig.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {severityConfig.label}
      </span>
    );
  };

  // 🎨 イベントタイプアイコン
  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'content_violation':
        return <MessageSquare className="w-4 h-4 text-red-500" />;
      case 'ai_moderation':
        return <Brain className="w-4 h-4 text-orange-500" />;
      default:
        return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  // 🕰️ 時間フォーマット
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 🔄 コンポーネント初期化
  useEffect(() => {
    connectToSecurityStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectToSecurityStream]);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* ヘッダー */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">リアルタイム監視</h3>
            </div>
            
            {/* 接続状況 */}
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <Wifi className="w-4 h-4" />
                  <span className="text-xs font-medium">接続中</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-600">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-xs font-medium">
                    {connectionStatus === 'connecting' ? '接続中...' : '切断'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* 音声切替 */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                soundEnabled 
                  ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
              title={soundEnabled ? 'アラート音オフ' : 'アラート音オン'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* 再接続ボタン */}
            <button
              onClick={connectToSecurityStream}
              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              title="再接続"
            >
              <Activity className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 統計サマリー */}
        <div className="mt-3 grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{eventStats.total}</div>
            <div className="text-xs text-gray-500">総イベント</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{eventStats.high}</div>
            <div className="text-xs text-gray-500">高リスク</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">{eventStats.medium}</div>
            <div className="text-xs text-gray-500">中リスク</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{eventStats.low}</div>
            <div className="text-xs text-gray-500">低リスク</div>
          </div>
        </div>
      </div>

      {/* イベントリスト */}
      <div 
        ref={eventsContainerRef}
        className="max-h-96 overflow-y-auto"
      >
        {events.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {events.map((event, index) => (
              <div key={`${event.id}-${index}`} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getEventTypeIcon(event.type)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {getSeverityBadge(event.severity)}
                        <span className="text-sm font-medium text-gray-900">
                          {event.violationType}
                        </span>
                      </div>
                      
                      {event.detectedWord && (
                        <div className="text-xs text-red-600 mb-1">
                          検出語: {event.detectedWord}
                        </div>
                      )}
                      
                      {event.messageContent && (
                        <div className="text-xs text-gray-600 mb-2 bg-gray-50 p-2 rounded">
                          {event.messageContent}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{event.userId}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(event.timestamp)}</span>
                        </div>
                        {event.ipAddress && (
                          <span className="font-mono">{event.ipAddress}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">セキュリティイベントはありません</p>
            <p className="text-xs text-gray-400 mt-1">
              {isConnected ? 'リアルタイム監視中...' : '接続を確認してください'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}