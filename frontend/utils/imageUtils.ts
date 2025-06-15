/**
 * 画像URL関連のユーティリティ関数
 */

/**
 * 画像URLを正規化して絶対URLに変換
 * @param imageUrl 画像URL（相対パスまたは絶対URL）
 * @returns 正規化された絶対URL
 */
export const normalizeImageUrl = (imageUrl: string | undefined | null): string | null => {
  if (!imageUrl) return null;
  
  // 既に絶対URLの場合はそのまま返す
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // 相対パスの場合は絶対URLに変換
  if (imageUrl.startsWith('/uploads/')) {
    // 本番環境かローカル環境かを判定
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_API_URL || 'https://charactier-ai.com';
    
    return `${baseUrl}${imageUrl}`;
  }
  
  // uploads/ で始まる場合（先頭スラッシュなし）
  if (imageUrl.startsWith('uploads/')) {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_API_URL || 'https://charactier-ai.com';
    
    return `${baseUrl}/${imageUrl}`;
  }
  
  return imageUrl;
};

/**
 * 画像が有効かどうかをチェック
 * @param imageUrl 画像URL
 * @returns 有効な画像URLかどうか
 */
export const isValidImageUrl = (imageUrl: string | undefined | null): boolean => {
  if (!imageUrl) return false;
  
  const normalized = normalizeImageUrl(imageUrl);
  if (!normalized) return false;
  
  // 画像ファイルの拡張子をチェック
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const lowercaseUrl = normalized.toLowerCase();
  
  return imageExtensions.some(ext => lowercaseUrl.includes(ext));
};

/**
 * フォールバック画像URLを取得
 * @param characterName キャラクター名
 * @returns フォールバック画像URL
 */
export const getFallbackImageUrl = (characterName?: string): string => {
  // TODO: デフォルト画像のパスを設定
  return '/images/default-character.png';
};

/**
 * Next.js Image コンポーネント用の安全な画像URLを取得
 * @param imageUrl 元の画像URL
 * @param characterName キャラクター名（フォールバック用）
 * @returns 安全な画像URL
 */
export const getSafeImageUrl = (
  imageUrl: string | undefined | null, 
  characterName?: string
): string => {
  const normalized = normalizeImageUrl(imageUrl);
  
  if (normalized && isValidImageUrl(normalized)) {
    return normalized;
  }
  
  return getFallbackImageUrl(characterName);
};