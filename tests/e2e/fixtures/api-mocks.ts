import { Page, Route } from '@playwright/test';

export class APIMocks {
  constructor(private page: Page) {}

  // Stripe APIのモック
  async mockStripeAPI() {
    // Stripe Checkout Sessionの作成をモック
    await this.page.route('**/api/v1/stripe/create-checkout-session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: 'test_session_123',
          url: 'https://checkout.stripe.com/test_session_123'
        })
      });
    });

    // Stripeの外部ページをモック（実際にはローカルページにリダイレクト）
    await this.page.route('https://checkout.stripe.com/**', async (route) => {
      await route.fulfill({
        status: 302,
        headers: {
          'Location': '/ja/payment/success?session_id=test_session_123'
        }
      });
    });
  }

  // OpenAI APIのモック
  async mockOpenAIAPI() {
    await this.page.route('**/api/v1/chat/stream', async (route) => {
      const encoder = new TextEncoder();
      
      // Server-Sent Eventsのレスポンスをモック
      const messages = [
        'data: {"content": "こんにちは！"}\n\n',
        'data: {"content": "テスト用の返答です。"}\n\n',
        'data: {"content": "何かお手伝いできることはありますか？"}\n\n',
        'data: [DONE]\n\n'
      ];

      const body = messages.map(msg => encoder.encode(msg));
      const stream = new ReadableStream({
        async start(controller) {
          for (const chunk of body) {
            controller.enqueue(chunk);
            await new Promise(resolve => setTimeout(resolve, 100)); // 遅延を追加
          }
          controller.close();
        }
      });

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: stream as any
      });
    });
  }

  // 外部画像APIのモック
  async mockImageAPI() {
    // プレースホルダー画像を返す
    await this.page.route('**/api/v1/images/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64') // 1x1の透明PNG
      });
    });
  }

  // メール送信APIのモック
  async mockEmailAPI() {
    await this.page.route('**/api/v1/email/send', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          messageId: 'test_message_123'
        })
      });
    });
  }

  // すべての外部APIをモック
  async mockAllExternalAPIs() {
    await this.mockStripeAPI();
    await this.mockOpenAIAPI();
    await this.mockImageAPI();
    await this.mockEmailAPI();
  }

  // 特定のAPIエラーをシミュレート
  async simulateAPIError(urlPattern: string, statusCode: number = 500, message: string = 'Internal Server Error') {
    await this.page.route(urlPattern, async (route) => {
      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({
          error: message,
          code: `ERROR_${statusCode}`
        })
      });
    });
  }

  // ネットワーク遅延をシミュレート
  async simulateNetworkDelay(urlPattern: string, delayMs: number) {
    await this.page.route(urlPattern, async (route) => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      await route.continue();
    });
  }
}