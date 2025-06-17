'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Settings, Cpu, DollarSign, RotateCcw, Info } from 'lucide-react';

interface ModelInfo {
  id: string;
  name: string;
  description: string;
  cost: string;
  recommended: boolean;
  tokensPerYen: number;
  sampleTokens: {
    500: number;
    1000: number;
    2000: number;
  };
}

interface ModelData {
  success: boolean;
  models: ModelInfo[];
  currentModel: string;
}

export default function ModelsPage() {
  const { success, error } = useToast();
  
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChanging, setIsChanging] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');

  // モデル情報を取得
  const fetchModels = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminAccessToken');
      const response = await fetch('/api/admin/models', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setModelData(data);
        setSelectedModel(data.currentModel);
      } else {
        error('モデル情報の取得に失敗しました');
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      error('モデル情報の取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  // モデルを変更
  const handleModelChange = async () => {
    if (!selectedModel || selectedModel === modelData?.currentModel) {
      return;
    }

    setIsChanging(true);
    try {
      const token = localStorage.getItem('adminAccessToken');
      const response = await fetch('/api/admin/models', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: selectedModel })
      });

      if (response.ok) {
        const data = await response.json();
        success(`モデルを ${data.newModel} に変更しました`);
        await fetchModels(); // 最新情報を再取得
      } else {
        const errorData = await response.json();
        error(errorData.error || 'モデル変更に失敗しました');
      }
    } catch (err) {
      console.error('Error changing model:', err);
      error('モデル変更中にエラーが発生しました');
    } finally {
      setIsChanging(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">モデル情報を読み込み中...</div>
      </div>
    );
  }

  if (!modelData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-red-600">モデル情報の取得に失敗しました</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6 text-gray-600" />
        <h1 className="text-2xl font-bold text-gray-900">AIモデル管理</h1>
      </div>

      {/* 現在のモデル情報 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-blue-900">現在の設定</h2>
        </div>
        <div className="text-blue-800">
          使用中モデル: <span className="font-mono font-medium">{modelData.currentModel}</span>
        </div>
        <div className="text-sm text-blue-600 mt-1">
          このモデルがすべての新しいチャットで使用されます
        </div>
      </div>

      {/* モデル変更セクション */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">モデル変更</h2>
        
        <div className="grid gap-4 mb-4">
          {modelData.models.map((model) => (
            <label 
              key={model.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedModel === model.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="model"
                  value={model.id}
                  checked={selectedModel === model.id}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{model.name}</span>
                    {model.recommended && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        推奨
                      </span>
                    )}
                    {model.id === modelData.currentModel && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        使用中
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{model.description}</div>
                  <div className="text-xs text-gray-500 grid grid-cols-2 gap-2">
                    <div>コスト: {model.cost}</div>
                    <div>1円あたり: {model.tokensPerYen.toLocaleString()}トークン</div>
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleModelChange}
          disabled={isChanging || selectedModel === modelData.currentModel}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedModel === modelData.currentModel
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : isChanging
              ? 'bg-blue-300 text-white cursor-wait'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isChanging ? (
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 animate-spin" />
              変更中...
            </div>
          ) : selectedModel === modelData.currentModel ? (
            '現在と同じモデルです'
          ) : (
            'モデルを変更'
          )}
        </button>
      </div>

      {/* 料金シミュレーション */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">料金シミュレーション</h2>
        </div>
        
        <div className="grid gap-4">
          {modelData.models.map((model) => (
            <div key={model.id} className="border border-gray-200 rounded-lg p-4">
              <div className="font-medium text-gray-900 mb-2">{model.name}</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">¥500</div>
                  <div className="font-mono">{model.sampleTokens[500].toLocaleString()}トークン</div>
                </div>
                <div>
                  <div className="text-gray-600">¥1,000</div>
                  <div className="font-mono">{model.sampleTokens[1000].toLocaleString()}トークン</div>
                </div>
                <div>
                  <div className="text-gray-600">¥2,000</div>
                  <div className="font-mono">{model.sampleTokens[2000].toLocaleString()}トークン</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 注意事項 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-yellow-800">
            <div className="font-medium mb-1">重要な注意</div>
            <ul className="text-sm space-y-1">
              <li>• モデル変更は新しいチャットから適用されます</li>
              <li>• 既存のチャット履歴には影響しません</li>
              <li>• 変更後はアプリケーションの再起動を推奨します</li>
              <li>• 利益率90%を維持したトークン計算が適用されます</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}