/**
 * 共通UIコンポーネントスタイル定数
 * デザインシステムの基盤となるスタイルパターンを定義
 */

export const cardStyles = {
  // 基本カードコンテナ
  container: "bg-white rounded-xl border border-gray-200 p-6 shadow-sm",
  
  // ホバー効果付きカード
  hoverCard: "bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-shadow duration-200",
  
  // コンパクトカード
  compact: "bg-white rounded-lg border border-gray-200 p-4 shadow-sm",
  
  // カードヘッダー
  header: "border-b border-gray-200 pb-4 mb-4",
  
  // カードフッター
  footer: "border-t border-gray-200 pt-4 mt-4"
};

export const textStyles = {
  // 見出しスタイル
  heading: {
    h1: "text-2xl font-bold text-gray-900",
    h2: "text-xl font-semibold text-gray-900",
    h3: "text-lg font-semibold text-gray-900",
    h4: "text-base font-semibold text-gray-900"
  },
  
  // 本文テキスト
  body: {
    primary: "text-sm text-gray-900",
    secondary: "text-sm text-gray-600",
    muted: "text-sm text-gray-500"
  },
  
  // ラベル・キャプション
  label: {
    primary: "text-xs font-medium text-gray-500 uppercase tracking-wider",
    secondary: "text-xs text-gray-400"
  }
};

export const buttonStyles = {
  // プライマリボタン
  primary: "px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors",
  
  // セカンダリボタン
  secondary: "px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors",
  
  // 危険操作ボタン
  danger: "px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors",
  
  // アウトラインボタン
  outline: "px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors",
  
  // アイコンボタン
  icon: "p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors",
  
  // 小さなボタン
  small: "px-3 py-1 text-xs font-medium rounded-md transition-colors"
};

export const inputStyles = {
  // 基本入力フィールド
  base: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400",
  
  // エラー状態
  error: "w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-red-50",
  
  // 成功状態
  success: "w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-green-50",
  
  // 無効状態
  disabled: "w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-500 placeholder-gray-300 bg-gray-100 cursor-not-allowed"
};

export const badgeStyles = {
  // 基本バッジ
  base: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
  
  // ステータスバッジ
  status: {
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
    neutral: "bg-gray-100 text-gray-800"
  },
  
  // サイズ変種
  sizes: {
    sm: "px-2 py-1 text-xs",
    md: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm"
  }
};

export const tableStyles = {
  // テーブルコンテナ
  container: "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden",
  
  // テーブル本体
  table: "w-full min-w-full",
  
  // ヘッダー
  header: "bg-gray-50",
  headerCell: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
  
  // ボディ行
  row: "hover:bg-gray-50 transition-colors",
  cell: "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
  
  // アクション列
  actions: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
};

export const layoutStyles = {
  // ページコンテナ
  page: "min-h-screen bg-gray-50",
  
  // メインコンテンツエリア
  main: "max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8",
  
  // サイドバーレイアウト
  sidebar: {
    container: "flex h-screen bg-gray-100",
    sidebar: "w-64 bg-white shadow-lg",
    content: "flex-1 overflow-auto"
  },
  
  // グリッドレイアウト
  grid: {
    cols1: "grid grid-cols-1 gap-6",
    cols2: "grid grid-cols-1 md:grid-cols-2 gap-6",
    cols3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
    cols4: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
  }
};

export const loadingStyles = {
  // スピナー
  spinner: "animate-spin rounded-full border-2 border-gray-300 border-t-blue-500",
  
  // スケルトン
  skeleton: "animate-pulse bg-gray-200 rounded",
  
  // オーバーレイ
  overlay: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
};

// ユーティリティ関数：複数のスタイルを結合
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// レスポンシブ対応の共通パターン
export const responsiveStyles = {
  hide: {
    mobile: "hidden md:block",
    tablet: "hidden lg:block",
    desktop: "hidden xl:block"
  },
  show: {
    mobile: "block md:hidden",
    tablet: "block lg:hidden",
    desktop: "block xl:hidden"
  }
};