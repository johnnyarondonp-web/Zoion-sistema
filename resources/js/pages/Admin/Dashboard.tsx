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

  const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  useEffect(() => {
    fetchDashboard();
    const timer = setInterval(() => setCurrentTime(getSpanishTime()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard', {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

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
      cardBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      iconBg: 'bg-white/20',
      textColor: 'text-white',
      subTextColor: 'text-emerald-100',
    },
    {
      label: 'Citas mes anterior',
      value: data.appointmentsLastMonth,
      icon: CalendarDays,
      cardBg: 'bg-gradient-to-br from-teal-500 to-cyan-600',
      iconBg: 'bg-white/20',
      textColor: 'text-white',
      subTextColor: 'text-teal-100',
    },
    {
      label: 'Mascotas atendidas',
      value: data.petsAttendedThisMonth,
      icon: Heart,
      cardBg: 'bg-gradient-to-br from-rose-500 to-pink-600',
      iconBg: 'bg-white/20',
      textColor: 'text-white',
      subTextColor: 'text-rose-100',
    },
    {
      label: 'Citas hoy pendientes',
      value: data.upcomingToday,
      icon: Clock,
      cardBg: 'bg-gradient-to-br from-amber-500 to-yellow-600',
      iconBg: 'bg-white/20',
      textColor: 'text-white',
      subTextColor: 'text-amber-100',
    },
    {
      label: 'Tasa de cancelación',
      value: `${data.cancellationRate}%`,
      icon: TrendingDown,
      cardBg: 'bg-gradient-to-br from-orange-500 to-amber-600',
      iconBg: 'bg-white/20',
      textColor: 'text-white',
      subTextColor: 'text-orange-100',
    },
    {
      label: 'Servicio más solicitado',
      value: data.mostRequestedService?.name || 'N/A',
      icon: Star,
      cardBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
      iconBg: 'bg-white/20',
      textColor: 'text-white',
      subTextColor: 'text-violet-100',
      sub: data.mostRequestedService ? `${data.mostRequestedService.count} citas` : undefined,
    },
  ];

  const quickActions = [
    {
      label: 'Nueva Cita',
      icon: CalendarPlus,
      href: '/admin/appointments',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50',
    },
    {
      label: 'Nuevo Servicio',
      icon: Settings2,
      href: '/admin/services/new',
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50',
    },
    {
      label: 'Ver Calendario',
      icon: Calendar,
      href: '/admin/calendar',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50',
    },
    {
      label: 'Clientes',
      icon: Users,
      href: '/admin/clients',
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50',
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-800 dark:via-teal-800 dark:to-cyan-800 p-6 sm:p-8 text-white shadow-xl shadow-emerald-200/30 dark:shadow-emerald-900/30">
          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-white/5 blur-sm" />
            <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-white/5 blur-sm" />
            <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-white/20" />
            <div className="absolute top-1/4 right-1/3 w-1.5 h-1.5 rounded-full bg-white/15" />
            <div className="absolute bottom-1/4 left-1/3 w-2 h-2 rounded-full bg-white/10" />
            {/* Animated paw prints */}
            <motion.div
              className="absolute top-4 right-8 opacity-[0.06]"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg className="w-20 h-20" viewBox="0 0 100 100" fill="currentColor">
                <ellipse cx="50" cy="65" rx="20" ry="25" />
                <ellipse cx="25" cy="35" rx="10" ry="12" />
                <ellipse cx="50" cy="25" rx="10" ry="12" />
                <ellipse cx="75" cy="35" rx="10" ry="12" />
              </svg>
            </motion.div>
            <motion.div
              className="absolute bottom-4 right-20 opacity-[0.04]"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            >
              <svg className="w-14 h-14 rotate-45" viewBox="0 0 100 100" fill="currentColor">
                <ellipse cx="50" cy="65" rx="20" ry="25" />
                <ellipse cx="25" cy="35" rx="10" ry="12" />
                <ellipse cx="50" cy="25" rx="10" ry="12" />
                <ellipse cx="75" cy="35" rx="10" ry="12" />
              </svg>
            </motion.div>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-6 w-6 text-emerald-200" />
                <h1 className="text-2xl sm:text-3xl font-bold">
                  ¡Bienvenido, {user?.name || 'Admin'}!
                </h1>
              </div>
              <div className="text-emerald-100 mt-2 text-sm sm:text-base capitalize">
                {getSpanishDate()}
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/10">
              <Clock className="h-5 w-5 text-emerald-200" />
              <span className="text-lg font-semibold tabular-nums">{currentTime}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <motion.button
              key={action.label}
              onClick={() => router.visit(action.href)}
              className={`flex flex-col items-center justify-center text-center gap-1.5 rounded-xl px-2 min-h-[72px] h-[72px] text-xs sm:text-sm font-medium transition-all duration-200 ${action.bg} ${action.color} border border-transparent hover:shadow-sm active:scale-[0.98]`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <action.icon className="h-5 w-5 shrink-0" />
              <span className="truncate w-full">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <motion.div key={metric.label} variants={item}>
            <Card className={`overflow-hidden relative border-0 ${metric.cardBg} shadow-lg hover:shadow-xl transition-shadow duration-300`}>
              {/* Large faded icon background */}
              <div className="absolute -right-3 -bottom-3 opacity-10">
                <metric.icon className="h-24 w-24" />
              </div>
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${metric.iconBg} backdrop-blur-sm`}>
                    <metric.icon className={`h-6 w-6 ${metric.textColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-lg font-bold ${metric.textColor} leading-tight`}>{metric.value}</div>
                    <div className={`text-sm ${metric.subTextColor}`}>{metric.label}</div>
                    {metric.sub && (
                      <div className="text-xs text-white/70 mt-0.5">{metric.sub}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bar Chart - Citas por servicio */}
        <motion.div variants={item}>
          <Card className="border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Citas por servicio
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data.appointmentsByService.length > 0 ? (
                <ChartContainer config={barChartConfig} className="h-64 w-full">
                  <BarChart data={data.appointmentsByService} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(val: string) => val.length > 10 ? val.substring(0, 10) + '…' : val}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-64 items-center justify-center text-gray-400 text-sm">
                  No hay datos de servicios
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Line Chart - Citas últimos 14 días */}
        <motion.div variants={item}>
          <Card className="border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Citas últimos 14 días
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data.appointmentsByDay.length > 0 ? (
                <ChartContainer config={lineChartConfig} className="h-64 w-full">
                  <LineChart data={data.appointmentsByDay} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val: string) => formatDate(val)}
                    />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <ChartTooltip
                      content={<ChartTooltipContent labelFormatter={(label) => formatFullDate(label as string)} />}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#14b8a6"
                      strokeWidth={2}
                      dot={{ fill: '#14b8a6', r: 3 }}
                      activeDot={{ r: 5, fill: '#0d9488' }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex h-64 items-center justify-center text-gray-400 text-sm">
                  No hay datos de citas recientes
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

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
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Fecha</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Hora</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Mascota</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Dueño</TableHead>
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
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 dark:text-emerald-400">{getServiceIcon(apt.service.name)}</span>
                            <span className="font-medium text-sm">{apt.service.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatFullDate(apt.date)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 dark:text-gray-400">{formatTime12h(apt.startTime)} – {formatTime12h(apt.endTime)}</TableCell>
                        <TableCell className="text-sm">{apt.pet.name}</TableCell>
                        <TableCell className="text-sm">{apt.user.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${statusBadgeStyles[apt.status] || statusBadgeStyles.no_show} text-xs gap-1.5 font-medium`}
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