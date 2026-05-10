import { Navbar } from '@/components/layout/navbar';
import { ClientSidebar } from '@/components/layout/client-sidebar';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';

interface Props {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <ClientSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}