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
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: true }); // アルファチャンネルを明示的に有効化

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Canvas全体を透明にクリア
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 透過情報を保持するためのコンポジット設定
  ctx.globalCompositeOperation = 'source-over';

  // 回転が必要な場合の処理
  if (rotation !== 0) {
    ctx.save();
    ctx.translate(pixelCrop.width / 2, pixelCrop.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-pixelCrop.width / 2, -pixelCrop.height / 2);
  }

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

  if (rotation !== 0) {
    ctx.restore();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/png', 1.0); // PNG形式で最高品質、透過情報保持
  });
};