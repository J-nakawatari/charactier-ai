'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Save, X, RotateCw } from 'lucide-react';

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
  onCancel: () => void;
  onSave: () => void;
  isLoading?: boolean;
  imageType?: string; // 画像タイプを追加
}

export default function ImageCropper({ 
  imageSrc, 
  onCropComplete, 
  onCancel, 
  onSave,
  isLoading = false,
  imageType = ''
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // 画像タイプに応じて形状とアスペクト比を決定
  const getCropSettings = (type: string) => {
    switch (type) {
      case 'imageCharacterSelect':
      case 'imageDashboard':
        return { shape: 'rect' as const, aspect: 1, label: '正方形' }; // 四角形（正方形）
      case 'imageChatBackground':
        return { shape: 'rect' as const, aspect: 9/16, label: '9:16（縦長）' }; // 四角形（9:16 縦長）
      case 'imageChatAvatar':
        return { shape: 'round' as const, aspect: 1, label: '円形' }; // 円形
      default:
        return { shape: 'rect' as const, aspect: 1, label: '正方形' }; // デフォルト
    }
  };

  const cropSettings = getCropSettings(imageType);

  const onCropCompleteHandler = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      onCropComplete(croppedArea, croppedAreaPixels);
    },
    [onCropComplete]
  );

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">画像をトリミング</h3>
            <p className="text-sm text-gray-500 mt-1">形状: {cropSettings.label}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRotate}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="90度回転"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* クロッパー */}
        <div className="flex-1 relative min-h-96 h-96 md:h-[500px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={cropSettings.aspect}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            cropShape={cropSettings.shape}
            showGrid={cropSettings.shape === 'rect'}
            style={{
              containerStyle: {
                background: 'transparent',
              },
            }}
          />
        </div>

        {/* コントロール */}
        <div className="p-4 border-t border-gray-200 space-y-4">
          {/* ズームスライダー */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ズーム: {Math.round(zoom * 100)}%
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* 回転スライダー */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              回転: {rotation}度
            </label>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* ボタン */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              <span>キャンセル</span>
            </button>
            
            <button
              onClick={onSave}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'アップロード中...' : '保存'}</span>
            </button>
          </div>
        </div>

        {/* 使い方ガイド */}
        <div className="px-4 pb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              💡 <strong>使い方:</strong> ドラッグで位置調整、ピンチ/スライダーでズーム、回転ボタンで向きを調整できます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}