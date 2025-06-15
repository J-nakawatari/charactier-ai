// 中央集権型ルート管理システム - 重複を物理的に不可能にする

import { Express, RequestHandler } from 'express';

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type RouteKey = `${HTTPMethod}:${string}`;

class RouteRegistry {
  private static instance: RouteRegistry;
  private registeredRoutes = new Map<RouteKey, string>();
  private app: Express | null = null;

  private constructor() {}

  static getInstance(): RouteRegistry {
    if (!RouteRegistry.instance) {
      RouteRegistry.instance = new RouteRegistry();
    }
    return RouteRegistry.instance;
  }

  setApp(app: Express): void {
    this.app = app;
  }

  /**
   * APIルートを定義 - 重複は物理的に不可能
   */
  define(
    method: HTTPMethod,
    path: string,
    ...handlers: RequestHandler[]
  ): void {
    if (!this.app) {
      throw new Error('Express app not initialized. Call setApp() first.');
    }

    const routeKey: RouteKey = `${method}:${path}`;
    const caller = this.getCaller();

    // 重複チェック
    if (this.registeredRoutes.has(routeKey)) {
      const existingFile = this.registeredRoutes.get(routeKey);
      throw new Error(
        `🔴 APIルート重複エラー: ${method} ${path}\n` +
        `既存: ${existingFile}\n` +
        `新規: ${caller}\n` +
        `同じAPIパスは一度しか定義できません。`
      );
    }

    // 登録
    this.registeredRoutes.set(routeKey, caller);
    
    // Expressに実際に登録
    switch (method) {
      case 'GET':
        this.app.get(path, ...handlers);
        break;
      case 'POST':
        this.app.post(path, ...handlers);
        break;
      case 'PUT':
        this.app.put(path, ...handlers);
        break;
      case 'DELETE':
        this.app.delete(path, ...handlers);
        break;
    }

    console.log(`✅ Route registered: ${method} ${path} (${caller})`);
  }

  /**
   * ルータをマウント - 重複チェック付き
   */
  mount(path: string, router: any): void {
    if (!this.app) {
      throw new Error('Express app not initialized. Call setApp() first.');
    }

    const mountKey: RouteKey = `MOUNT:${path}` as RouteKey;
    const caller = this.getCaller();

    if (this.registeredRoutes.has(mountKey)) {
      const existingFile = this.registeredRoutes.get(mountKey);
      throw new Error(
        `🔴 マウントパス重複エラー: ${path}\n` +
        `既存: ${existingFile}\n` +
        `新規: ${caller}\n` +
        `同じマウントパスは一度しか使用できません。`
      );
    }

    this.registeredRoutes.set(mountKey, caller);
    this.app.use(path, router);
    
    console.log(`✅ Router mounted: ${path} (${caller})`);
  }

  /**
   * 登録済みルート一覧を取得
   */
  getRegisteredRoutes(): Array<{ route: string; file: string }> {
    return Array.from(this.registeredRoutes.entries()).map(([route, file]) => ({
      route,
      file
    }));
  }

  /**
   * 呼び出し元ファイルを特定
   */
  private getCaller(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';
    
    const lines = stack.split('\n');
    // スタックトレースから適切な行を見つける
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('.ts:') || line.includes('.js:')) {
        const match = line.match(/\((.+):(\d+):(\d+)\)/);
        if (match) {
          return match[1].split('/').pop() + ':' + match[2];
        }
      }
    }
    return 'unknown';
  }
}

export default RouteRegistry.getInstance();