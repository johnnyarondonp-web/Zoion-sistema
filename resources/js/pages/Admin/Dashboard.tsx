import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { useAuth } from '@/hooks/use-auth';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CalendarCheck,
  CalendarDays,
  Heart,
  Clock,
  TrendingDown,
  Star,
  ArrowRight,
  CalendarPlus,
  Settings2,
  Calendar,
  Users,
  Sparkles,
  Stethoscope,
  Syringe,
  Scissors,
  ShieldCheck,
  Activity,
  MessageCircle,
  PawPrint,
} from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { formatTime12h } from '@/lib/format';

interface DashboardData {
  appointmentsThisMonth: number;
  appointmentsLastMonth: number;
  mostRequestedService: { serviceId: string; name: string; count: number } | null;
  unreadMessages: number;
  petsAttendedThisMonth: number;
  upcomingToday: number;
  cancellationRate: number;
  recentAppointments: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    pet: { id: string; name: string; species: string; breed: string | null };
    user: { id: string; name: string; email: string };
    service: { id: string; name: string; durationMinutes: number; price: number };
  }>;
  appointmentsByService: Array<{ serviceId: string; name: string; count: number }>;
  appointmentsByDay: Array<{ date: string; count: number }>;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const statusBadgeStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  completed: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  cancelled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  no_show: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

const statusDotColor: Record<string, string> = {
  pending: 'bg-amber-500',
  confirmed: 'bg-emerald-500',
  completed: 'bg-sky-500',
  cancelled: 'bg-red-500',
  no_show: 'bg-gray-400',
};

const serviceTypeIcons: Record<string, React.ReactNode> = {
  consulta: <Stethoscope className="h-3.5 w-3.5" />,
  vacunación: <Syringe className="h-3.5 w-3.5" />,
  vacunacion: <Syringe className="h-3.5 w-3.5" />,
  vacuna: <Syringe className="h-3.5 w-3.5" />,
  estética: <Scissors className="h-3.5 w-3.5" />,
  estetica: <Scissors className="h-3.5 w-3.5" />,
  peluquería: <Scissors className="h-3.5 w-3.5" />,
  peluqueria: <Scissors className="h-3.5 w-3.5" />,
  desparasitación: <ShieldCheck className="h-3.5 w-3.5" />,
  desparasitacion: <ShieldCheck className="h-3.5 w-3.5" />,
  cirugía: <Activity className="h-3.5 w-3.5" />,
  cirugia: <Activity className="h-3.5 w-3.5" />,
};

function getServiceIcon(serviceName: string) {
  const lower = serviceName.toLowerCase();
  for (const [key, icon] of Object.entries(serviceTypeIcons)) {
    if (lower.includes(key)) return icon;
  }
  return <Stethoscope className="h-3.5 w-3.5" />;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function formatFullDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getSpanishDate(): string {
  const now = new Date();
  return now.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getSpanishTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true });
}

const barChartConfig: ChartConfig = {
  count: { label: 'Citas', color: '#10b981' },
};

const lineChartConfig: ChartConfig = {
  count: { label: 'Citas', color: '#14b8a6' },
};

