/**
 * Google Analytics設定をサーバーサイドで取得
 */

interface GoogleAnalyticsSettings {
  measurementId: string;
  isActive: boolean;
}

/**
 * サーバーサイドでGoogle Analytics設定を取得
 * @returns GA測定ID（無効な場合はnull）
 */
export async function getActiveGAId(): Promise<string | null> {
  try {
    // ビルド時は常にnullを返す（静的生成を妨げないため）
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      // サーバーサイドでのビルド時はnullを返す
      // クライアントサイドでGA設定を取得
      return null;
    }

    // 開発環境またはランタイムでは動的に取得
    const apiUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${apiUrl}/api/v1/system-settings/google-analytics`, {
      // ビルド時のエラーを防ぐため、キャッシュ設定を削除
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // エラー時は静かに処理
      return null;
    }

    const data = await response.json();
    
    // 設定が有効で測定IDが存在する場合のみ返す
    if (data.isActive && data.settings?.measurementId) {
      return data.settings.measurementId;
    }

    return null;
  } catch (error) {
    // すべてのエラーを静かに処理
    return null;
  }
}