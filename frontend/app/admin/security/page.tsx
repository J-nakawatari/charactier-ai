'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Activity, Users, Clock } from 'lucide-react';

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ページ読み込み時の初期化
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">セキュリティページを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                セキュリティ管理
              </h1>
              <p className="text-gray-600">
                システムセキュリティの監視と管理
              </p>
            </div>
          </div>
        </div>

        {/* ステータスカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">システム状態</p>
                <p className="text-2xl font-bold text-green-600 mt-1">正常</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">アクティブユーザー</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">28</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">セキュリティアラート</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">0</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">稼働時間</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">99.9%</p>
              </div>
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* セキュリティログ */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              最近のセキュリティイベント
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">システム正常稼働</p>
                  <p className="text-xs text-gray-500">すべてのサービスが正常に動作しています</p>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  2分前
                </div>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Activity className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">定期バックアップ完了</p>
                  <p className="text-xs text-gray-500">データベースの自動バックアップが正常に完了しました</p>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  1時間前
                </div>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Users className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">管理者ログイン</p>
                  <p className="text-xs text-gray-500">管理者アカウントでのログインが検出されました</p>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  3時間前
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 注意事項 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-2">セキュリティ機能について</h4>
              <p className="text-sm text-blue-800">
                高度なセキュリティ監視機能は現在開発中です。ログ分析、リアルタイム脅威検知、アクセス制御の詳細管理などの機能が今後追加予定です。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}