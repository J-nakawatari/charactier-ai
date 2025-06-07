import Sidebar from '@/components/admin/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <div className="flex">
          <Sidebar />
          <main className="ml-64 flex-1 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}