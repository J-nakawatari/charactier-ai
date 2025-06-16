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

  console.log('🔍 compressImage: 開始', {
    fileName: file.name,
    fileType: file.type,
    fileSize: Math.round(file.size / 1024) + 'KB'
  });

  // PNG画像で透過の可能性がある場合は、圧縮を軽くするか避ける
  const isPng = file.type === 'image/png';
  const shouldPreserveAlpha = isPng;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: shouldPreserveAlpha });
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

      // Canvas を透明にクリア（PNG の場合）
      if (shouldPreserveAlpha) {
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }

      // 画像を描画
      ctx?.drawImage(img, 0, 0, width, height);

      console.log('🔍 compressImage: Canvas準備完了', {
        canvasSize: `${width}x${height}`,
        shouldPreserveAlpha,
        contextAlpha: ctx?.getContextAttributes()?.alpha
      });

      // PNG の場合は透過を保持、JPEG の場合は従来通り
      if (shouldPreserveAlpha) {
        // PNG: 透過を保持したまま圧縮
        canvas.toBlob((blob) => {
          if (!blob) {
            console.log('🔍 compressImage: PNG Blob作成失敗、元ファイルを返す');
            resolve(file);
            return;
          }

          const sizeKB = blob.size / 1024;
          console.log('🔍 compressImage: PNG圧縮完了', {
            originalSize: Math.round(file.size / 1024) + 'KB',
            compressedSize: Math.round(sizeKB) + 'KB',
            compressionRatio: Math.round((1 - blob.size / file.size) * 100) + '%'
          });

          const compressedFile = new File([blob], file.name, {
            type: 'image/png',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, 'image/png', 1.0); // PNG は品質パラメータ不要、最高品質で出力
        
      } else {
        // JPEG: 従来通りの圧縮
        let currentQuality = quality;
        const compressStep = () => {
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const sizeKB = blob.size / 1024;
            
            if (sizeKB <= maxSizeKB || currentQuality <= 0.1) {
              console.log('🔍 compressImage: JPEG圧縮完了', {
                originalSize: Math.round(file.size / 1024) + 'KB',
                compressedSize: Math.round(sizeKB) + 'KB',
                quality: currentQuality
              });
              
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
      }
    };

    img.onerror = () => {
      console.log('🔍 compressImage: 画像読み込みエラー、元ファイルを返す');
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