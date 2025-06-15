/**
 * 画像圧縮ユーティリティ
 * 本番環境でのファイルサイズ制限に対応
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

/**
 * 画像ファイルを圧縮する
 * @param file 元の画像ファイル
 * @param options 圧縮オプション
 * @returns 圧縮された画像ファイル
 */
export const compressImage = async (
  file: File, 
  options: CompressionOptions = {}
): Promise<File> => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    maxSizeKB = 500 // 500KB制限
  } = options;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 元の画像サイズ
      let { width, height } = img;
      
      // アスペクト比を保持しながらリサイズ
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // 画像を描画
      ctx?.drawImage(img, 0, 0, width, height);

      // 品質を段階的に下げて目標サイズ以下にする
      let currentQuality = quality;
      const compressStep = () => {
        canvas.toBlob((blob) => {
          if (!blob) {
            // フォールバック: 元のファイルを返す
            resolve(file);
            return;
          }

          const sizeKB = blob.size / 1024;
          
          if (sizeKB <= maxSizeKB || currentQuality <= 0.1) {
            // 目標サイズ以下 or 最低品質に到達
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            // まだ大きい場合は品質を下げて再試行
            currentQuality -= 0.1;
            compressStep();
          }
        }, 'image/jpeg', currentQuality);
      };

      compressStep();
    };

    img.onerror = () => {
      // エラー時は元のファイルを返す
      resolve(file);
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * 画像ファイルのサイズをチェック
 * @param file ファイル
 * @param maxSizeKB 最大サイズ（KB）
 * @returns サイズが制限内かどうか
 */
export const isImageSizeValid = (file: File, maxSizeKB: number = 500): boolean => {
  return (file.size / 1024) <= maxSizeKB;
};

/**
 * ファイルサイズを人間が読みやすい形式で表示
 * @param bytes バイト数
 * @returns フォーマットされた文字列
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};