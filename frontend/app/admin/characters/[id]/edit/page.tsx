'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useToast } from '@/contexts/ToastContext';
import { getCroppedImg } from '@/utils/cropImage';
import { compressImage, isImageSizeValid, formatFileSize } from '@/utils/imageCompression';
import { normalizeImageUrl } from '@/utils/imageUtils';
import ImageCropper from '@/components/admin/ImageCropper';
import TranslationEditor from '@/components/admin/TranslationEditor';
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
  { value: 'o4-mini', label: 'OpenAI o4-mini', description: '本番推奨モデル - 高品質・低コスト' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'バランス型 - 中コスト' }
];


export default function CharacterEditPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error } = useToast();
  const characterId = params.id as string;
  
  const [availableModels, setAvailableModels] = useState(DEFAULT_AI_MODELS);
  const [currentSystemModel, setCurrentSystemModel] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // 翻訳データ（既存の機能を保持）
  const [translationData, setTranslationData] = useState({
    name: { ja: '', en: '' },
    description: { ja: '', en: '' },
    personalityPreset: { ja: '', en: '' },
    personalityTags: { ja: [] as string[], en: [] as string[] },
    adminPrompt: { ja: '', en: '' },
    defaultMessage: { ja: '', en: '' },
    limitMessage: { ja: '', en: '' }
  });

  // 基本フォームデータ（新規登録画面から統合）
  const [formData, setFormData] = useState({
    // 性格・特徴
    personalityPreset: '',
    personalityTags: [] as string[],
    gender: 'female',
    age: '',
    occupation: '',
    
    // AI設定
    model: 'gpt-3.5-turbo',
    characterAccessType: 'free' as 'free' | 'purchaseOnly',
    stripeProductId: '',
    purchasePrice: 0,
    
    // プロンプト・メッセージ
    adminPrompt: { ja: '', en: '' },
    defaultMessage: { ja: '', en: '' },
    limitMessage: { ja: '', en: '' },
    
    // 画像設定
    imageCharacterSelect: null as File | null,
    imageDashboard: null as File | null,
    imageChatBackground: null as File | null,
    imageChatAvatar: null as File | null,
    galleryImages: [] as { file: File; imageUrl?: string; unlockLevel: number; title: string; description: string }[],
    
    // 画像URL（アップロード済み画像）
    imageCharacterSelectUrl: '',
    imageDashboardUrl: '',
    imageChatBackgroundUrl: '',
    imageChatAvatarUrl: '',
    
    // その他
    isActive: false
  });

  // 画像クロッピング関連
  const [showCropper, setShowCropper] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string>('');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [currentImageType, setCurrentImageType] = useState<string>('');
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState<number>(-1);
  const [isUploading, setIsUploading] = useState(false);
  
  // 価格情報取得関連
  const [priceInfo, setPriceInfo] = useState<{ price: number; currency: string } | null>(null);
  const [priceError, setPriceError] = useState<string>('');
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  // 既存データの読み込み
  useEffect(() => {
    const loadCharacterData = async () => {
      try {
        setIsLoading(true);
        const adminToken = localStorage.getItem('adminAccessToken');
        
        // モデル情報を並行して取得
        const modelPromise = fetch('/api/admin/models', {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        // 基本キャラクター情報を取得
        const characterResponse = await fetch(`${API_BASE_URL}/api/characters/${characterId}`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (characterResponse.ok) {
          const character = await characterResponse.json();
          console.log('✅ キャラクターデータを取得しました:', character);
          console.log('🔍 取得した価格情報:', character.purchasePrice);
          
          // 既存のギャラリー画像を変換
          const existingGalleryImages = character.galleryImages ? character.galleryImages.map((img: any) => ({
            file: null, // 既存画像はFileオブジェクトではない
            imageUrl: img.url,
            unlockLevel: img.unlockLevel,
            title: img.title?.ja || '',
            description: img.description?.ja || ''
          })) : [];

          // 基本情報をフォームに反映
          console.log('🔍 画像URL取得状況:');
          console.log('  imageCharacterSelect:', character.imageCharacterSelect);
          console.log('  imageDashboard:', character.imageDashboard);
          console.log('  imageChatBackground:', character.imageChatBackground);
          console.log('  imageChatAvatar:', character.imageChatAvatar);
          
          setFormData(prev => ({
            ...prev,
            personalityPreset: character.personalityPreset || '',
            personalityTags: character.personalityTags || [],
            gender: character.gender || 'female',
            age: character.age || '',
            occupation: character.occupation || '',
            model: character.model || character.aiModel || 'o4-mini',
            characterAccessType: character.characterAccessType || 'free',
            stripeProductId: character.stripeProductId || '',
            purchasePrice: character.purchasePrice || 0,
            isActive: character.isActive || false,
            
            // 既存の画像URLを設定
            imageCharacterSelectUrl: character.imageCharacterSelect || '',
            imageDashboardUrl: character.imageDashboard || '',
            imageChatBackgroundUrl: character.imageChatBackground || '',
            imageChatAvatarUrl: character.imageChatAvatar || '',
            
            // 既存のギャラリー画像を設定
            galleryImages: existingGalleryImages
          }));
          
          console.log('🔄 FormDataに設定された画像URL:');
          console.log('  imageCharacterSelectUrl:', character.imageCharacterSelect || '');
          console.log('  imageDashboardUrl:', character.imageDashboard || '');
          console.log('  imageChatBackgroundUrl:', character.imageChatBackground || '');
          console.log('  imageChatAvatarUrl:', character.imageChatAvatar || '');
          
          console.log('🔄 normalizeImageUrl適用後:');
          console.log('  imageCharacterSelect normalized:', normalizeImageUrl(character.imageCharacterSelect));
          console.log('  imageDashboard normalized:', normalizeImageUrl(character.imageDashboard));
          console.log('  imageChatBackground normalized:', normalizeImageUrl(character.imageChatBackground));
          console.log('  imageChatAvatar normalized:', normalizeImageUrl(character.imageChatAvatar));
          
          console.log('🔄 FormDataに設定した価格:', character.purchasePrice || 0);
          
          // 保存済み価格がある場合は価格情報表示エリアにも設定
          if (character.purchasePrice && character.purchasePrice > 0) {
            setPriceInfo({
              price: character.purchasePrice,
              currency: 'JPY'
            });
          }
        }
        
        // 翻訳データを取得
        try {
          const translationResponse = await fetch(`${API_BASE_URL}/api/characters/${characterId}/translations`, {
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          });
          if (translationResponse.ok) {
            const translationData = await translationResponse.json();
            setTranslationData(translationData);
            console.log('✅ 翻訳データを取得しました:', translationData);
          } else {
            console.warn('⚠️ 翻訳データの取得に失敗しました:', translationResponse.status);
          }
        } catch (translationErr) {
          console.error('❌ 翻訳データ取得エラー:', translationErr);
        }

        // モデル情報を取得
        try {
          const modelResponse = await modelPromise;
          if (modelResponse.ok) {
            const modelData = await modelResponse.json();
            const modelsForSelect = modelData.models.map((model: any) => ({
              value: model.id,
              label: model.name,
              description: model.description
            }));
            setAvailableModels(modelsForSelect);
            setCurrentSystemModel(modelData.currentModel);
            console.log('✅ モデル情報を取得しました:', modelData);
          }
        } catch (modelErr) {
          console.warn('⚠️ モデル情報の取得に失敗:', modelErr);
        }
      } catch (err) {
        console.error('データの読み込みに失敗しました:', err);
        error('読み込みエラー', 'キャラクターデータの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    if (characterId) {
      loadCharacterData();
    }
  }, [characterId, error]);

  const handleTranslationChange = (newTranslationData: any) => {
    setTranslationData(newTranslationData);
    // UI構築段階なので、リアルタイム保存は無効化
    // console.log('翻訳データ更新:', newTranslationData);
  };

  // 価格情報取得関数
  const handleFetchPrice = async () => {
    if (!formData.stripeProductId) return;
    
    setIsFetchingPrice(true);
    setPriceError('');
    setPriceInfo(null);
    
    try {
      const adminToken = localStorage.getItem('adminAccessToken');
      if (!adminToken) {
        setPriceError('管理者認証が必要です');
        error('認証エラー', '管理者認証が必要です');
        return;
      }

      console.log('🔍 価格取得リクエスト:', formData.stripeProductId);
      
      const response = await fetch(`/api/admin/stripe/product-price/${formData.stripeProductId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 価格取得レスポンス状態:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ 価格取得成功:', data);
        setPriceInfo(data);
        
        // 価格情報をformDataに保存（これが永続化される）
        setFormData(prev => ({
          ...prev,
          purchasePrice: data.price
        }));
        
        success('価格取得成功', `価格情報を取得しました: ¥${data.price.toLocaleString()}`);
      } else {
        const errorData = await response.json();
        console.error('❌ 価格取得失敗:', errorData);
        setPriceError(errorData.message || '価格情報の取得に失敗しました');
        error('価格取得エラー', errorData.message || '価格情報の取得に失敗しました');
      }
    } catch (err) {
      console.error('❌ 価格取得例外エラー:', err);
      setPriceError(`ネットワークエラー: ${err instanceof Error ? err.message : '不明なエラー'}`);
      error('価格取得エラー', 'ネットワークまたはサーバーエラーが発生しました');
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      
      const adminToken = localStorage.getItem('adminAccessToken');
      
      // 1. 翻訳データを保存
      console.log('🔍 Sending translation data:', translationData);
      const translationSaveResponse = await fetch(`${API_BASE_URL}/api/characters/${characterId}/translations`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(translationData)
      });
      
      if (!translationSaveResponse.ok) {
        const errorData = await translationSaveResponse.json();
        console.error('❌ 翻訳データ保存エラー:', errorData);
        console.error('❌ Response status:', translationSaveResponse.status);
        console.error('❌ Response headers:', translationSaveResponse.headers);
        error('翻訳データ保存エラー', errorData.message || '翻訳データの更新に失敗しました');
        return;
      }
      
      // 2. 基本情報とギャラリー画像を保存
      const galleryImagesForSave = formData.galleryImages
        .filter(item => item.imageUrl) // 画像URLがあるもの（新規・既存問わず）
        .map(item => ({
          url: item.imageUrl,
          unlockLevel: item.unlockLevel,
          title: { 
            ja: item.title || `レベル${item.unlockLevel}解放画像`, 
            en: item.title || `Level ${item.unlockLevel} Unlock Image`
          },
          description: { 
            ja: item.description || '親密度解放画像です', 
            en: item.description || 'Affinity unlock image'
          },
          rarity: 'common' as const, // デフォルト値
          tags: [], // デフォルト値
          isDefault: false,
          order: item.unlockLevel / 10 - 1 // インデックスとして使用
        }));

      const basicData = {
        personalityPreset: formData.personalityPreset,
        personalityTags: formData.personalityTags,
        gender: formData.gender,
        age: formData.age,
        occupation: formData.occupation,
        aiModel: formData.model,
        characterAccessType: formData.characterAccessType,
        stripeProductId: formData.stripeProductId,
        purchasePrice: formData.purchasePrice,
        isActive: formData.isActive,
        galleryImages: galleryImagesForSave,
        // 画像URL情報を含める
        imageCharacterSelect: formData.imageCharacterSelectUrl,
        imageDashboard: formData.imageDashboardUrl,
        imageChatBackground: formData.imageChatBackgroundUrl,
        imageChatAvatar: formData.imageChatAvatarUrl
      };
      
      console.log('🔍 保存するbasicData:', basicData);
      console.log('🔍 フォームの画像URL状態:');
      console.log('  imageCharacterSelectUrl:', formData.imageCharacterSelectUrl);
      console.log('  imageDashboardUrl:', formData.imageDashboardUrl);
      console.log('  imageChatBackgroundUrl:', formData.imageChatBackgroundUrl);
      console.log('  imageChatAvatarUrl:', formData.imageChatAvatarUrl);
      
      const basicSaveResponse = await fetch(`${API_BASE_URL}/api/characters/${characterId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(basicData)
      });
      
      if (basicSaveResponse.ok) {
        console.log('✅ 基本情報、翻訳データ、ギャラリー画像を保存しました');
        const galleryCount = galleryImagesForSave.length;
        success('保存完了', `キャラクター情報を保存しました${galleryCount > 0 ? `（ギャラリー画像${galleryCount}枚を含む）` : ''}`);
      } else {
        const errorData = await basicSaveResponse.json();
        console.error('❌ 基本情報保存エラー:', errorData);
        error('基本情報保存エラー', errorData.message || '基本情報の保存に失敗しました');
      }
    } catch (err) {
      console.error('❌ 保存処理中にエラーが発生しました:', err);
      error('保存エラー', '保存処理中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
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
      if (file.size > 10 * 1024 * 1024) { // 10MB制限（圧縮で対応）
        error('ファイルエラー', '画像ファイルは10MB以下にしてください。自動で圧縮されます。');
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
    e.target.value = '';
  };

  const handleCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    try {
      if (!cropperImageSrc || !croppedAreaPixels || !currentImageType) {
        return;
      }
      
      setIsUploading(true);
      
      const croppedImage = await getCroppedImg(cropperImageSrc, croppedAreaPixels);
      let croppedFile = new File([croppedImage], `${currentImageType}.png`, {
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
      
      // 画像サイズが500KB以上の場合は圧縮
      if (!isImageSizeValid(croppedFile, 500)) {
        console.log(`🔄 画像を圧縮中... 元サイズ: ${formatFileSize(croppedFile.size)}`);
        croppedFile = await compressImage(croppedFile, {
          maxWidth: 800,
          maxHeight: 800,
          quality: 0.8,
          maxSizeKB: 500
        });
        console.log(`✅ 圧縮完了: ${formatFileSize(croppedFile.size)}`);
      }
      
      // バックエンドに画像をアップロード
      const formDataForUpload = new FormData();
      formDataForUpload.append('image', croppedFile);
      
      const adminToken = localStorage.getItem('adminAccessToken');
      if (!adminToken) {
        error('認証エラー', '管理者トークンが見つかりません。再ログインしてください。');
        return;
      }
      
      const uploadResponse = await fetch(`${API_BASE_URL}/api/characters/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        body: formDataForUpload
      });
      
      if (!uploadResponse.ok) {
        let errorMessage = '画像のアップロードに失敗しました';
        
        if (uploadResponse.status === 413) {
          errorMessage = 'ファイルサイズが大きすぎます。画像をさらに圧縮してお試しください。';
        } else {
          try {
            const errorData = await uploadResponse.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            console.error('Error response parsing failed:', e);
            errorMessage = `サーバーエラー (${uploadResponse.status}): ${uploadResponse.statusText}`;
          }
        }
        
        console.error('Upload failed:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          fileSize: formatFileSize(croppedFile.size)
        });
        error('アップロードエラー', errorMessage);
        return;
      }
      
      const uploadResult = await uploadResponse.json();
      const imageUrl = uploadResult.imageUrl;
      
      if (currentImageType === 'gallery' && currentGalleryIndex >= 0) {
        // ギャラリー画像の場合
        const unlockLevel = (currentGalleryIndex + 1) * 10;
        const newGalleryImages = [...formData.galleryImages];
        const existingIndex = newGalleryImages.findIndex(item => item.unlockLevel === unlockLevel);
        
        if (existingIndex >= 0) {
          newGalleryImages[existingIndex].file = croppedFile;
          newGalleryImages[existingIndex].imageUrl = imageUrl;
        } else {
          newGalleryImages.push({
            file: croppedFile,
            imageUrl: imageUrl,
            unlockLevel: unlockLevel,
            title: '',
            description: ''
          });
        }
        setFormData(prev => ({ ...prev, galleryImages: newGalleryImages }));
        success('ギャラリー画像アップロード', 'ギャラリー画像がアップロードされました');
      } else {
        // その他の画像の場合 - キャラクターデータに直接保存
        const imageFieldMap: Record<string, string> = {
          'imageCharacterSelect': 'imageCharacterSelect',
          'imageDashboard': 'imageDashboard',
          'imageChatBackground': 'imageChatBackground',
          'imageChatAvatar': 'imageChatAvatar'
        };
        
        const updateField = imageFieldMap[currentImageType];
        if (updateField) {
          // キャラクターデータを即座に更新
          const updateResponse = await fetch(`${API_BASE_URL}/api/characters/${characterId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              [updateField]: imageUrl
            })
          });
          
          if (updateResponse.ok) {
            setFormData(prev => ({ 
              ...prev, 
              [currentImageType]: croppedFile,
              [`${currentImageType}Url`]: imageUrl
            }));
            success('画像アップロード', '画像がアップロードされ、キャラクターデータに保存されました');
          } else {
            const errorData = await updateResponse.json();
            console.error('Character update failed:', errorData);
            error('保存エラー', errorData.message || 'キャラクターデータの更新に失敗しました');
            return;
          }
        }
      }
      
      setShowCropper(false);
      setCurrentImageType('');
      setCurrentGalleryIndex(-1);
    } catch (err) {
      console.error('Crop and upload failed:', err);
      error('画像エラー', '画像の処理またはアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropperImageSrc('');
    setCroppedAreaPixels(null);
    setCurrentImageType('');
    setCurrentGalleryIndex(-1);
  };

  const removeImage = (imageType: string, unlockLevel?: number) => {
    if (imageType === 'gallery' && unlockLevel !== undefined) {
      const newGalleryImages = formData.galleryImages.filter(item => item.unlockLevel !== unlockLevel);
      setFormData(prev => ({ ...prev, galleryImages: newGalleryImages }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [imageType]: null,
        [`${imageType}Url`]: ''
      }));
    }
  };

  const updateGalleryInfo = (unlockLevel: number, field: 'title' | 'description', value: string) => {
    const newGalleryImages = [...formData.galleryImages];
    const existingIndex = newGalleryImages.findIndex(item => item.unlockLevel === unlockLevel);
    
    if (existingIndex >= 0) {
      newGalleryImages[existingIndex][field] = value;
    } else {
      // 新しいアイテムを作成
      newGalleryImages.push({
        file: new File([], ''),
        imageUrl: '',
        unlockLevel,
        title: field === 'title' ? value : '',
        description: field === 'description' ? value : ''
      });
    }
    setFormData(prev => ({ ...prev, galleryImages: newGalleryImages }));
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col [&_input]:text-gray-900 [&_textarea]:text-gray-900 [&_select]:text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCancel}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">キャラクター編集</h1>
              <p className="text-sm text-gray-500 mt-1">
                キャラクター情報の編集・管理
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 翻訳管理（既存機能を保持） */}
            <TranslationEditor
              data={translationData}
              onChange={handleTranslationChange}
            />
            
            {/* 基本設定 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">基本設定</h3>
              
              {/* キャラクター基本情報 */}
              <div className="mb-8">
                <h4 className="text-md font-medium text-gray-800 mb-4 border-b border-gray-200 pb-2">キャラクター情報</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      性別
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
                      placeholder="例: 18歳、20代前半"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">キャラクターを公開する</span>
                    </label>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    職業・設定
                  </label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
                    placeholder="例: 学生、OL、お嬢様"
                  />
                </div>
              </div>

              {/* アクセス設定 */}
              <div>
                <h4 className="text-md font-medium text-gray-800 mb-4 border-b border-gray-200 pb-2">アクセス・課金設定</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        アクセスタイプ
                      </label>
                      <select
                        value={formData.characterAccessType}
                        onChange={(e) => setFormData({ ...formData, characterAccessType: e.target.value as 'free' | 'purchaseOnly' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
                      >
                        {ACCESS_TYPES.map(type => (
                          <option key={type.value} value={type.value} className="text-gray-900">
                            {getLocalizedLabel(type, 'ja')} - {getLocalizedDescription(type, 'ja')}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.characterAccessType === 'purchaseOnly' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          購入価格
                        </label>
                        <div className="flex space-x-2">
                          <div className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                            {formData.purchasePrice > 0 ? `¥${formData.purchasePrice.toLocaleString()}` : '未設定'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {formData.characterAccessType === 'purchaseOnly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stripe価格ID
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={formData.stripeProductId}
                          onChange={(e) => setFormData({ ...formData, stripeProductId: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
                          placeholder="price_xxxxxxxxx または prod_xxxxxxxxx"
                        />
                        <button
                          type="button"
                          onClick={handleFetchPrice}
                          disabled={!formData.stripeProductId || isFetchingPrice}
                          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {isFetchingPrice ? '取得中...' : '価格取得'}
                        </button>
                      </div>
                      {priceError && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">{priceError}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 性格・特徴設定 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">性格・特徴設定</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    性格プリセット
                  </label>
                  <select
                    value={formData.personalityPreset}
                    onChange={(e) => setFormData({ ...formData, personalityPreset: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
                  >
                    <option value="" className="text-gray-500">プリセットを選択してください</option>
                    {PERSONALITY_PRESETS.map(preset => (
                      <option key={preset.value} value={preset.value} className="text-gray-900">
                        {getLocalizedLabel(preset, 'ja')} - {getLocalizedDescription(preset, 'ja')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    性格タグ
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
                </div>
              </div>
            </div>

            {/* AI設定 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI設定</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AIモデル
                  </label>
                  <select
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
                  >
                    {availableModels.map(model => (
                      <option key={model.value} value={model.value} className="text-gray-900">
                        {model.label} - {model.description}
                        {model.value === currentSystemModel ? ' (システム推奨)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

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
                    {formData.imageCharacterSelect || formData.imageCharacterSelectUrl ? (
                      <div className="space-y-2">
                        <div className="w-20 h-20 mx-auto bg-transparent border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          <Image 
                            src={formData.imageCharacterSelect 
                              ? URL.createObjectURL(formData.imageCharacterSelect) 
                              : (formData.imageCharacterSelectUrl || '/images/default-character.png')
                            } 
                            alt="キャラクター選択" 
                            width={80}
                            height={80}
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
                    {formData.imageDashboard || formData.imageDashboardUrl ? (
                      <div className="space-y-2">
                        <div className="w-20 h-20 mx-auto bg-transparent border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          <Image 
                            src={formData.imageDashboard 
                              ? URL.createObjectURL(formData.imageDashboard) 
                              : (formData.imageDashboardUrl || '/images/default-character.png')
                            } 
                            alt="ダッシュボード" 
                            width={80}
                            height={80}
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
                    {formData.imageChatBackground || formData.imageChatBackgroundUrl ? (
                      <div className="space-y-2">
                        <div className="w-20 h-20 mx-auto bg-transparent border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          <Image 
                            src={formData.imageChatBackground 
                              ? URL.createObjectURL(formData.imageChatBackground) 
                              : (formData.imageChatBackgroundUrl || '/images/default-character.png')
                            } 
                            alt="チャット背景" 
                            width={80}
                            height={80}
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
                    {formData.imageChatAvatar || formData.imageChatAvatarUrl ? (
                      <div className="space-y-2">
                        <div className="w-20 h-20 mx-auto bg-transparent border border-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                          <Image 
                            src={formData.imageChatAvatar 
                              ? URL.createObjectURL(formData.imageChatAvatar) 
                              : (formData.imageChatAvatarUrl || '/images/default-character.png')
                            } 
                            alt="チャットアバター" 
                            width={80}
                            height={80}
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


            {/* ギャラリー画像（親密度解放用） */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ギャラリー画像（親密度解放用）</h3>
              <p className="text-sm text-gray-600 mb-6">
                親密度レベルに応じて解放される画像を設定します。最大10枚まで登録可能です。
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 10 }, (_, index) => {
                  const unlockLevel = (index + 1) * 10;
                  const galleryItem = formData.galleryImages?.find(item => item.unlockLevel === unlockLevel);
                  
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
                            <Image 
                              src={URL.createObjectURL(galleryItem.file)} 
                              alt={`ギャラリー ${index + 1}`} 
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          ) : galleryItem?.imageUrl ? (
                            <Image 
                              src={galleryItem.imageUrl || '/images/default-character.png'} 
                              alt={`ギャラリー ${index + 1}`} 
                              width={64}
                              height={64}
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
                            {(galleryItem?.file || galleryItem?.imageUrl) && (
                              <button
                                type="button"
                                onClick={() => removeImage('gallery', unlockLevel)}
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
                              onChange={(e) => updateGalleryInfo(unlockLevel, 'title', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
                              placeholder="画像タイトル"
                            />
                          </div>
                          
                          <div>
                            <textarea
                              value={galleryItem?.description || ''}
                              onChange={(e) => updateGalleryInfo(unlockLevel, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
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

            {/* フッター */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center space-x-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                <span>キャンセル</span>
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <Save className="w-4 h-4" />
                <span>{isSaving ? '保存中...' : '保存'}</span>
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
          isLoading={isUploading}
          imageType={currentImageType}
        />
      )}
    </div>
  );
}