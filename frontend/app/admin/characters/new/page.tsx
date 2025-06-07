'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { getCroppedImg } from '@/utils/cropImage';
import ImageCropper from '@/components/admin/ImageCropper';
import { ArrowLeft, Save, X, Upload } from 'lucide-react';

// 調査したデータから取得した性格プリセット
const PERSONALITY_PRESETS = [
  { value: 'おっとり系', label: 'おっとり系', description: 'おっとりとしていて、ゆったりとした話し方をする' },
  { value: '元気系', label: '元気系', description: '明るくて活発、エネルギッシュな性格' },
  { value: 'クール系', label: 'クール系', description: 'クールで落ち着いている、知的な印象' },
  { value: '真面目系', label: '真面目系', description: '真面目で責任感が強い、丁寧な性格' },
  { value: 'セクシー系', label: 'セクシー系', description: '魅力的で大人の色気がある' },
  { value: '天然系', label: '天然系', description: '天然でちょっと抜けているところがある' },
  { value: 'ボーイッシュ系', label: 'ボーイッシュ系', description: 'ボーイッシュで活発、男の子っぽい性格' },
  { value: 'お姉さん系', label: 'お姉さん系', description: '包容力があり、面倒見が良い大人の女性' }
];

// 調査したデータから取得した性格タグ
const PERSONALITY_TAGS = [
  { value: '明るい', label: '明るい', description: '明るく前向きな雰囲気を持っている' },
  { value: 'よく笑う', label: 'よく笑う', description: 'よく笑い、楽しい雰囲気を作る' },
  { value: '甘えん坊', label: '甘えん坊', description: '甘えるのが上手で、可愛らしい一面がある' },
  { value: '積極的', label: '積極的', description: '積極的で行動力がある' },
  { value: '大人っぽい', label: '大人っぽい', description: '大人っぽい落ち着きがある' },
  { value: '静か', label: '静か', description: '静かで落ち着いている' },
  { value: '天然', label: '天然', description: '天然で純粋な一面がある' },
  { value: 'ボーイッシュ', label: 'ボーイッシュ', description: 'ボーイッシュで活発' },
  { value: 'ポジティブ', label: 'ポジティブ', description: '常にポジティブで前向き' },
  { value: 'やや毒舌', label: 'やや毒舌', description: 'ちょっと毒舌だが愛嬌がある' },
  { value: '癒し系', label: '癒し系', description: '癒しの雰囲気を持っている' },
  { value: '元気いっぱい', label: '元気いっぱい', description: 'エネルギッシュで元気いっぱい' },
  { value: '知的', label: '知的', description: '知的で頭が良い' },
  { value: '優しい', label: '優しい', description: '優しくて思いやりがある' },
  { value: '人懐っこい', label: '人懐っこい', description: '人懐っこくて親しみやすい' }
];

// アクセスタイプ
const ACCESS_TYPES = [
  { value: 'free', label: '無料', description: '誰でも無料で利用可能' },
  { value: 'token-based', label: 'トークン制', description: 'トークンを消費して利用' },
  { value: 'purchaseOnly', label: '買い切り', description: '一度購入すると永続利用可能' }
];

// AIモデル
const AI_MODELS = [
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: '高速で経済的なモデル' },
  { value: 'gpt-4', label: 'GPT-4', description: 'より高性能で詳細な応答が可能' }
];

// 性別
const GENDERS = [
  { value: 'female', label: '女性' },
  { value: 'male', label: '男性' },
  { value: 'neutral', label: '中性' }
];