const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(getSpanishTime());

  const [error, setError] = useState(false);

  const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  useEffect(() => {
    fetchDashboard();
    const timer = setInterval(() => setCurrentTime(getSpanishTime()), 60000);
    // Refrescar datos cada 2 minutos mientras el tab esté activo
    const refreshTimer = setInterval(() => fetchDashboard(), 120000);
    return () => { clearInterval(timer); clearInterval(refreshTimer); };
  }, []);

  const fetchDashboard = async (isRetry = false) => {
    try {
      const res = await fetch('/api/dashboard', {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      if (!res.ok) {
        // Si falla la autenticación o hay un error del servidor, reintentamos una vez
        if (!isRetry) {
          setTimeout(() => fetchDashboard(true), 1500);
        } else {
          setError(true);
        }
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setError(false);
      } else if (!isRetry) {
        setTimeout(() => fetchDashboard(true), 1500);
      }
    } catch {
      if (!isRetry) {
        setTimeout(() => fetchDashboard(true), 1500);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <CalendarCheck className="h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">No se pudo cargar el panel. Verifica tu conexión.</p>
        <button
          onClick={() => { setLoading(true); fetchDashboard(); }}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Citas este mes',
      value: data.appointmentsThisMonth,
      icon: CalendarCheck,
      borderColor: 'border-l-4 border-l-emerald-500 dark:border-l-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Citas mes anterior',
      value: data.appointmentsLastMonth,
      icon: CalendarDays,
      borderColor: 'border-l-4 border-l-teal-500 dark:border-l-teal-400',
      iconBg: 'bg-teal-50 dark:bg-teal-950/40',
      iconColor: 'text-teal-600 dark:text-teal-400',
    },
    {
      label: 'Mascotas atendidas',
      value: data.petsAttendedThisMonth,
      icon: PawPrint,
      borderColor: 'border-l-4 border-l-rose-500 dark:border-l-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-950/40',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
    {
      label: 'Citas hoy pendientes',
      value: data.upcomingToday,
      icon: Clock,
      borderColor: 'border-l-4 border-l-amber-500 dark:border-l-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Tasa de cancelación',
      value: `${data.cancellationRate}%`,
      icon: TrendingDown,
      borderColor: 'border-l-4 border-l-orange-500 dark:border-l-orange-400',
      iconBg: 'bg-orange-50 dark:bg-orange-950/40',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      label: 'Mensajes sin responder',
      value: data.unreadMessages,
      icon: MessageCircle,
      borderColor: 'border-l-4 border-l-violet-500 dark:border-l-violet-400',
      iconBg: 'bg-violet-50 dark:bg-violet-950/40',
      iconColor: 'text-violet-600 dark:text-violet-400',
      sub: data.unreadMessages === 1 ? '1 mensaje nuevo' : `${data.unreadMessages} mensajes nuevos`,
    },
  ];

  const quickActions = [
    {
      label: 'Nueva Cita',
      icon: CalendarPlus,
      href: '/admin/appointments',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-white dark:bg-zinc-900 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20',
      borderColor: 'border-gray-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-800/80',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      label: 'Nuevo Servicio',
      icon: Settings2,
      href: '/admin/services/new',
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-white dark:bg-zinc-900 hover:bg-teal-50/30 dark:hover:bg-teal-950/20',
      borderColor: 'border-gray-200 dark:border-zinc-800 hover:border-teal-300 dark:hover:border-teal-800/80',
      iconBg: 'bg-teal-50 dark:bg-teal-950/50',
    },
    {
      label: 'Ver Calendario',
      icon: Calendar,
      href: '/admin/calendar',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-white dark:bg-zinc-900 hover:bg-amber-50/30 dark:hover:bg-amber-950/20',
      borderColor: 'border-gray-200 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-800/80',
      iconBg: 'bg-amber-50 dark:bg-amber-950/50',
    },
    {
      label: 'Clientes',
      icon: Users,
      href: '/admin/clients',
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-white dark:bg-zinc-900 hover:bg-rose-50/30 dark:hover:bg-rose-950/20',
      borderColor: 'border-gray-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-800/80',
      iconBg: 'bg-rose-50 dark:bg-rose-950/50',
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6 relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-emerald-100/30 dark:bg-emerald-950/20 blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-teal-100/25 dark:bg-teal-950/15 blur-3xl translate-y-1/3 -translate-x-1/3" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full bg-cyan-100/20 dark:bg-cyan-950/10 blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Welcome Banner */}
      <motion.div variants={item}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-800 dark:via-teal-800 dark:to-cyan-800 p-4 sm:p-5 text-white shadow-md shadow-emerald-200/20 dark:shadow-emerald-900/20">
          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-white/5 blur-sm" />
            <div className="absolute -bottom-8 -left-8 w-20 h-20 rounded-full bg-white/5 blur-sm" />
            {/* Animated paw prints */}
            <motion.div
              className="absolute top-2 right-4 opacity-[0.05]"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg className="w-12 h-12" viewBox="0 0 100 100" fill="currentColor">
                <ellipse cx="50" cy="65" rx="20" ry="25" />
                <ellipse cx="25" cy="35" rx="10" ry="12" />
                <ellipse cx="50" cy="25" rx="10" ry="12" />
                <ellipse cx="75" cy="35" rx="10" ry="12" />
              </svg>
            </motion.div>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-200" />
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  ¡Bienvenido, {user?.name || 'Admin'}!
                </h1>
              </div>
              <div className="text-emerald-100/90 mt-0.5 text-xs sm:text-sm capitalize font-medium">
                {getSpanishDate()}
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3.5 py-1.5 border border-white/10 self-start sm:self-auto">
              <Clock className="h-4.5 w-4.5 text-emerald-200" />
              <span className="text-sm sm:text-base font-semibold tabular-nums">{currentTime}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions — 2x2 compact grid */}
      <motion.div variants={item}>
        <div className="grid grid-cols-2 gap-2.5">
          {quickActions.map((action) => (
            <motion.button
              key={action.label}
              onClick={() => router.visit(action.href)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${action.bg} ${action.color} border ${action.borderColor} shadow-sm hover:shadow-md active:scale-[0.98] w-full`}
              whileHover={{ scale: 1.015, y: -1 }}
              whileTap={{ scale: 0.985 }}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${action.iconBg}`}>
                <action.icon className="h-4 w-4" />
              </div>
              <span className="truncate text-left text-gray-900 dark:text-gray-100 font-semibold text-sm">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Metric Cards — always 3-col dense grid */}
      <motion.div variants={item}>
        <div className="grid grid-cols-3 gap-2">
          {metrics.map((metric) => (
            <Card key={metric.label} className={`overflow-hidden relative ${metric.borderColor} bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm`}>
              <div className={`absolute -right-2 -bottom-2 opacity-[0.08] ${metric.iconColor} pointer-events-none`}>
                <metric.icon className="h-14 w-14" />
              </div>
              <CardContent className="p-2.5 relative z-10">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${metric.iconBg} mb-1.5`}>
                  <metric.icon className={`h-3.5 w-3.5 ${metric.iconColor}`} />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-none">
                  {metric.value}
                </div>
                <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-1 leading-tight">{metric.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Charts — side-by-side, horizontal scroll on mobile */}
      <motion.div variants={item}>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 snap-x snap-mandatory">

          {/* Bar Chart */}
          <div className="min-w-[80vw] sm:min-w-0 snap-start flex-shrink-0 sm:flex-shrink">
            <Card className="border-gray-200 dark:border-gray-700 shadow-sm h-full">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Citas por servicio
                </CardTitle>
                <button
                  onClick={() => router.visit('/admin/appointments')}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline whitespace-nowrap"
                >
                  Ver gráfico completo
                </button>
              </CardHeader>
              <CardContent className="pt-0">
                {data.appointmentsByService.length > 0 ? (
                  <ChartContainer config={barChartConfig} className="h-52 w-full">
                    <BarChart layout="vertical" data={data.appointmentsByService} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} tickFormatter={(v: string) => v.length > 20 ? v.substring(0, 19) + '…' : v} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-52 items-center justify-center text-gray-400 text-sm">Sin datos</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Line Chart */}
          <div className="min-w-[80vw] sm:min-w-0 snap-start flex-shrink-0 sm:flex-shrink">
            <Card className="border-gray-200 dark:border-gray-700 shadow-sm h-full">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Actividad de citas (14 días)
                </CardTitle>
                <button
                  onClick={() => router.visit('/admin/appointments')}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline whitespace-nowrap"
                >
                  Ver gráfico completo
                </button>
              </CardHeader>
              <CardContent className="pt-0">
                {data.appointmentsByDay.length > 0 ? (
                  <ChartContainer config={lineChartConfig} className="h-52 w-full">
                    <LineChart data={data.appointmentsByDay} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => formatDate(v)} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent labelFormatter={(l) => formatFullDate(l as string)} />} />
                      <Line type="monotone" dataKey="count" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6', r: 3 }} activeDot={{ r: 5, fill: '#0d9488' }} />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-52 items-center justify-center text-gray-400 text-sm">Sin datos</div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </motion.div>

      {/* Recent Appointments Table */}
      <motion.div variants={item}>
        <Card className="border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Citas recientes
              </CardTitle>
              <button
                onClick={() => router.visit('/admin/appointments')}
                className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
              >
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {data.recentAppointments.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-gray-50/80 dark:bg-gray-800/40">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Servicio</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Dueño</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 hidden sm:table-cell">Fecha</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 hidden sm:table-cell">Hora</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentAppointments.map((apt, index) => (
                      <TableRow
                        key={apt.id}
                        className={`cursor-pointer transition-colors duration-150 ${
                          index % 2 === 0
                            ? 'bg-white dark:bg-transparent hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                            : 'bg-gray-50/60 dark:bg-gray-800/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                        }`}
                        onClick={() => router.visit(`/admin/appointments/${apt.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-600 dark:text-emerald-400">{getServiceIcon(apt.service.name)}</span>
                            <span className="font-medium text-xs leading-tight">{apt.service.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{apt.user.name}</TableCell>
                        <TableCell className="text-xs hidden sm:table-cell">{formatFullDate(apt.date)}</TableCell>
                        <TableCell className="text-xs text-gray-500 dark:text-gray-400 hidden sm:table-cell">{formatTime12h(apt.startTime)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${statusBadgeStyles[apt.status] || statusBadgeStyles.no_show} text-[10px] gap-1 font-medium px-1.5 py-0`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor[apt.status] || 'bg-gray-400'}`} />
                            {statusLabels[apt.status] || apt.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarCheck className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                <div className="text-gray-500 dark:text-gray-400">No hay citas registradas</div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

Dashboard.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;