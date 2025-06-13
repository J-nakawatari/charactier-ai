import { RedirectType, redirect } from 'next/navigation';

export default function AdminPage() {
  // 管理画面ルートにアクセスした場合、ログインページにリダイレクト
  redirect('/admin/login', RedirectType.replace);
}