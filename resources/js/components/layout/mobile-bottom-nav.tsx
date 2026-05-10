import { useEffect, useState, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useAuth } from '@/hooks/use-auth';
import { usePendingAppointments } from '@/hooks/use-pending-appointments'; // ✅ Nuevo hook
import { cn } from '@/lib/utils';
import { Heart, Calendar, CalendarPlus, Settings2, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  matchPrefixes: string[];
  isCenter?: boolean;
  showBadge?: boolean;
}

const navItems: NavItem[] = [
  {
    label: 'Mascotas',
    href: '/client/pets',
    icon: <Heart className="h-5 w-5" />,
    matchPrefixes: ['/client/pets'],
  },
  {
    label: 'Citas',
    href: '/client/appointments',
    icon: <Calendar className="h-5 w-5" />,
    matchPrefixes: ['/client/appointments'],
    showBadge: true,
  },
  {
    label: 'Nueva Cita',
    href: '/client/appointments/new',
    icon: <CalendarPlus className="h-6 w-6" />,
    matchPrefixes: ['/client/appointments/new'],
    isCenter: true,
  },
  {
    label: 'Servicios',
    href: '/client/services',
    icon: <Settings2 className="h-5 w-5" />,
    matchPrefixes: ['/client/services'],
  },
  {
    label: 'Perfil',
    href: '/client/profile',
    icon: <UserCircle className="h-5 w-5" />,
    matchPrefixes: ['/client/profile', '/client/about', '/client/emergency'],
  },
];

const hiddenPaths = ['/', '/login', '/register'];

export function MobileBottomNav() {
  const { url } = usePage();
  const { isAuthenticated } = useAuth();
  const { user } = useAuth();
  const isClient = user?.role === 'client';
  
  // ✅ Usamos el hook compartido en lugar de fetch manual
  const { pendingCount } = usePendingAppointments();
  
  const [centerPulsing, setCenterPulsing] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pulse animation on center button after 5s of idle
  useEffect(() => {
    if (!isAuthenticated || !isClient) return;
    
    const resetIdleTimer = () => {
      setCenterPulsing(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setCenterPulsing(true), 5000);
    };

    resetIdleTimer();

    const events = ['touchstart', 'click', 'scroll'] as const;
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
    };
  }, [isAuthenticated, isClient]);

  // Ocultar en rutas públicas o admin
  if (!isAuthenticated || !isClient) return null;
  if (hiddenPaths.includes(url) || url.startsWith('/admin')) return null;

  const isActive = (item: NavItem) =>
    item.matchPrefixes.some((prefix) => url.startsWith(prefix));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <nav className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)]">
        <div className="flex items-end justify-around px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {navItems.map((navItem) => {
            const active = isActive(navItem);
            
            if (navItem.isCenter) {
              return (
                <button
                  key={navItem.href}
                  onClick={() => router.visit(navItem.href)}
                  className="relative -mt-5 flex flex-col items-center gap-0.5 focus:outline-none"
                  aria-label={navItem.label}
                >
                  <motion.div
                    whileTap={{ scale: 0.85 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className={cn(
                      'relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors duration-200',
                      'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
                      active && 'ring-2 ring-emerald-300 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
                    )}
                  >
                    <AnimatePresence>
                      {centerPulsing && !active && (
                        <motion.div
                          initial={{ scale: 1, opacity: 0.6 }}
                          animate={{ scale: 1.5, opacity: 0 }}
                          exit={{ scale: 1, opacity: 0 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                          className="absolute inset-0 rounded-full bg-emerald-400"
                        />
                      )}
                    </AnimatePresence>
                    {navItem.icon}
                  </motion.div>
                  <span
                    className={cn(
                      'text-[10px] font-medium mt-0.5 transition-colors duration-200',
                      active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {navItem.label}
                  </span>
                </button>
              );
            }

            return (
              <motion.button
                key={navItem.href}
                onClick={() => router.visit(navItem.href)}
                className="relative flex flex-col items-center gap-0.5 py-1 px-2 focus:outline-none min-w-[56px]"
                aria-label={navItem.label}
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              >
                <div className="relative">
                  <div
                    className={cn(
                      'transition-colors duration-200',
                      active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
                    )}
                  >
                    {navItem.icon}
                  </div>
                  {active && (
                    <motion.div
                      layoutId="mobileNavDot"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-emerald-500 dark:bg-emerald-400"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  {navItem.showBadge && pendingCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 shadow-sm"
                    >
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </motion.div>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium transition-colors duration-200',
                    active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  {navItem.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}