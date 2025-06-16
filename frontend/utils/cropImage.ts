interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob> => {
  console.log('🔍 getCroppedImg: 開始');
  console.log('🔍 imageSrc type:', typeof imageSrc);
  console.log('🔍 imageSrc format:', imageSrc.startsWith('data:') ? imageSrc.substring(0, 50) + '...' : imageSrc);
  
  const image = await createImage(imageSrc);
  console.log('🔍 Image loaded:', {
    width: image.width,
    height: image.height,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    src: image.src.substring(0, 50) + '...'
  });
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: true }); // アルファチャンネルを明示的に有効化

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  console.log('🔍 Canvas context created with alpha:', ctx.getContextAttributes());

  // Canvas全体を透明にクリア
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  console.log('🔍 Canvas size set:', { width: canvas.width, height: canvas.height });
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 透過情報を保持するためのコンポジット設定
  ctx.globalCompositeOperation = 'source-over';
  console.log('🔍 globalCompositeOperation set to:', ctx.globalCompositeOperation);

  // 回転が必要な場合の処理
  if (rotation !== 0) {
    ctx.save();
    ctx.translate(pixelCrop.width / 2, pixelCrop.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-pixelCrop.width / 2, -pixelCrop.height / 2);
  }

  console.log('🔍 pixelCrop:', pixelCrop);

  // 直接クロップされた領域を描画
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  console.log('🔍 drawImage completed');

  if (rotation !== 0) {
    ctx.restore();
  }

  // Canvas の ImageData を確認してアルファチャンネルをチェック
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let hasAlpha = false;
  let totalPixels = 0;
  let transparentPixels = 0;
  
  for (let i = 3; i < data.length; i += 4) {
    totalPixels++;
    if (data[i] < 255) {
      hasAlpha = true;
      if (data[i] === 0) {
        transparentPixels++;
      }
    }
  }
  
  console.log('🔍 Canvas ImageData analysis:', {
    width: imageData.width,
    height: imageData.height,
    totalPixels,
    transparentPixels,
    hasAlpha,
    alphaRatio: transparentPixels / totalPixels
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        console.log('🔍 Blob created:', {
          size: blob.size,
          type: blob.type
        });
        
        // Blob の内容をチェック（データURLとして）
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          console.log('🔍 Blob as DataURL:', {
            starts: dataUrl.substring(0, 50) + '...',
            type: dataUrl.split(';')[0],
            length: dataUrl.length
          });
        };
        reader.readAsDataURL(blob);
        
        resolve(blob);
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/png', 1.0); // PNG形式で最高品質、透過情報保持
  });
};