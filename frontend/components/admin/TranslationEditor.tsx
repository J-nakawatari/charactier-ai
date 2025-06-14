'use client';

import { useState } from 'react';
import { Languages, Plus, X } from 'lucide-react';

interface TranslationData {
  name: { ja: string; en: string };
  description: { ja: string; en: string };
  personalityPreset: { ja: string; en: string };
  personalityTags: { ja: string[]; en: string[] };
  adminPrompt: { ja: string; en: string };
  defaultMessage: { ja: string; en: string };
  limitMessage: { ja: string; en: string };
}

interface TranslationEditorProps {
  data: TranslationData;
  onChange: (data: TranslationData) => void;
}

export default function TranslationEditor({ data, onChange }: TranslationEditorProps) {
  const [activeLanguage, setActiveLanguage] = useState<'ja' | 'en'>('ja');
  const [newTag, setNewTag] = useState('');

  const languages = [
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'en', label: 'English', flag: '🇺🇸' }
  ] as const;

  const updateField = (field: keyof TranslationData, lang: 'ja' | 'en', value: any) => {
    onChange({
      ...data,
      [field]: {
        ...(data[field] || {}),
        [lang]: value
      }
    });
  };

  const addTag = () => {
    if (newTag.trim()) {
      const currentTags = data.personalityTags?.[activeLanguage] || [];
      updateField('personalityTags', activeLanguage, [...currentTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    const currentTags = data.personalityTags?.[activeLanguage] || [];
    updateField('personalityTags', activeLanguage, currentTags.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Languages className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">多言語翻訳管理</h3>
      </div>

      {/* 言語切り替えタブ */}
      <div className="flex space-x-2 mb-6 border-b border-gray-200">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setActiveLanguage(lang.code)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeLanguage === lang.code
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </button>
        ))}
      </div>

      {/* 翻訳編集フォーム */}
      <div className="space-y-6">
        {/* キャラクター名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            キャラクター名 ({activeLanguage === 'ja' ? '日本語' : '英語'})
          </label>
          <input
            type="text"
            value={data.name?.[activeLanguage] || ''}
            onChange={(e) => updateField('name', activeLanguage, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
            placeholder={activeLanguage === 'ja' ? '例: ルナ' : '例: Luna'}
          />
        </div>

        {/* 説明 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            説明 ({activeLanguage === 'ja' ? '日本語' : '英語'})
          </label>
          <textarea
            value={data.description?.[activeLanguage] || ''}
            onChange={(e) => updateField('description', activeLanguage, e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors resize-none text-gray-900"
            placeholder={
              activeLanguage === 'ja'
                ? 'キャラクターの説明を入力してください'
                : 'Enter character description'
            }
          />
        </div>

        {/* 性格プリセット */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            性格プリセット ({activeLanguage === 'ja' ? '日本語' : '英語'})
          </label>
          <textarea
            value={data.personalityPreset?.[activeLanguage] || ''}
            onChange={(e) => updateField('personalityPreset', activeLanguage, e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors resize-none text-gray-900"
            placeholder={
              activeLanguage === 'ja'
                ? 'キャラクターの性格設定を入力してください（システムプロンプト用）'
                : 'Enter character personality settings (for system prompt)'
            }
          />
        </div>

        {/* 性格タグ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            性格タグ ({activeLanguage === 'ja' ? '日本語' : '英語'})
          </label>
          
          {/* 既存タグ表示 */}
          <div className="flex flex-wrap gap-2 mb-3">
            {(data.personalityTags?.[activeLanguage] || []).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* タグ追加フォーム */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
              placeholder={
                activeLanguage === 'ja'
                  ? '例: 優しい、活発、知的'
                  : '例: Kind, Active, Intelligent'
              }
            />
            <button
              type="button"
              onClick={addTag}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>追加</span>
            </button>
          </div>
        </div>

        {/* 管理者プロンプト */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            管理者プロンプト ({activeLanguage === 'ja' ? '日本語' : '英語'})
          </label>
          <textarea
            value={data.adminPrompt?.[activeLanguage] || ''}
            onChange={(e) => updateField('adminPrompt', activeLanguage, e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors resize-none text-gray-900"
            placeholder={
              activeLanguage === 'ja'
                ? '例: あなたは明るく元気な女の子のルナです。いつも前向きで、相手を励ましたり元気づけたりするのが得意です。'
                : 'Example: You are Luna, a bright and energetic girl. You are always positive and good at encouraging others.'
            }
          />
        </div>

        {/* デフォルトメッセージ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            デフォルトメッセージ ({activeLanguage === 'ja' ? '日本語' : '英語'})
          </label>
          <textarea
            value={data.defaultMessage?.[activeLanguage] || ''}
            onChange={(e) => updateField('defaultMessage', activeLanguage, e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors resize-none text-gray-900"
            placeholder={
              activeLanguage === 'ja'
                ? '例: こんにちは！私はルナだよ✨ 今日はどんなことをお話ししようかな？'
                : 'Example: Hello! I\'m Luna ✨ What would you like to talk about today?'
            }
          />
        </div>

        {/* 制限メッセージ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            制限メッセージ ({activeLanguage === 'ja' ? '日本語' : '英語'})
          </label>
          <textarea
            value={data.limitMessage?.[activeLanguage] || ''}
            onChange={(e) => updateField('limitMessage', activeLanguage, e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors resize-none text-gray-900"
            placeholder={
              activeLanguage === 'ja'
                ? '例: 今日はたくさんお話しできて楽しかったよ！また明日お話ししようね♪'
                : 'Example: I enjoyed talking with you today! Let\'s chat again tomorrow ♪'
            }
          />
        </div>

        {/* 翻訳完了度表示 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">翻訳完了度</h4>
          <div className="space-y-2">
            {languages.map((lang) => {
              const completedFields = [
                data.name?.[lang.code]?.trim() !== '',
                data.description?.[lang.code]?.trim() !== '',
                data.personalityPreset?.[lang.code]?.trim() !== '',
                (data.personalityTags?.[lang.code] || []).length > 0,
                data.adminPrompt?.[lang.code]?.trim() !== '',
                data.defaultMessage?.[lang.code]?.trim() !== '',
                data.limitMessage?.[lang.code]?.trim() !== ''
              ].filter(Boolean).length;
              
              const totalFields = 7;
              const percentage = Math.round((completedFields / totalFields) * 100);
              
              return (
                <div key={lang.code} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {lang.flag} {lang.label}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-10">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}