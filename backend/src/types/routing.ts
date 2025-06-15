// APIルート重複を型レベルで防ぐ仕組み

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type APIPath = string;

// 既に定義されているAPIパスを型で管理
type ExistingRoutes = {
  '/api/auth/login': 'POST'
  '/api/auth/register': 'POST'
  '/api/user/dashboard': 'GET'  // routes/dashboard.js で定義済み
  '/api/user/profile': 'PUT'
  '/api/user/select-character': 'POST'
  '/api/characters': 'GET'
  '/api/admin/users/:id': 'GET' | 'PUT' | 'DELETE'
  // 新しいルートを追加する時は、ここに必ず追加が必要
}

// 重複チェック用の型
type CheckDuplicate<T extends APIPath, M extends HTTPMethod> = 
  T extends keyof ExistingRoutes 
    ? ExistingRoutes[T] extends M 
      ? never  // 重複エラー
      : T
    : T

// APIルート定義用のヘルパー関数
export function defineRoute<P extends APIPath, M extends HTTPMethod>(
  path: CheckDuplicate<P, M>,
  method: M,
  handler: (req: any, res: any) => void
): { path: P; method: M; handler: typeof handler } {
  return { path: path as P, method, handler }
}

// 使用例：
// const userRoute = defineRoute('/api/user/dashboard', 'GET', handler)  // ← TypeScriptエラーになる
// const newRoute = defineRoute('/api/user/new-endpoint', 'POST', handler)  // ← OK