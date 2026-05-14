import { memo } from 'react';
import { usePage, router } from '@inertiajs/react';
import { Heart, CalendarPlus, Calendar, Settings2, Info, Siren } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  matchPrefixes?: string[];
  exact?: boolean;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

// Rutas actualizadas al prefijo /client/ para coincidir con tu estructura Laravel
const sidebarSections: SidebarSection[] = [
  {
    title: 'Mascotas',
    items: [
      { label: 'Mis Mascotas', href: '/client/pets', icon: <Heart className="h-4 w-4" />, matchPrefixes: ['/client/pets'] },
    ],
  },
  {
    title: 'Citas',
    items: [
      { label: 'Agendar Cita', href: '/client/appointments/new', icon: <CalendarPlus className="h-4 w-4" />, matchPrefixes: ['/client/appointments/new'] },
      { label: 'Mis Citas', href: '/client/appointments', icon: <Calendar className="h-4 w-4" />, matchPrefixes: ['/client/appointments'], exact: true },
    ],
  },
  {
    title: 'General',
    items: [
      { label: 'Servicios', href: '/client/services', icon: <Settings2 className="h-4 w-4" />, matchPrefixes: ['/client/services'], exact: true },
      { label: 'Emergencias', href: '/client/emergency', icon: <Siren className="h-4 w-4" />, matchPrefixes: ['/client/emergency'] },
    ],
  },
];

function getInitials(name: string | null | undefined): string {
  if (!name) return 'C';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

export const ClientSidebar = memo(function ClientSidebar() {
  const { url } = usePage();
  const { user } = useAuth();

  // Memoizado implícito al ser función pura, evita recreación en cada render
  const isActive = (item: SidebarItem) => {
    if (item.exact) {
      return url === item.href;
    }
    const prefixes = item.matchPrefixes?.length ? item.matchPrefixes : [item.href];
    return prefixes.some((prefix) => url.startsWith(prefix));
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-gray-200/80 dark:border-gray-700/60 bg-gradient-to-b from-gray-50/80 to-white dark:from-gray-900/80 dark:to-gray-950/80 backdrop-blur-sm">
      {/* User Avatar Section */}
      <div className="p-4 pb-3 border-b border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-semibold text-sm shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/30 ring-2 ring-white dark:ring-gray-800">
            {getInitials(user?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {user?.name || 'Cliente'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-2">
        {sidebarSections.map((section, sectionIdx) => (
          <div key={section.title}>
            <div className="px-4 pt-4 pb-1.5">
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
                        layoutId="clientSidebarActive"
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
                    <span className="transition-transform duration-200 group-hover:translate-x-0.5 relative z-10">
                      {item.label}
                    </span>
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
