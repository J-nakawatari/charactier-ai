'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  BarChart3, 
  Save, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  Copy,
  ExternalLink
} from 'lucide-react';

interface GoogleAnalyticsSettings {
  measurementId: string;
  trackingCode?: string;
  isActive: boolean;
}

export default function AnalyticsSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<GoogleAnalyticsSettings>({
    measurementId: '',
    trackingCode: '',
    isActive: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showExample, setShowExample] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminAccessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/system-settings/google-analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings({
            measurementId: data.settings.measurementId || '',
            trackingCode: data.settings.trackingCode || '',
            isActive: data.isActive
          });
        }
      } else if (response.status === 401) {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('設定取得エラー:', error);
      setMessage({ type: 'error', text: '設定の取得に失敗しました' });
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // 設定を取得
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // 設定を保存
  const handleSave = async () => {
    if (!settings.measurementId && !settings.trackingCode) {
      setMessage({ type: 'error', text: '測定IDまたはトラッキングコードを入力してください' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('adminAccessToken');
      const response = await fetch('/api/system-settings/google-analytics', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Google Analytics設定を保存しました' });
        fetchSettings(); // 再読み込み
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || '保存に失敗しました' });
      }
    } catch (error) {
      console.error('保存エラー:', error);
      setMessage({ type: 'error', text: '保存中にエラーが発生しました' });
    } finally {
      setIsSaving(false);
    }
  };

  // 設定を削除（無効化）
  const handleDelete = async () => {
    if (!confirm('Google Analytics設定を無効にしますか？')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminAccessToken');
      const response = await fetch('/api/system-settings/google-analytics', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSettings({ measurementId: '', trackingCode: '', isActive: false });
        setMessage({ type: 'success', text: 'Google Analytics設定を無効にしました' });
      }
    } catch (error) {
      console.error('削除エラー:', error);
      setMessage({ type: 'error', text: '削除中にエラーが発生しました' });
    }
  };

  // トラッキングコードから測定IDを抽出
  const extractMeasurementId = (code: string) => {
    const match = code.match(/gtag\s*\(\s*['"]config['"]\s*,\s*['"]([^'"]+)['"]/);
    if (match && match[1]) {
      setSettings({ ...settings, measurementId: match[1], trackingCode: code });
    } else {
      setSettings({ ...settings, trackingCode: code });
    }
  };

  const exampleCode = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-XXXXXXXXXX');
</script>`;

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <Image
                src="/icon/arrow.svg"
                alt="戻る"
                width={20}
                height={20}
                className="transform rotate-180"
              />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Google Analytics 設定
              </h1>
              <p className="text-gray-600">
                サイトのアクセス解析用のGoogle Analyticsを設定します
              </p>
            </div>
          </div>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 設定フォーム */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            {/* 測定ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                測定ID
              </label>
              <input
                type="text"
                value={settings.measurementId}
                onChange={(e) => setSettings({ ...settings, measurementId: e.target.value })}
                placeholder="G-XXXXXXXXXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <p className="mt-1 text-sm text-gray-500">
                Google Analyticsの測定IDを入力してください
              </p>
            </div>

            {/* トラッキングコード */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  トラッキングコード（オプション）
                </label>
                <button
                  onClick={() => setShowExample(!showExample)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showExample ? '例を隠す' : '例を表示'}
                </button>
              </div>
              
              {showExample && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Google Analytics スクリプトの例</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(exampleCode)}
                      className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-700"
                    >
                      <Copy className="w-4 h-4" />
                      <span>コピー</span>
                    </button>
                  </div>
                  <pre className="text-xs text-gray-600 overflow-x-auto">
                    <code>{exampleCode}</code>
                  </pre>
                </div>
              )}

              <textarea
                value={settings.trackingCode}
                onChange={(e) => extractMeasurementId(e.target.value)}
                placeholder="Google Analyticsのトラッキングコードを貼り付け（任意）"
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                Google Analyticsから提供されたトラッキングコード全体を貼り付けることもできます
              </p>
            </div>

            {/* 有効/無効 */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isActive"
                checked={settings.isActive}
                onChange={(e) => setSettings({ ...settings, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                トラッキングを有効にする
              </label>
            </div>

            {/* 情報 */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">設定方法</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Google Analyticsアカウントにログイン</li>
                    <li>管理 → データストリーム → ウェブストリームを選択</li>
                    <li>「測定ID」をコピーして上記フィールドに貼り付け</li>
                    <li>または「グローバルサイトタグ」全体をトラッキングコード欄に貼り付け</li>
                  </ol>
                  <a
                    href="https://analytics.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 mt-2 text-blue-600 hover:text-blue-700"
                  >
                    <span>Google Analyticsを開く</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleDelete}
              disabled={!settings.measurementId || isSaving}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>設定を無効化</span>
            </button>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? '保存中...' : '設定を保存'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}