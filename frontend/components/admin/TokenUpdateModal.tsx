'use client';

import { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import { ensureUserNameString } from '@/utils/userUtils';

interface TokenUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (newBalance: number) => void;
  user: {
    id: string;
    name: string;
    tokenBalance: number;
  } | null;
}

export default function TokenUpdateModal({ isOpen, onClose, onUpdate, user }: TokenUpdateModalProps) {
  const [newBalance, setNewBalance] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const balance = parseInt(newBalance);
    if (isNaN(balance) || balance < 0) {
      setError('0以上の数値を入力してください');
      return;
    }

    onUpdate(balance);
    handleClose();
  };

  const handleClose = () => {
    setNewBalance('');
    setError('');
    onClose();
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ja-JP');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">トークン残高を更新</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-medium">
                  {ensureUserNameString(user.name).charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">{ensureUserNameString(user.name)}</p>
                <p className="text-sm text-gray-500">現在の残高: {formatNumber(user.tokenBalance)}枚</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="newBalance" className="block text-sm font-medium text-gray-700 mb-2">
              新しいトークン残高
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                id="newBalance"
                value={newBalance}
                onChange={(e) => {
                  setNewBalance(e.target.value);
                  setError('');
                }}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="0"
                min="0"
                required
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex justify-between">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setNewBalance('0')}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                0に設定
              </button>
              <button
                type="button"
                onClick={() => setNewBalance('10000')}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                10,000
              </button>
              <button
                type="button"
                onClick={() => setNewBalance('50000')}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                50,000
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              更新する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}