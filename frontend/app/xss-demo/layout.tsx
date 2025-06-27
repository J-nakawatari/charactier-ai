import { notFound } from 'next/navigation';

export default function XSSDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 本番環境ではアクセスを拒否
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <>{children}</>;
}