export default function CharacterNewPage() {
  const router = useRouter();
  const { success, error } = useToast();
  
  const [formData, setFormData] = useState({
    // 基本情報
    name: { ja: '', en: '' },
    description: { ja: '', en: '' },
    
    // 性格・特徴
    personalityPreset: '',
    personalityTags: [] as string[],
    gender: 'female',
    age: '',
    occupation: '',
    
    // AI設定
    model: 'gpt-3.5-turbo',
    characterAccessType: 'free',
    price: 1500,
    
    // プロンプト・メッセージ
    adminPrompt: { ja: '', en: '' },
    defaultMessage: { ja: '', en: '' },
    limitMessage: { ja: '', en: '' },
    
    
    // 画像設定
    imageCharacterSelect: null,
    imageDashboard: null,
    imageChatBackground: null,
    imageChatAvatar: null,
    galleryImages: [] as { file: File; unlockLevel: number; title: string; description: string }[],
    
    // その他
    isActive: false,
    isBaseCharacter: false
  });

  const [showCropper, setShowCropper] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string>('');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [currentImageType, setCurrentImageType] = useState<string>('');
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState<number>(-1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!formData.name.ja.trim()) {
      error('入力エラー', 'キャラクター名（日本語）は必須です');
      return;
    }
    
    if (!formData.personalityPreset) {
      error('入力エラー', '性格プリセットを選択してください');
      return;
    }

    if (formData.personalityTags.length === 0) {
      error('入力エラー', '性格タグを最低1つ選択してください');
      return;
    }

    if (formData.characterAccessType === 'purchaseOnly' && formData.price <= 0) {
      error('入力エラー', '買い切りキャラクターの場合、価格を設定してください');
      return;
    }

    // 保存処理（実際の実装では API 呼び出し）
    success('作成完了', `${formData.name.ja}を新規作成しました`);
    
    // キャラクター一覧に戻る
    setTimeout(() => {
      router.push('/admin/characters');
    }, 1000);
  };

  const handleCancel = () => {
    router.push('/admin/characters');
  };

  const togglePersonalityTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      personalityTags: prev.personalityTags.includes(tag)
        ? prev.personalityTags.filter(t => t !== tag)
        : [...prev.personalityTags, tag]
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, imageType: string, galleryIndex?: number) => {
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
        setCurrentImageType(imageType);
        setCurrentGalleryIndex(galleryIndex ?? -1);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
    // inputをリセット
    e.target.value = '';
  };

  const handleCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    try {
      console.log('handleCropSave called');
      console.log('cropperImageSrc:', !!cropperImageSrc);
      console.log('croppedAreaPixels:', croppedAreaPixels);
      console.log('currentImageType:', currentImageType);
      
      if (!cropperImageSrc || !croppedAreaPixels || !currentImageType) {
        console.error('Missing required data for cropping');
        return;
      }
      
      const croppedImage = await getCroppedImg(
        cropperImageSrc,
        croppedAreaPixels
      );
      
      const croppedFile = new File([croppedImage], `${currentImageType}.jpg`, {
        type: 'image/jpeg',
      });
      
      if (currentImageType === 'gallery' && currentGalleryIndex >= 0) {
        // ギャラリー画像の場合
        const newGalleryImages = [...formData.galleryImages];
        if (newGalleryImages[currentGalleryIndex]) {
          newGalleryImages[currentGalleryIndex].file = croppedFile;
        } else {
          newGalleryImages[currentGalleryIndex] = {
            file: croppedFile,
            unlockLevel: (currentGalleryIndex + 1) * 10,
            title: '',
            description: ''
          };
        }
        setFormData({ ...formData, galleryImages: newGalleryImages });
      } else {
        // その他の画像の場合
        setFormData({ 
          ...formData, 
          [currentImageType]: croppedFile 
        });
      }
      
      setShowCropper(false);
      setCurrentImageType('');
      setCurrentGalleryIndex(-1);
      success('画像トリミング', '画像のトリミングが完了しました');
    } catch (err) {
      console.error('Crop failed:', err);
      alert('画像の処理に失敗しました: ' + (err as Error).message);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropperImageSrc('');
    setCroppedAreaPixels(null);
    setCurrentImageType('');
    setCurrentGalleryIndex(-1);
  };

  const removeImage = (imageType: string, galleryIndex?: number) => {
    if (imageType === 'gallery' && galleryIndex !== undefined) {
      const newGalleryImages = [...formData.galleryImages];
      newGalleryImages.splice(galleryIndex, 1);
      setFormData({ ...formData, galleryImages: newGalleryImages });
    } else {
      setFormData({ ...formData, [imageType]: null });
    }
  };

  const updateGalleryInfo = (index: number, field: 'title' | 'description', value: string) => {
    const newGalleryImages = [...formData.galleryImages];
    if (newGalleryImages[index]) {
      newGalleryImages[index][field] = value;
      setFormData({ ...formData, galleryImages: newGalleryImages });
    }
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
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* キャラクター画像設定 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">キャラクター画像設定</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* キャラクター選択画像 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    キャラクター選択画像
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors relative">
                    {formData.imageCharacterSelect ? (
                      <div className="space-y-2">
                        <div className="w-20 h-20 mx-auto bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={URL.createObjectURL(formData.imageCharacterSelect)} 
                            alt="キャラクター選択" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-sm text-gray-600">画像が設定されています</p>
                        <button
                          type="button"
                          onClick={() => removeImage('imageCharacterSelect')}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          削除
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-500">クリックまたはドラッグ&ドロップで画像をアップロード</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, 'imageCharacterSelect')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* ダッシュボード画像 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ダッシュボード画像
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors relative">
                    {formData.imageDashboard ? (
                      <div className="space-y-2">
                        <div className="w-20 h-20 mx-auto bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={URL.createObjectURL(formData.imageDashboard)} 
                            alt="ダッシュボード" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-sm text-gray-600">画像が設定されています</p>
                        <button
                          type="button"
                          onClick={() => removeImage('imageDashboard')}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          削除
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-500">クリックまたはドラッグ&ドロップで画像をアップロード</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, 'imageDashboard')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* チャット背景画像 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    チャット背景画像
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors relative">
                    {formData.imageChatBackground ? (
                      <div className="space-y-2">
                        <div className="w-20 h-20 mx-auto bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={URL.createObjectURL(formData.imageChatBackground)} 
                            alt="チャット背景" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-sm text-gray-600">画像が設定されています</p>
                        <button
                          type="button"
                          onClick={() => removeImage('imageChatBackground')}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          削除
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-500">クリックまたはドラッグ&ドロップで画像をアップロード</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, 'imageChatBackground')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* チャットアバター画像 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    チャットアバター画像
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors relative">
                    {formData.imageChatAvatar ? (
                      <div className="space-y-2">
                        <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={URL.createObjectURL(formData.imageChatAvatar)} 
                            alt="チャットアバター" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-sm text-gray-600">画像が設定されています</p>
                        <button
                          type="button"
                          onClick={() => removeImage('imageChatAvatar')}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          削除
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-500">クリックまたはドラッグ&ドロップで画像をアップロード</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, 'imageChatAvatar')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 基本情報 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    キャラクター名（日本語） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name.ja}
                    onChange={(e) => setFormData({ ...formData, name: { ...formData.name, ja: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="例: ルナ、ミコ、レイ"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    キャラクター名（英語）
                  </label>
                  <input
                    type="text"
                    value={formData.name.en}
                    onChange={(e) => setFormData({ ...formData, name: { ...formData.name, en: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="例: Luna, Miko, Rei"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    説明（日本語）
                  </label>
                  <textarea
                    value={formData.description.ja}
                    onChange={(e) => setFormData({ ...formData, description: { ...formData.description, ja: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                    placeholder="キャラクターの説明を入力してください..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    説明（英語）
                  </label>
                  <textarea
                    value={formData.description.en}
                    onChange={(e) => setFormData({ ...formData, description: { ...formData.description, en: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                    placeholder="Character description in English..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    性別
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  >
                    {GENDERS.map(gender => (
                      <option key={gender.value} value={gender.value} className="text-gray-900">
                        {gender.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    年齢
                  </label>
                  <input
                    type="text"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="例: 18歳、20代前半"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    職業・設定
                  </label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="例: 学生、OL、お嬢様"
                  />
                </div>
              </div>
            </div>

            {/* 性格・特徴設定 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">性格・特徴設定</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    性格プリセット <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.personalityPreset}
                    onChange={(e) => setFormData({ ...formData, personalityPreset: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    required
                  >
                    <option value="" className="text-gray-500">プリセットを選択してください</option>
                    {PERSONALITY_PRESETS.map(preset => (
                      <option key={preset.value} value={preset.value} className="text-gray-900">
                        {preset.label} - {preset.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    性格タグ <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {PERSONALITY_TAGS.map(tag => (
                      <label key={tag.value} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.personalityTags.includes(tag.value)}
                          onChange={() => togglePersonalityTag(tag.value)}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700" title={tag.description}>
                          {tag.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    選択済み: {formData.personalityTags.length}個
                  </p>
                </div>
              </div>
            </div>

            {/* AI・アクセス設定 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI・アクセス設定</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AIモデル
                  </label>
                  <select
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  >
                    {AI_MODELS.map(model => (
                      <option key={model.value} value={model.value} className="text-gray-900">
                        {model.label} - {model.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    アクセスタイプ
                  </label>
                  <select
                    value={formData.characterAccessType}
                    onChange={(e) => setFormData({ ...formData, characterAccessType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  >
                    {ACCESS_TYPES.map(type => (
                      <option key={type.value} value={type.value} className="text-gray-900">
                        {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.characterAccessType === 'purchaseOnly' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      価格（円）
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="1500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      推奨価格: 1500円〜3000円
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* プロンプト・メッセージ設定 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">プロンプト・メッセージ設定</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    管理者プロンプト（日本語）
                  </label>
                  <textarea
                    value={formData.adminPrompt.ja}
                    onChange={(e) => setFormData({ ...formData, adminPrompt: { ...formData.adminPrompt, ja: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={4}
                    placeholder="例: あなたは明るく元気な女の子のルナです。いつも前向きで、相手を励ましたり元気づけたりするのが得意です。語尾に「だよ」「だね」を使い、親しみやすい口調で話してください。"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    管理者プロンプト（英語）
                  </label>
                  <textarea
                    value={formData.adminPrompt.en}
                    onChange={(e) => setFormData({ ...formData, adminPrompt: { ...formData.adminPrompt, en: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={4}
                    placeholder="Example: You are Luna, a bright and energetic girl. You are always positive and good at encouraging and cheering up others. Use a friendly tone."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      デフォルトメッセージ（日本語）
                    </label>
                    <textarea
                      value={formData.defaultMessage.ja}
                      onChange={(e) => setFormData({ ...formData, defaultMessage: { ...formData.defaultMessage, ja: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={3}
                      placeholder="例: こんにちは！私はルナだよ✨ 今日はどんなことをお話ししようかな？"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      制限メッセージ（日本語）
                    </label>
                    <textarea
                      value={formData.limitMessage.ja}
                      onChange={(e) => setFormData({ ...formData, limitMessage: { ...formData.limitMessage, ja: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={3}
                      placeholder="例: 今日はたくさんお話しできて楽しかったよ！また明日お話ししようね♪"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ギャラリー画像（親密度解放用） */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ギャラリー画像（親密度解放用）</h3>
              <p className="text-sm text-gray-600 mb-6">
                親密度レベルに応じて解放される画像を設定します。最大10枚まで登録可能です。
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 10 }, (_, index) => {
                  const galleryItem = formData.galleryImages[index];
                  const unlockLevel = (index + 1) * 10;
                  
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          解放レベル {unlockLevel}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {index + 1}/10
                        </span>
                      </div>
                      
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 rounded-lg border border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                          {galleryItem?.file ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={URL.createObjectURL(galleryItem.file)} 
                              alt={`ギャラリー ${index + 1}`} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-400 text-xs">画像{index + 1}</span>
                          )}
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(e, 'gallery', index)}
                              className="hidden"
                              id={`gallery-upload-${index}`}
                            />
                            <label
                              htmlFor={`gallery-upload-${index}`}
                              className="cursor-pointer inline-flex items-center space-x-2 px-3 py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs"
                            >
                              <Upload className="w-3 h-3" />
                              <span>画像選択</span>
                            </label>
                            {galleryItem?.file && (
                              <button
                                type="button"
                                onClick={() => removeImage('gallery', index)}
                                className="ml-2 text-xs text-red-600 hover:text-red-800"
                              >
                                削除
                              </button>
                            )}
                          </div>
                          
                          <div>
                            <input
                              type="text"
                              value={galleryItem?.title || ''}
                              onChange={(e) => updateGalleryInfo(index, 'title', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                              placeholder="画像タイトル"
                            />
                          </div>
                          
                          <div>
                            <textarea
                              value={galleryItem?.description || ''}
                              onChange={(e) => updateGalleryInfo(index, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                              rows={2}
                              placeholder="画像説明"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 公開・その他設定 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">公開・その他設定</h3>
              <div className="space-y-4">
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
                  <p className="text-sm text-gray-500 mt-1 ml-7">
                    チェックを外すと下書き状態で保存されます
                  </p>
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.isBaseCharacter}
                      onChange={(e) => setFormData({ ...formData, isBaseCharacter: e.target.checked })}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">ベースキャラクターとして設定</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1 ml-7">
                    新規ユーザーのデフォルトキャラクターになります
                  </p>
                </div>
              </div>
            </div>

            {/* 注意事項 */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-purple-900 mb-2">キャラクター作成のガイドライン</h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• 性格タグは3〜5個程度が最適です</li>
                <li>• プロンプトは具体的で分かりやすく記述してください</li>
                <li>• 買い切りキャラクターの価格は1500円〜3000円を推奨</li>
                <li>• 公開前にテストユーザーでの動作確認を推奨します</li>
                <li>• ギャラリー画像は親密度レベルに応じて順次解放されます</li>
              </ul>
            </div>

            {/* ボタン */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center space-x-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>キャンセル</span>
              </button>
              
              <button
                type="submit"
                className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>作成</span>
              </button>
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