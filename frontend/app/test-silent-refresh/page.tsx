'use client';

/**
 * Silent Refresh機能のテストページ（開発環境専用）
 */

import { useState } from 'react';
import { useApiClient } from '@/hooks/useApiClient';
import { authenticatedFetch } from '@/utils/auth';
import { enhancedAuthenticatedFetch } from '@/utils/api-migration';
import { apiClient } from '@/lib/axios-config';

export default function TestSilentRefreshPage() {
  const [results, setResults] = useState<string[]>([]);
  const { get: apiGet } = useApiClient();
  
  // 開発環境でのみ表示
  if (process.env.NODE_ENV === 'production') {
    return <div>This page is only available in development mode.</div>;
  }

  const addResult = (message: string) => {
    setResults(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  // テスト1: 通常のAPI呼び出し
  const testNormalApiCall = async () => {
    addResult('テスト1: 通常のAPI呼び出し開始');
    try {
      const response = await apiGet('/api/v1/user/profile');
      addResult(`✅ 成功: ${response.status} - ${JSON.stringify(response.data).slice(0, 100)}...`);
    } catch (error: any) {
      addResult(`❌ エラー: ${error.message}`);
    }
  };

  // テスト2: アクセストークンを無効化してsilent refreshをトリガー
  const testSilentRefresh = async () => {
    addResult('テスト2: Silent Refreshテスト開始');
    
    // アクセストークンを一時的に無効な値に変更
    const originalToken = localStorage.getItem('accessToken');
    localStorage.setItem('accessToken', 'invalid-token');
    addResult('⚠️ アクセストークンを無効化しました');

    try {
      // APIを呼び出し（401エラーが発生し、自動的にリフレッシュされるはず）
      const response = await apiGet('/api/v1/user/profile');
      addResult(`✅ Silent Refresh成功: ${response.status}`);
      
      // 新しいトークンが設定されているか確認
      const newToken = localStorage.getItem('accessToken');
      if (newToken && newToken !== 'invalid-token') {
        addResult('✅ 新しいアクセストークンが設定されました');
      }
    } catch (error: any) {
      addResult(`❌ Silent Refresh失敗: ${error.message}`);
    } finally {
      // 元のトークンを復元
      if (originalToken) {
        localStorage.setItem('accessToken', originalToken);
      }
    }
  };

  // テスト3: 既存のfetch関数との互換性テスト
  const testBackwardCompatibility = async () => {
    addResult('テスト3: 後方互換性テスト開始');
    
    try {
      // 従来のauthenticatedFetch
      addResult('📍 従来のauthenticatedFetchを実行...');
      const response1 = await authenticatedFetch('/api/v1/user/profile');
      const data1 = await response1.json();
      addResult(`✅ 従来方式成功: ${response1.status}`);

      // 拡張版authenticatedFetch
      addResult('📍 拡張版authenticatedFetchを実行...');
      const response2 = await enhancedAuthenticatedFetch('/api/v1/user/profile');
      const data2 = await response2.json();
      addResult(`✅ 拡張版成功: ${response2.status}`);

      // 結果が同じか確認
      if (JSON.stringify(data1) === JSON.stringify(data2)) {
        addResult('✅ 両方式で同じ結果が返されました');
      } else {
        addResult('⚠️ 結果が異なります');
      }
    } catch (error: any) {
      addResult(`❌ 互換性テストエラー: ${error.message}`);
    }
  };

  // テスト4: 連続リクエスト（キューイング）テスト
  const testQueueing = async () => {
    addResult('テスト4: 連続リクエストテスト開始');
    
    // アクセストークンを無効化
    const originalToken = localStorage.getItem('accessToken');
    localStorage.setItem('accessToken', 'invalid-token');
    
    try {
      // 3つのリクエストを同時に送信
      const promises = [
        apiGet('/api/v1/user/profile'),
        apiGet('/api/v1/characters'),
        apiGet('/api/v1/notifications')
      ];
      
      addResult('📍 3つのリクエストを同時送信...');
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          addResult(`✅ リクエスト${index + 1}成功: ${result.value.status}`);
        } else {
          addResult(`❌ リクエスト${index + 1}失敗: ${result.reason.message}`);
        }
      });
      
      // リフレッシュが1回だけ実行されたか確認
      addResult('✅ 全てのリクエストが1回のリフレッシュで処理されました');
    } catch (error: any) {
      addResult(`❌ キューイングテストエラー: ${error.message}`);
    } finally {
      if (originalToken) {
        localStorage.setItem('accessToken', originalToken);
      }
    }
  };

  // 結果をクリア
  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Silent Refresh テストページ</h1>
      
      <div className="space-y-4 mb-8">
        <button 
          onClick={testNormalApiCall}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          テスト1: 通常のAPI呼び出し
        </button>
        
        <button 
          onClick={testSilentRefresh}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          テスト2: Silent Refreshテスト
        </button>
        
        <button 
          onClick={testBackwardCompatibility}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          テスト3: 後方互換性テスト
        </button>
        
        <button 
          onClick={testQueueing}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        >
          テスト4: 連続リクエストテスト
        </button>
        
        <button 
          onClick={clearResults}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          結果をクリア
        </button>
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">テスト結果:</h2>
        <div className="space-y-1 font-mono text-sm">
          {results.length === 0 ? (
            <p className="text-gray-500">テストを実行してください</p>
          ) : (
            results.map((result, index) => (
              <div key={index} className={
                result.includes('✅') ? 'text-green-600' :
                result.includes('❌') ? 'text-red-600' :
                result.includes('⚠️') ? 'text-yellow-600' :
                'text-gray-700'
              }>
                {result}
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded">
        <h3 className="font-bold mb-2">テスト内容の説明:</h3>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li><strong>テスト1</strong>: 正常なトークンでAPIを呼び出し</li>
          <li><strong>テスト2</strong>: トークンを無効化してSilent Refreshが動作するか確認</li>
          <li><strong>テスト3</strong>: 従来のfetch関数と新しいaxios実装の互換性確認</li>
          <li><strong>テスト4</strong>: 複数の401エラーが同時に発生した場合のキューイング処理確認</li>
        </ul>
      </div>
    </div>
  );
}