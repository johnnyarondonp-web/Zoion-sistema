import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/use-auth';
import { usePendingAppointments } from '@/hooks/use-pending-appointments';
import {
  PawPrint, Menu, LogOut, User, Calendar, Heart, Clock,
  ShieldCheck, CalendarDays, Ban, LayoutDashboard, Settings2,
  Sun, Moon, Info, Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { NotificationBell } from '@/components/layout/notification-bell';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const clientNavItems: NavItem[] = [
  { label: 'Mis Mascotas', href: '/client/pets', icon: <Heart className="h-4 w-4" /> },
  { label: 'Mis Citas', href: '/client/appointments', icon: <Calendar className="h-4 w-4" /> },
  { label: 'Servicios', href: '/client/services', icon: <Settings2 className="h-4 w-4" /> },
  { label: 'Mi Perfil', href: '/client/profile', icon: <User className="h-4 w-4" /> },
];

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Servicios', href: '/admin/services', icon: <Settings2 className="h-4 w-4" /> },
  { label: 'Horarios', href: '/admin/schedules', icon: <Clock className="h-4 w-4" /> },
  { label: 'Fechas Bloqueadas', href: '/admin/blocked-dates', icon: <Ban className="h-4 w-4" /> },
  { label: 'Citas', href: '/admin/appointments', icon: <Calendar className="h-4 w-4" /> },
  { label: 'Mi Perfil', href: '/client/profile', icon: <User className="h-4 w-4" /> },
];

const publicNavItems: { label: string; href: string }[] = [
  { label: 'Inicio', href: '/' },

];

export function Navbar() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { url } = usePage();

  // ✅ Hook compartido para citas pendientes
  const { pendingCount } = usePendingAppointments();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 10);
      setScrollProgress(Math.min(scrollY / 100, 1));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = isAdmin ? adminNavItems : clientNavItems;
  const roleLabel = isAdmin ? 'Admin' : 'Cliente';
  const roleBadgeVariant = isAdmin ? 'default' : 'secondary';
  const isActive = (href: string) => url.startsWith(href) && href !== '/';
  const isExactActive = (href: string) => url === href;

  const handleNavClick = (href: string) => {
    router.visit(href);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    router.post('/logout');
    setMobileOpen(false);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? 'bg-white/95 dark:bg-gray-950/95 shadow-md backdrop-blur-xl' : 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-md'
      }`}
      style={{
        borderBottom: `1px solid rgba(16, 185, 129, ${scrollProgress * 0.2})`,
      }}
    >
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">       
        <div className="flex items-center gap-6">
          {/* Logo */}
          <button
            onClick={() => router.visit(isAuthenticated ? '/client/pets' : '/')}
            className="flex items-center gap-2 transition-opacity hover:opacity-80 group"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: -8 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm"
            >
              <PawPrint className="h-5 w-5" />
            </motion.div>
            <motion.span
              className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              Zoion
            </motion.span>
          </button>

          {/* Nav links (desktop, non-authenticated) */}
          {!isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              {publicNavItems.map((navItem) => {
                const active = isExactActive(navItem.href);
                return (
                  <button
                    key={navItem.href}
                    onClick={() => router.visit(navItem.href)}
                    className={`relative px-3 py-2 text-sm font-medium transition-colors group ${
                      active
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    {navItem.label}
                    {active && (
                      <motion.div
                        layoutId="navActiveIndicator"
                        className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                    {!active && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-emerald-500/0 group-hover:bg-emerald-500/30 rounded-full transition-colors duration-200" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

        </div>{/* end left group */}

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme toggle - desktop */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 hidden md:flex"
            aria-label="Cambiar tema"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4 text-gray-600" />
            )}
          </Button>

          {/* Notification Bell - siempre visible para auth */}
          {isAuthenticated && <NotificationBell />}

          {/* Desktop: Authenticated user menu */}
          {isAuthenticated && user ? (
            <div className="hidden md:flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[120px] truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.name || 'Usuario'}
                    </span>
                    {/* Badge eliminado */}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Solo Mi Perfil y Cerrar Sesión */}
                  <DropdownMenuItem
                    onClick={() => handleNavClick('/client/profile')}
                    className="cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Mi Perfil
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}

          {/* Desktop: Non-authenticated buttons */}
          {!isAuthenticated && (
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.visit('/login')}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400"
              >
                Iniciar Sesión
              </Button>
              <Button
                onClick={() => router.visit('/register')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
              >
                Registrarse
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
                    <PawPrint className="h-4 w-4" />
                  </div>
                  Zoion
                </SheetTitle>
              </SheetHeader>

              {isAuthenticated && user ? (
                <div className="flex flex-col gap-4 px-4 pt-2">
                  <div className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[150px]">
                        {user.name || 'Usuario'}
                      </span>
                      {/* Badge eliminado en móvil también */}
                    </div>
                  </div>

                  <Separator />

                  <nav className="flex flex-col gap-1">
                    {/* Solo Mi Perfil en el menú móvil */}
                    <SheetClose asChild>
                      <button
                        onClick={() => handleNavClick('/client/profile')}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <User className="h-4 w-4" />
                        Mi Perfil
                      </button>
                    </SheetClose>
                  </nav>

                  <Separator />

                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                    {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                  </button>



                  <Separator />

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesión
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 px-4 pt-2">
                  <button
                    onClick={() => handleNavClick('/')}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <PawPrint className="h-4 w-4" />
                    Inicio
                  </button>

                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                    {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                  </button>

                  <Separator />

                  <SheetClose asChild>
                    <Button variant="outline" onClick={() => router.visit('/login')} className="w-full">
                      Iniciar Sesión
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button
                      onClick={() => router.visit('/register')}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Registrarse
                    </Button>
                  </SheetClose>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
