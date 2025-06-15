'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { X, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';

interface TokenPack {
  _id?: string;
  name: string;
  description: string;
  tokens: number;
  price: number;
  priceId?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  profitMargin?: number;
  tokenPerYen?: number;
}

interface TokenPackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingPack?: TokenPack | null;
}

export default function TokenPackModal({ isOpen, onClose, onSave, editingPack }: TokenPackModalProps) {
  const { success, error } = useToast();
  const [formData, setFormData] = useState<Partial<TokenPack>>({
    name: '',
    description: '',
    tokens: 0,
    price: 0,
    priceId: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceIdInput, setPriceIdInput] = useState('');
  const [isPriceSet, setIsPriceSet] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or editing pack changes
  useEffect(() => {
    if (isOpen) {
      if (editingPack) {
        setFormData({
          name: editingPack.name,
          description: editingPack.description,
          tokens: editingPack.tokens,
          price: editingPack.price,
          priceId: editingPack.priceId || '',
          isActive: editingPack.isActive
        });
        setPriceIdInput(editingPack.priceId || '');
        setIsPriceSet(true);
      } else {
        setFormData({
          name: '',
          description: '',
          tokens: 0,
          price: 0,
          priceId: '',
          isActive: true
        });
        setPriceIdInput('');
        setIsPriceSet(false);
      }
      setErrors({});
    }
  }, [isOpen, editingPack]);

  // Calculate profit margin and validation
  const calculateMetrics = (tokens: number, price: number) => {
    if (tokens <= 0 || price <= 0) return { profitMargin: 0, tokenPerYen: 0, isValid: false };
    
    const tokenPerYen = tokens / price;
    const profitMargin = ((tokens - price * 2) / tokens) * 100;
    const isValid = tokens >= price * 2; // 50%利益ルール
    
    return { profitMargin, tokenPerYen, isValid };
  };

  const { profitMargin, tokenPerYen, isValid } = calculateMetrics(
    Number(formData.tokens) || 0, 
    Number(formData.price) || 0
  );

  // Stripe Price ID設定処理
  const handleSetPriceId = async () => {
    if (!priceIdInput.trim()) {
      error('入力エラー', 'Stripe Price IDを入力してください');
      return;
    }

    setPriceLoading(true);
    try {
      const adminToken = localStorage.getItem('adminAccessToken');
      const apiUrl = `/api/admin/stripe/price/${encodeURIComponent(priceIdInput)}`;
      console.log('🔗 Stripe Price API 呼び出し開始:', {
        priceId: priceIdInput,
        url: apiUrl,
        fullUrl: window.location.origin + apiUrl
      });
      
      // 新しいStripe Price APIエンドポイントを呼び出し
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        }
      });

      console.log('📡 API レスポンス:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.error('❌ API エラーレスポンス:', responseText);
        
        let errorMessage;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || `HTTP ${response.status}: Price取得に失敗しました`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${responseText.slice(0, 100)}...`;
        }
        throw new Error(errorMessage);
      }

      const priceData = await response.json();
      console.log('✅ Stripe Price データ取得成功:', priceData);

      if (!priceData.success || !priceData.price) {
        throw new Error('Price情報の形式が無効です');
      }

      const { price: stripePrice, calculatedTokens, profitMargin, tokenPerYen } = priceData;
      
      // 通貨に応じた価格変換（バックエンドで既に変換済みだが念のため）
      let priceInMainUnit: number;
      if (stripePrice.currency === 'jpy') {
        // 日本円は最小単位が円なので変換不要
        priceInMainUnit = stripePrice.unit_amount;
      } else {
        // USD等は最小単位がセントなので100で割る
        priceInMainUnit = Math.floor(stripePrice.unit_amount / 100);
      }
      
      console.log('💰 フロントエンド価格変換:', {
        original_unit_amount: stripePrice.unit_amount,
        currency: stripePrice.currency,
        converted_price: priceInMainUnit
      });
      
      // フォームデータを更新
      setFormData(prev => ({
        ...prev,
        tokens: calculatedTokens,
        price: priceInMainUnit,
        priceId: priceIdInput
      }));
      
      setIsPriceSet(true);
      
      // 成功メッセージ（製品名も含める）
      const productName = stripePrice.product?.name || 'トークンパック';
      success(
        '価格設定完了', 
        `${productName} → ¥${priceInMainUnit.toLocaleString()}, ${calculatedTokens.toLocaleString()}トークン (利益率: ${profitMargin.toFixed(1)}%)`
      );
      
    } catch (err: any) {
      console.error('❌ Stripe Price 取得エラー:', err);
      error('価格設定エラー', err.message || 'Price IDの設定に失敗しました');
    } finally {
      setPriceLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'パック名は必須です';
    }

    if (!isPriceSet) {
      newErrors.priceId = 'Stripe Price IDを設定してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const method = editingPack ? 'PUT' : 'POST';
      const url = editingPack 
        ? `/api/admin/token-packs/${editingPack._id}`
        : '/api/admin/token-packs';

      const adminToken = localStorage.getItem('adminAccessToken');
      
      if (!adminToken) {
        error('認証エラー', '管理者認証が必要です');
        return;
      }

      const backendUrl = editingPack 
        ? `${API_BASE_URL}/api/admin/token-packs/${editingPack._id}`
        : `${API_BASE_URL}/api/admin/token-packs`;

      const response = await fetch(backendUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          tokens: Number(formData.tokens),
          price: Number(formData.price),
          priceId: formData.priceId || undefined,
          isActive: formData.isActive
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save token pack');
      }

      const actionText = editingPack ? '更新' : '作成';
      success(`${actionText}完了`, `トークンパック「${formData.name}」を${actionText}しました`);
      onSave();
      onClose();
    } catch (err: any) {
      error('保存エラー', err.message || 'トークンパックの保存に失敗しました');
      console.error('Failed to save token pack:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof TokenPack, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingPack ? 'トークンパック編集' : 'トークンパック作成'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* パック名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              パック名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none text-gray-900 bg-white ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="例: スタンダードパック"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              説明
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none text-gray-900 bg-white"
              placeholder="このパックの特徴や推奨利用シーンを記載"
            />
          </div>

          {/* Stripe Price ID設定 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stripe Price ID <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={priceIdInput}
                onChange={(e) => setPriceIdInput(e.target.value)}
                disabled={editingPack !== null}
                className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none text-gray-900 bg-white ${
                  errors.priceId ? 'border-red-500' : 'border-gray-300'
                } ${editingPack ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="price_1RVCyQ1qmMqgQ3qQkRzWRIQU"
              />
              <button
                type="button"
                onClick={handleSetPriceId}
                disabled={priceLoading || !priceIdInput.trim() || editingPack !== null}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {priceLoading ? '取得中...' : 'IDを設定'}
              </button>
            </div>
            {errors.priceId && (
              <p className="mt-1 text-sm text-red-600">{errors.priceId}</p>
            )}
            {editingPack && (
              <p className="mt-1 text-sm text-gray-500">
                編集時はPrice IDの変更はできません
              </p>
            )}
          </div>

          {/* 自動計算された値の表示 */}
          {isPriceSet && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  付与トークン数（自動計算）
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                  {formData.tokens?.toLocaleString()} トークン
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  価格（自動取得）
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                  ¥{formData.price?.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* 利益率・管理情報表示 */}
          {isPriceSet && formData.tokens && formData.price && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 mt-0.5 text-green-600" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-800">
                    50%利益ルール適合済み
                  </h4>
                  <div className="mt-2 text-sm space-y-1">
                    <p className="text-green-700">
                      • 利益率: <span className="font-medium">{profitMargin.toFixed(1)}%</span>
                    </p>
                    <p className="text-green-700">
                      • トークン単価: <span className="font-medium">{tokenPerYen.toFixed(1)}トークン/円</span>
                    </p>
                    <p className="text-green-700">
                      • 総付与トークン: <span className="font-medium">{formData.tokens?.toLocaleString()}トークン</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* アクティブ状態 */}
          <div className="flex items-center">
            <input
              id="isActive"
              type="checkbox"
              checked={formData.isActive || false}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              アクティブ状態（購入可能）
            </label>
          </div>

          {/* ボタン */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || (!editingPack && !isPriceSet)}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : editingPack ? '更新' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}