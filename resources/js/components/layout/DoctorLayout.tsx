import { Navbar } from '@/components/layout/navbar';
import { DoctorSidebar } from '@/components/layout/doctor-sidebar';
import { useAuth } from '@/hooks/use-auth';
import { AlertCircle } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Props {
  children: React.ReactNode;
}

export default function DoctorLayout({ children }: Props) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {user?.needsPasswordChange && (
        <div className="bg-amber-500 text-white px-4 py-2 text-sm font-bold text-center flex items-center justify-center gap-2 shadow-md relative z-50">
          <AlertCircle className="h-4 w-4" />
          Estás usando la contraseña predeterminada (cédula). Por tu seguridad, <Link href="/doctor/profile" className="underline hover:text-amber-100">actualízala ahora</Link>.
        </div>
      )}
      <Navbar />
      <div className="flex flex-1">
        <DoctorSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
