import Sidebar from '@/components/admin/Sidebar';
import { ToastProvider } from '@/contexts/ToastContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <Sidebar />
      <main className="ml-64 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {children}
      </main>
    </ToastProvider>
  );
}