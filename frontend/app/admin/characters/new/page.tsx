'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { getCroppedImg } from '@/utils/cropImage';
import { compressImage, isImageSizeValid, formatFileSize } from '@/utils/imageCompression';
import ImageCropper from '@/components/admin/ImageCropper';
import { ArrowLeft, Save, X, Upload } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { 
  PERSONALITY_PRESETS, 
  PERSONALITY_TAGS, 
  ACCESS_TYPES,
  GENDERS,
  getLocalizedLabel,
  getLocalizedDescription
} from '@/constants/personality';

// AIモデル（初期値、APIから動的取得）
const DEFAULT_AI_MODELS = [
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: '高速で経済的なモデル' },
  { value: 'o4-mini', label: 'OpenAI o4-mini', description: '本番推奨モデル - 高品質・低コスト' }
];



export default function CharacterNewPage() {
  const router = useRouter();
  const { success, error } = useToast();
  
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [availableModels, setAvailableModels] = useState(DEFAULT_AI_MODELS);
  const [currentModel, setCurrentModel] = useState('');

  // フィールドエラーのスタイルを取得する関数
  const getFieldErrorClass = (fieldName: string) => {
    return fieldErrors[fieldName] 
      ? 'border-red-300  focus:ring-red-500' 
      : 'border-gray-300 ';
  };

  // エラーメッセージを表示する関数
  const renderFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      return (
        <p className="mt-1 text-sm text-red-600">
          {fieldErrors[fieldName]}
        </p>
      );
    }
    return null;
  };

  // APIから利用可能なモデルを取得
  useEffect(() => {
    const fetchAvailableModels = async () => {
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
          const modelsForSelect = data.models.map((model: any) => ({
            value: model.id,
            label: model.name,
            description: model.description
          }));
          setAvailableModels(modelsForSelect);
          setCurrentModel(data.currentModel);
          
          // フォームのデフォルト値を現在のモデルに設定
          setFormData(prev => ({
            ...prev,
            model: data.currentModel
          }));
        }
      } catch (err) {
        console.warn('モデル情報の取得に失敗:', err);
      }
    };
    
    fetchAvailableModels();
  }, []);

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
    model: 'o4-mini', // デフォルトを現在の推奨モデルに
    characterAccessType: 'free',
    stripePriceId: '',
    displayPrice: 0,
    
    // プロンプト・メッセージ
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // エラー状態をリセット
    setValidationErrors([]);
    setFieldErrors({});
    
    // フロントエンドバリデーション
    const errors: {[key: string]: string} = {};
    
    if (!formData.name.ja.trim()) {
      errors['name.ja'] = 'キャラクター名（日本語）は必須です';
    }
    
    if (!formData.personalityPreset) {
      errors['personalityPreset'] = '性格プリセットを選択してください';
    }

    if (formData.personalityTags.length === 0) {
      errors['personalityTags'] = '性格タグを最低1つ選択してください';
    }

    if (formData.characterAccessType === 'purchaseOnly' && !formData.stripePriceId.trim()) {
      errors['stripePriceId'] = 'プレミアムキャラクターの場合、Stripe価格IDを設定してください';
    }

    // フロントエンドバリデーションエラーがある場合
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      // 実際のAPI呼び出し
      const adminToken = localStorage.getItem('adminAccessToken');
      
      if (!adminToken) {
        router.push('/admin/login');
        return;
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        personalityPreset: formData.personalityPreset,
        personalityTags: formData.personalityTags,
        gender: formData.gender,
        characterAccessType: formData.characterAccessType,
        aiModel: formData.model,
        personalityPrompt: { ja: '', en: '' }, // 空のプロンプトを送信
        defaultMessage: {
          ja: formData.defaultMessage.ja || 'こんにちは！よろしくお願いします。',
          en: formData.defaultMessage.en || 'Hello! Nice to meet you!'
        },
        limitMessage: {
          ja: formData.limitMessage.ja || '今日はたくさんお話ししましたね。また明日お話ししましょう！',
          en: formData.limitMessage.en || 'We had a great conversation today! Let\'s talk again tomorrow!'
        },
        affinitySettings: {
          maxLevel: 100,
          experienceMultiplier: 1.0,
          decayRate: 0.1,
          decayThreshold: 7,
          levelUpBonuses: []
        },
        stripeProductId: formData.stripePriceId,
        purchasePrice: formData.displayPrice,
        isActive: formData.isActive
      };

      console.log('📤 Sending character data:', {
        payload,
        payloadSize: JSON.stringify(payload).length,
        adminToken: adminToken ? 'Present' : 'Missing'
      });

      const response = await fetch(`${API_BASE_URL}/api/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('❌ API Error Response:', responseData);
        
        // バリデーションエラーの詳細をUIに表示
        if (responseData.fieldErrors && Array.isArray(responseData.fieldErrors)) {
          const apiFieldErrors: {[key: string]: string} = {};
          responseData.fieldErrors.forEach((errorStr: string) => {
            const [field, ...messageParts] = errorStr.split(': ');
            apiFieldErrors[field] = messageParts.join(': ');
          });
          setFieldErrors(apiFieldErrors);
          setValidationErrors(responseData.fieldErrors);
        }
        
        // エラーメッセージを構築
        let errorMessage = responseData.message || 'キャラクターの作成に失敗しました';
        if (responseData.details) {
          errorMessage += ` (${responseData.details})`;
        }
        
        throw new Error(errorMessage);
      }

      console.log('✅ Character created successfully:', responseData);
      success('作成完了', `${formData.name.ja}を新規作成しました`);
      
      // キャラクター一覧に戻る
      setTimeout(() => {
        router.push('/admin/characters');
      }, 1500);

    } catch (err: any) {
      console.error('❌ Character creation failed:', err);
      // APIエラーの場合、フィールドエラーが既に設定されているので、追加でトーストは表示しない
    }
  };

  const handleCancel = () => {
    router.push('/admin/characters');
  };

  // Stripe価格ID変更時の価格取得処理
  const handlePriceIdChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const priceId = e.target.value;
    setFormData(prev => ({ ...prev, stripePriceId: priceId, displayPrice: 0 }));
    
    // 価格IDが正しい形式かチェック
    if (priceId && priceId.startsWith('price_') && priceId.length > 10) {
      setIsLoadingPrice(true);
      try {
        // 実際の実装ではStripe APIを呼び出して価格を取得
        // ここでは仮の実装
        const response = await fetch(`/api/admin/stripe/prices/${priceId}`);
        if (response.ok) {
          const priceData = await response.json();
          setFormData(prev => ({
            ...prev,
            displayPrice: priceData.unit_amount / 100 // centから円に変換
          }));
          success('価格取得完了', `価格: ¥${(priceData.unit_amount / 100).toLocaleString()}`);
        } else {
          error('価格取得エラー', '指定されたStripe価格IDが見つかりません');
        }
      } catch (err) {
        error('価格取得エラー', 'Stripe価格の取得に失敗しました');
      } finally {
        setIsLoadingPrice(false);
      }
    }
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
      // 🔍 デバッグ: 元ファイルの情報を確認
      console.log('🔍 選択されたファイル:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });
      
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
        console.log('🔍 FileReader結果:', {
          type: typeof imageSrc,
          starts: imageSrc.substring(0, 50) + '...',
          length: imageSrc.length,
          mimeFromDataUrl: imageSrc.split(';')[0]
        });
        
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
      
      const croppedFile = new File([croppedImage], `${currentImageType}.png`, {
        type: 'image/png',
      });

      // 🔍 デバッグ: ファイル情報を確認
      console.log('🔍 クロップ後のファイル情報:', {
        name: croppedFile.name,
        type: croppedFile.type,
        size: croppedFile.size,
        blobType: croppedImage.type
      });
      
      // 🔍 デバッグ: 元の画像ソース確認
      console.log('🔍 元の画像ソース:', cropperImageSrc.substring(0, 50) + '...');
      console.log('🔍 クロップ領域:', croppedAreaPixels);
      
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
          <form onSubmit={handleSubmit} className="space-y-8" noValidate>
            
            {/* バリデーションエラー表示 */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-800 font-semibold mb-2">入力データに問題があります</h3>
                <ul className="text-red-700 text-sm space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="flex items-start">
                      <span className="inline-block w-1 h-1 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
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
                        <div className="w-20 h-20 mx-auto bg-transparent rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={URL.createObjectURL(formData.imageCharacterSelect)} 
                            alt="キャラクター選択" 
                            className="w-full h-full object-cover bg-transparent"
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
                        <div className="w-20 h-20 mx-auto bg-transparent rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={URL.createObjectURL(formData.imageDashboard)} 
                            alt="ダッシュボード" 
                            className="w-full h-full object-cover bg-transparent"
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
                        <div className="w-20 h-20 mx-auto bg-transparent rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={URL.createObjectURL(formData.imageChatBackground)} 
                            alt="チャット背景" 
                            className="w-full h-full object-cover bg-transparent"
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
                        <div className="w-20 h-20 mx-auto bg-transparent rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={URL.createObjectURL(formData.imageChatAvatar)} 
                            alt="チャットアバター" 
                            className="w-full h-full object-cover bg-transparent"
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
                    className={`w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none ${getFieldErrorClass('name.ja')}`}
                    placeholder="例: ルナ、ミコ、レイ"
                  />
                  {renderFieldError('name.ja')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    キャラクター名（英語）
                  </label>
                  <input
                    type="text"
                    value={formData.name.en}
                    onChange={(e) => setFormData({ ...formData, name: { ...formData.name, en: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none "
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none "
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none "
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none  text-gray-900"
                  >
                    {GENDERS.map(gender => (
                      <option key={gender.value} value={gender.value} className="text-gray-900">
                        {getLocalizedLabel(gender, 'ja')}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none "
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none "
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
                    className={`w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none ${getFieldErrorClass('personalityPreset')}`}
                  >
                    <option value="" className="text-gray-500">プリセットを選択してください</option>
                    {PERSONALITY_PRESETS.map(preset => (
                      <option key={preset.value} value={preset.value} className="text-gray-900">
                        {getLocalizedLabel(preset, 'ja')} - {getLocalizedDescription(preset, 'ja')}
                      </option>
                    ))}
                  </select>
                  {renderFieldError('personalityPreset')}
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
                        <span className="text-sm text-gray-700" title={getLocalizedDescription(tag, 'ja')}>
                          {getLocalizedLabel(tag, 'ja')}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    選択済み: {formData.personalityTags.length}個
                  </p>
                  {renderFieldError('personalityTags')}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none  text-gray-900"
                  >
                    {availableModels.map(model => (
                      <option key={model.value} value={model.value} className="text-gray-900">
                        {model.label} - {model.description}
                        {model.value === currentModel ? ' (現在設定中)' : ''}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none  text-gray-900"
                  >
                    {ACCESS_TYPES.map(type => (
                      <option key={type.value} value={type.value} className="text-gray-900">
                        {getLocalizedLabel(type, 'ja')} - {getLocalizedDescription(type, 'ja')}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.characterAccessType === 'purchaseOnly' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stripe価格ID
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={formData.stripePriceId}
                        onChange={handlePriceIdChange}
                        className={`w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none ${getFieldErrorClass('stripePriceId')}`}
                        placeholder="price_1234567890abcdef"
                        disabled={isLoadingPrice}
                      />
                      {renderFieldError('stripePriceId')}
                      <p className="text-sm text-gray-500">
                        例: price_1234567890abcdef（Stripeダッシュボードから価格IDをコピー）
                      </p>
                      {isLoadingPrice && (
                        <p className="text-sm text-blue-500">
                          価格情報を取得中...
                        </p>
                      )}
                      {formData.displayPrice > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-green-800">
                            取得した価格: <span className="font-semibold">¥{formData.displayPrice.toLocaleString()}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* プロンプト・メッセージ設定 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">プロンプト・メッセージ設定</h3>
              <div className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      デフォルトメッセージ（日本語）
                    </label>
                    <textarea
                      value={formData.defaultMessage.ja}
                      onChange={(e) => setFormData({ ...formData, defaultMessage: { ...formData.defaultMessage, ja: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none "
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none "
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
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-gray-900 placeholder-gray-400 focus:outline-none "
                              placeholder="画像タイトル"
                            />
                          </div>
                          
                          <div>
                            <textarea
                              value={galleryItem?.description || ''}
                              onChange={(e) => updateGalleryInfo(index, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-gray-900 placeholder-gray-400 focus:outline-none "
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
                <li>• プレミアムキャラクターの価格は1500円〜3000円を推奨</li>
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
          imageType={currentImageType}
        />
      )}
    </div>
  );
}