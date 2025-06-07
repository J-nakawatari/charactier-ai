'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { getCroppedImg } from '@/utils/cropImage';
import ImageCropper from '@/components/admin/ImageCropper';
import { ArrowLeft, Save, X, Upload } from 'lucide-react';

export default function CharacterNewPage() {
  const router = useRouter();
  const { success, error } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    personalityType: '',
    traits: [] as string[],
    price: 980,
    isFree: false,
    isActive: false, // 新規作成時はデフォルトで非公開
  });

  const [newTrait, setNewTrait] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string>('');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!formData.name.trim()) {
      error('入力エラー', 'キャラクター名は必須です');
      return;
    }
    
    if (!formData.personalityType.trim()) {
      error('入力エラー', '性格タイプは必須です');
      return;
    }

    if (formData.traits.length === 0) {
      error('入力エラー', '特徴は最低1つ入力してください');
      return;
    }

    if (!formData.isFree && formData.price <= 0) {
      error('入力エラー', '有料キャラクターの場合、価格は1円以上で設定してください');
      return;
    }

    // 保存処理（実際の実装では API 呼び出し）
    success('作成完了', `${formData.name}を新規作成しました`);
    
    // キャラクター一覧に戻る
    setTimeout(() => {
      router.push('/admin/characters');
    }, 1000);
  };

  const handleCancel = () => {
    router.push('/admin/characters');
  };

  const addTrait = () => {
    if (newTrait.trim() && !formData.traits.includes(newTrait.trim())) {
      setFormData({
        ...formData,
        traits: [...formData.traits, newTrait.trim()]
      });
      setNewTrait('');
    }
  };

  const removeTrait = (trait: string) => {
    setFormData({
      ...formData,
      traits: formData.traits.filter(t => t !== trait)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTrait();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB制限
        error('ファイルエラー', '画像ファイルは5MB以下にしてください');
        return;
      }

      if (!file.type.startsWith('image/')) {
        error('ファイルエラー', '画像ファイルを選択してください');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        setCropperImageSrc(imageSrc);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    try {
      if (cropperImageSrc && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(
          cropperImageSrc,
          croppedAreaPixels
        );
        
        // Blobを新しいFileオブジェクトに変換
        const croppedFile = new File([croppedImage], 'cropped-avatar.jpg', {
          type: 'image/jpeg',
        });
        
        setImageFile(croppedFile);
        
        // プレビュー用のURLを作成
        const previewUrl = URL.createObjectURL(croppedImage);
        setImagePreview(previewUrl);
        
        setShowCropper(false);
        success('画像トリミング', '画像のトリミングが完了しました');
      }
    } catch (error) {
      console.error('Crop failed:', error);
      error('トリミングエラー', '画像の処理に失敗しました');
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropperImageSrc('');
    setCroppedAreaPixels(null);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-4 md:p-6 pr-16 lg:pr-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/characters')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">新規キャラクター作成</h1>
              <p className="text-sm text-gray-500 mt-1">
                新しいAIキャラクターを作成
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-6">
              {/* アバター画像 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">アバター画像</h3>
                <div className="flex items-center space-x-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center overflow-hidden">
                    {imagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={imagePreview} 
                        alt="プレビュー" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-2xl font-medium">
                        {formData.name.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <div className="space-y-2">
                      <label
                        htmlFor="avatar-upload"
                        className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        <span>画像を選択</span>
                      </label>
                      {imageFile && (
                        <button
                          type="button"
                          onClick={removeImage}
                          className="block text-sm text-red-600 hover:text-red-800"
                        >
                          画像を削除
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      推奨: 正方形、5MB以下
                    </p>
                  </div>
                </div>
              </div>

              {/* 基本情報 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      キャラクター名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="例: 美咲、リン、さくら"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      性格タイプ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.personalityType}
                      onChange={(e) => setFormData({ ...formData, personalityType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="例: 優しい、ツンデレ、明るい"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      特徴 <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newTrait}
                          onChange={(e) => setNewTrait(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="特徴を入力してEnterで追加"
                        />
                        <button
                          type="button"
                          onClick={addTrait}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          追加
                        </button>
                      </div>
                      
                      {formData.traits.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.traits.map((trait, index) => (
                            <span 
                              key={index}
                              className="inline-flex items-center px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full"
                            >
                              {trait}
                              <button
                                type="button"
                                onClick={() => removeTrait(trait)}
                                className="ml-2 text-purple-500 hover:text-purple-700"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      例: 天然、癒し系、おっとり、強気、恥ずかしがり
                    </p>
                  </div>
                </div>
              </div>

              {/* 価格設定 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">価格設定</h3>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.isFree}
                        onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">無料キャラクター</span>
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      無料キャラクターは誰でも利用可能です
                    </p>
                  </div>

                  {!formData.isFree && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        価格（円）
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="980"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        推奨価格: 980円〜1980円
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 公開設定 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">公開設定</h3>
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">作成後すぐに公開する</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    チェックを外すと下書き状態で保存されます
                  </p>
                </div>
              </div>

              {/* 注意事項 */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-purple-900 mb-2">キャラクター作成のガイドライン</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• 特徴は3〜5個程度が最適です</li>
                  <li>• 性格タイプは分かりやすく一言で表現してください</li>
                  <li>• 価格は競合キャラクターを参考に設定してください</li>
                  <li>• 公開前にテストユーザーでの動作確認を推奨します</li>
                </ul>
              </div>

              {/* ボタン */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>キャンセル</span>
                </button>
                
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>作成</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* 画像クロッパー */}
      {showCropper && (
        <ImageCropper
          imageSrc={cropperImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          onSave={handleCropSave}
        />
      )}
    </div>
  );
}