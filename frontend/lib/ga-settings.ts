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
    // バックエンドAPIから設定を取得
    const apiUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${apiUrl}/api/system-settings/google-analytics`, {
      cache: 'no-store', // 常に最新の設定を取得
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch GA settings:', response.status);
      return null;
    }

    const data = await response.json();
    
    // 設定が有効で測定IDが存在する場合のみ返す
    if (data.isActive && data.settings?.measurementId) {
      return data.settings.measurementId;
    }

    return null;
  } catch (error) {
    console.error('Error fetching GA settings:', error);
    return null;
  }
}