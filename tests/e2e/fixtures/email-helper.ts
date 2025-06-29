import axios from 'axios';

export class EmailHelper {
  private mailhogUrl: string;

  constructor() {
    this.mailhogUrl = process.env.MAILHOG_URL || 'http://localhost:8025';
  }

  // 最新のメールを取得
  async getLatestEmail(toEmail: string): Promise<any> {
    try {
      const response = await axios.get(`${this.mailhogUrl}/api/v2/messages`);
      const messages = response.data.items;
      
      // 指定されたメールアドレス宛の最新メールを探す
      const latestEmail = messages.find((msg: any) => 
        msg.To[0].Mailbox + '@' + msg.To[0].Domain === toEmail
      );
      
      return latestEmail;
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      return null;
    }
  }

  // メール内のリンクを抽出
  extractLinkFromEmail(email: any, pattern: RegExp): string | null {
    if (!email || !email.Content || !email.Content.Body) return null;
    
    const matches = email.Content.Body.match(pattern);
    return matches ? matches[1] : null;
  }

  // 認証リンクを取得
  async getVerificationLink(toEmail: string): Promise<string | null> {
    const email = await this.getLatestEmail(toEmail);
    if (!email) return null;
    
    // 認証リンクのパターン
    const linkPattern = /(https?:\/\/[^\s]+verify-email[^\s]+)/;
    return this.extractLinkFromEmail(email, linkPattern);
  }

  // メールボックスをクリア
  async clearMailbox(): Promise<void> {
    try {
      await axios.delete(`${this.mailhogUrl}/api/v1/messages`);
    } catch (error) {
      console.error('Failed to clear mailbox:', error);
    }
  }
}