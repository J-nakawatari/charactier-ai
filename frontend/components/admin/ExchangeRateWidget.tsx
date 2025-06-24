'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, RefreshCw, Calendar } from 'lucide-react';
import { adminFetch } from '@/utils/admin-fetch';

interface ExchangeRateData {
  rate: number;
  source: string;
  fetchedAt: string;
  isValid: boolean;
  previousRate?: number;
}

export default function ExchangeRateWidget() {
  const [rateData, setRateData] = useState<ExchangeRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExchangeRate = async () => {
    try {
      setLoading(true);
      
      const response = await adminFetch('/api/v1/admin/exchange-rate', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('為替レート取得エラー');
      }

      const data = await response.json();
      setRateData(data.data);
      setError(null);
    } catch (err) {
      console.error('❌ Exchange rate fetch error:', err);
      setError('為替レート取得失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRate();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calculateTrend = () => {
    if (!rateData || !rateData.previousRate) return null;
    const change = rateData.rate - rateData.previousRate;
    const changePercent = (change / rateData.previousRate) * 100;
    return { change, changePercent };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error || !rateData) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">{error || '為替レート取得エラー'}</p>
        </div>
      </div>
    );
  }

  const trend = calculateTrend();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-600">USD/JPY 為替レート</h3>
            <p className="text-xs text-gray-400">{rateData.source}</p>
          </div>
        </div>
        <button
          onClick={fetchExchangeRate}
          disabled={loading}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="更新"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-gray-900">
            ¥{rateData.rate.toFixed(2)}
          </span>
          {trend && (
            <div className={`flex items-center space-x-1 text-sm ${
              trend.change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.change >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{trend.change >= 0 ? '+' : ''}{trend.changePercent.toFixed(2)}%</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(rateData.fetchedAt)}</span>
          </div>
          {!rateData.isValid && (
            <span className="text-yellow-600 font-medium">⚠️ フォールバック</span>
          )}
        </div>

        {rateData.previousRate && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              前回: ¥{rateData.previousRate.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}