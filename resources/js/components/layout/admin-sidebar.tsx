import { memo, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import {
  LayoutDashboard, Users, Settings2, Clock, Ban, Calendar,
  CalendarDays, UserCircle, Info, BarChart3, Shield,
  Stethoscope, Activity, Settings, UserPlus,
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

// Estática: no se recrea en cada render
export const sidebarSections: SidebarSection[] = [
  {
    title: 'Gestión',
    icon: <Shield className="h-3 w-3" />,
    color: 'text-emerald-500',
    items: [
      { label: 'Dashboard',        href: '/admin/dashboard',     icon: <LayoutDashboard className="h-4 w-4" />, matchPrefixes: ['/admin/dashboard'] },
      { label: 'Clientes',         href: '/admin/clients',       icon: <Users className="h-4 w-4" />,          matchPrefixes: ['/admin/clients'] },
      { label: 'Servicios',        href: '/admin/services',      icon: <Settings2 className="h-4 w-4" />,      matchPrefixes: ['/admin/services'] },
      { label: 'Horarios',         href: '/admin/schedules',     icon: <Clock className="h-4 w-4" />,          matchPrefixes: ['/admin/schedules'] },
      { label: 'Fechas Bloqueadas',href: '/admin/blocked-dates', icon: <Ban className="h-4 w-4" />,            matchPrefixes: ['/admin/blocked-dates'] },
    ],
  },
  {
    title: 'Citas',
    icon: <Stethoscope className="h-3 w-3" />,
    color: 'text-sky-500',
    items: [
      { label: 'Citas',                href: '/admin/appointments', icon: <Calendar className="h-4 w-4" />,    matchPrefixes: ['/admin/appointments'] },
      { label: 'Calendario',           href: '/admin/calendar',     icon: <CalendarDays className="h-4 w-4" />, matchPrefixes: ['/admin/calendar'] },
      { label: 'Equipo médico',        href: '/admin/doctors',      icon: <Stethoscope className="h-4 w-4" />, matchPrefixes: ['/admin/doctors'] },
      { label: 'Recepcionistas',       href: '/admin/receptionists', icon: <UserCircle className="h-4 w-4" />, matchPrefixes: ['/admin/receptionists'] },
      { label: 'Atención presencial',  href: '/admin/walk-in',      icon: <UserPlus className="h-4 w-4" />,    matchPrefixes: ['/admin/walk-in'] },
    ],
  },
  {
    title: 'Analíticas',
    icon: <Activity className="h-3 w-3" />,
    color: 'text-amber-500',
    items: [
      { label: 'Reportes', href: '/admin/reports', icon: <BarChart3 className="h-4 w-4" />, matchPrefixes: ['/admin/reports'] },
    ],
  },
  {
    title: 'Configuración',
    icon: <Settings2 className="h-3 w-3" />,
    color: 'text-gray-400',
    items: [],
  },
  {
    title: 'Sistema',
    icon: <Settings className="h-3 w-3" />,
    color: 'text-violet-400',
    items: [
      { label: 'Configuración', href: '/admin/settings', icon: <Settings className="h-4 w-4" />, matchPrefixes: ['/admin/settings'] },
    ],
  },
];

function getInitials(name: string | null | undefined): string {
  if (!name) return 'A';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
}

export const AdminSidebar = memo(function AdminSidebar() {
  const { url } = usePage();
  const { user, unreadMessages } = useAuth();

  // Memoizamos la función de comparación para evitar recálculos innecesarios
  const isActive = useMemo(() => {
    return (item: SidebarItem) =>
      (item.matchPrefixes ?? [item.href]).some((prefix) => url.startsWith(prefix));
  }, [url]);

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-gray-200/80 dark:border-gray-700/60 bg-gradient-to-b from-gray-50/80 to-white dark:from-gray-900/80 dark:to-gray-950/80 backdrop-blur-sm">
      {/* User Avatar Section */}
      <div className="p-4 pb-3 border-b-2 border-gray-200/80 dark:border-gray-700/60">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-semibold text-sm shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/30 ring-2 ring-white dark:ring-gray-800">
            {getInitials(user?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {user?.name || 'Admin'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email || 'admin@zoion.vet'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-2">
        {sidebarSections.map((section, sectionIdx) => (
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
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 group',
                      active
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-100'
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="adminSidebarActive"
                        className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-50 via-emerald-100/80 to-teal-50 dark:from-emerald-950/40 dark:via-emerald-950/25 dark:to-teal-950/20 shadow-sm"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span
                      className={cn(
                        'absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full transition-all duration-200 z-10',
                        active
                          ? 'bg-gradient-to-b from-emerald-400 to-teal-500 opacity-100'
                          : 'bg-transparent opacity-0 group-hover:opacity-50 group-hover:bg-gray-300 dark:group-hover:bg-gray-600'
                      )}
                    />
                    <span
                      className={cn(
                        'transition-transform duration-200 relative z-10',
                        active ? 'text-emerald-600 dark:text-emerald-400' : 'group-hover:scale-110'
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="transition-transform duration-200 group-hover:translate-x-0.5 relative z-10 flex-1 text-left">
                      {item.label}
                    </span>
                    {item.href === '/admin/appointments' && unreadMessages > 0 && (
                      <span className="relative z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-500 px-1.5 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 transition-transform group-hover:scale-110">
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            {sectionIdx < sidebarSections.length - 1 && (
              <div className="mx-4 my-1 border-t border-gray-200/60 dark:border-gray-700/40" />
            )}
          </div>
        ))}
      </div>
    </aside>
  );
});