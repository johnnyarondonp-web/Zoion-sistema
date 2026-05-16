import { memo, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import {
  LayoutDashboard, UserCircle, Calendar,
  Activity, Shield, Stethoscope, Settings,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  matchPrefixes?: string[];
}

interface SidebarSection {
  title: string;
  icon: React.ReactNode;
  color: string;
  items: SidebarItem[];
}

const doctorSections: SidebarSection[] = [
  {
    title: 'Principal',
    icon: <Shield className="h-3 w-3" />,
    color: 'text-emerald-500',
    items: [
      { label: 'Mi Agenda', href: '/doctor/agenda', icon: <Calendar className="h-4 w-4" />, matchPrefixes: ['/doctor/agenda'] },
    ],
  },
  {
    title: 'Médico',
    icon: <Stethoscope className="h-3 w-3" />,
    color: 'text-sky-500',
    items: [
      { label: 'Perfil', href: '/doctor/profile', icon: <UserCircle className="h-4 w-4" />, matchPrefixes: ['/doctor/profile'] },
    ],
  },
];

function getInitials(name: string | null | undefined): string {
  if (!name) return 'D';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
}

export const DoctorSidebar = memo(function DoctorSidebar() {
  const { url } = usePage();
  const { user } = useAuth();

  const isActive = useMemo(() => {
    return (item: SidebarItem) =>
      (item.matchPrefixes ?? [item.href]).some((prefix) => url.startsWith(prefix));
  }, [url]);

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-gray-200/80 dark:border-gray-700/60 bg-gradient-to-b from-gray-50/80 to-white dark:from-gray-900/80 dark:to-gray-950/80 backdrop-blur-sm">
      <div className="p-4 pb-3 border-b-2 border-gray-200/80 dark:border-gray-700/60">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white font-semibold text-sm shadow-md ring-2 ring-white dark:ring-gray-800">
            {getInitials(user?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {user?.name || 'Médico'}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold tracking-tight leading-tight mt-0.5">
              {user?.specialty || 'Veterinario Asignado'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {doctorSections.map((section, sectionIdx) => (
          <div key={section.title}>
            <div className="px-4 pt-4 pb-1.5 flex items-center gap-1.5">
              <span className={section.color}>{section.icon}</span>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {section.title}
              </p>
            </div>
            <nav className="flex flex-col gap-0.5 px-3 pb-2">
              {section.items.map((item) => {
                const active = isActive(item);
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => router.visit(item.href)}
                    className={cn(
                      'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 group',
                      active
                        ? 'text-sky-700 dark:text-sky-300'
                        : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-100'
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="doctorSidebarActive"
                        className="absolute inset-0 rounded-lg bg-gradient-to-r from-sky-50 via-sky-100/80 to-indigo-50 dark:from-sky-950/40 dark:via-sky-950/25 dark:to-indigo-950/20 shadow-sm"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span
                      className={cn(
                        'absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full transition-all duration-200 z-10',
                        active
                          ? 'bg-gradient-to-b from-sky-400 to-indigo-500 opacity-100'
                          : 'bg-transparent opacity-0 group-hover:opacity-50 group-hover:bg-gray-300 dark:group-hover:bg-gray-600'
                      )}
                    />
                    <span
                      className={cn(
                        'transition-transform duration-200 relative z-10',
                        active ? 'text-sky-600 dark:text-sky-400' : 'group-hover:scale-110'
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="transition-transform duration-200 group-hover:translate-x-0.5 relative z-10 flex-1 text-left">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
});
