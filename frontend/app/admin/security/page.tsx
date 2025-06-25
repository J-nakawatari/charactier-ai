'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Activity, Users, Clock, Eye, UserX } from 'lucide-react';
import { adminAuthenticatedFetch } from '@/utils/auth';

interface ViolationStats {
  totalViolations: number;
  uniqueUserCount: number;
  avgSeverity: number;
}

interface SanctionedUser {
  _id: string;
  name: string;
  email: string;
  accountStatus: string;
  suspensionEndDate?: string;
  violationCount: number;
}

interface ViolationRecord {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    accountStatus: string;
  };
  violationType: string;
  messageContent: string;
  reason: string;
  detectedWord?: string;
  severityLevel: number;
  timestamp: string;
}

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [violationStats, setViolationStats] = useState<ViolationStats>({
    totalViolations: 0,
    uniqueUserCount: 0,
    avgSeverity: 0
  });
  const [sanctionedUsers, setSanctionedUsers] = useState<SanctionedUser[]>([]);
  const [recentViolations, setRecentViolations] = useState<ViolationRecord[]>([]);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);

      const [statsRes, usersRes, violationsRes] = await Promise.all([
        adminAuthenticatedFetch('/api/v1/admin/security/violation-stats'),
        adminAuthenticatedFetch('/api/v1/admin/security/sanctioned-users'),
        adminAuthenticatedFetch('/api/v1/admin/security/recent-violations?limit=10')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setViolationStats(statsData.totalStats || { totalViolations: 0, uniqueUserCount: 0, avgSeverity: 0 });
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setSanctionedUsers(usersData.users || []);
      }

      if (violationsRes.ok) {
        const violationsData = await violationsRes.json();
        setRecentViolations(violationsData.violations || []);
      }

    } catch (error) {
      console.error('セキュリティデータの取得に失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLiftSanction = async (userId: string) => {
    if (!confirm('この制裁を解除してもよろしいですか？')) {
      return;
    }

    try {
      const response = await adminAuthenticatedFetch(`/api/v1/admin/security/lift-sanction/${userId}`, {
        method: 'POST'
      });

      if (response.ok) {
        alert('制裁を解除しました');
        fetchSecurityData(); // データを再読み込み
      } else {
        throw new Error('制裁解除に失敗しました');
      }
    } catch (error) {
      console.error('制裁解除エラー:', error);
      alert('制裁解除に失敗しました');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'banned': return 'text-red-600 bg-red-50';
      case 'account_suspended': return 'text-orange-600 bg-orange-50';
      case 'chat_suspended': return 'text-yellow-600 bg-yellow-50';
      case 'warned': return 'text-blue-600 bg-blue-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'banned': return '永久停止';
      case 'account_suspended': return 'アカウント停止';
      case 'chat_suspended': return 'チャット停止';
      case 'warned': return '警告中';
      default: return '正常';
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">セキュリティページを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  セキュリティ管理
                </h1>
                <p className="text-gray-600">
                  違反記録の監視と制裁管理
                </p>
              </div>
            </div>
            <button
              onClick={fetchSecurityData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              更新
            </button>
          </div>
        </div>

        {/* ステータスカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総違反数</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{violationStats.totalViolations}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">違反ユーザー数</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{violationStats.uniqueUserCount}</p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">制裁中ユーザー</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{sanctionedUsers.length}</p>
              </div>
              <UserX className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">平均重要度</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{violationStats.avgSeverity.toFixed(1)}</p>
              </div>
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* 制裁中ユーザー一覧 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              制裁中ユーザー
            </h3>
          </div>
          <div className="overflow-x-auto">
            {sanctionedUsers.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ユーザー
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      違反回数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      解除予定
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sanctionedUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.accountStatus)}`}>
                          {getStatusText(user.accountStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.violationCount}回
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.suspensionEndDate 
                          ? new Date(user.suspensionEndDate).toLocaleString('ja-JP')
                          : user.accountStatus === 'banned' ? '永久' : '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleLiftSanction(user._id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          制裁解除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500">制裁中のユーザーはいません</p>
              </div>
            )}
          </div>
        </div>

        {/* 最近の違反記録 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              最近の違反記録
            </h3>
          </div>
          <div className="p-6">
            {recentViolations.length > 0 ? (
              <div className="space-y-4">
                {recentViolations.map((violation) => (
                  <div key={violation._id} className="flex items-start space-x-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900">
                          {violation.userId?.name || 'Unknown User'} ({violation.userId?.email || 'No email'})
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(violation.userId?.accountStatus || 'active')}`}>
                          レベル{violation.severityLevel}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        <strong>理由:</strong> {violation.reason}
                      </p>
                      {violation.detectedWord && (
                        <p className="text-sm text-gray-700 mb-1">
                          <strong>検出語:</strong> <code className="bg-gray-100 px-1 py-0.5 rounded">{violation.detectedWord}</code>
                        </p>
                      )}
                      <p className="text-sm text-gray-700 mb-1">
                        <strong>メッセージ:</strong> {violation.messageContent.substring(0, 100)}...
                      </p>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(violation.timestamp).toLocaleString('ja-JP')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">最近の違反記録はありません</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}