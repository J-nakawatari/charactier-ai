import Sidebar from '@/components/admin/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <main className="lg:ml-64 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {children}
      </main>
    </>
  );
}