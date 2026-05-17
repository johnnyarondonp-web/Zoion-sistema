import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface Summary {
  totalRevenue: number;
  totalAppointments: number;
  avgPerMonth: number;
  completionRate: number;
  completedAppointments: number;
}

interface ReportsData {
  summary: Summary;
  appointmentsByMonth: Array<{ month: string; count: number }>;
  statusBreakdown: Array<{ status: string; label: string; count: number }>;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  newClientsByMonth: Array<{ month: string; count: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#0ea5e9',
  completed: '#10b981',
  cancelled: '#ef4444',
  no_show: '#6b7280',
};

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2.5 text-xs">
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || '#10b981' }} className="font-semibold">
            {p.name}: {typeof p.value === 'number' && p.name.toLowerCase().includes('revenue')
              ? `$${Number(p.value).toFixed(2)}` 
              : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function Reports() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch('/api/reports', {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="h-1">
                <Skeleton className="h-full w-full" />
              </div>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="flex items-end gap-2 h-48">
                {[40, 65, 45, 80, 55, 70, 35].map((h, i) => (
                  <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <Skeleton key={i} className="flex-1 h-3" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="flex items-center justify-center h-48">
                <div className="relative">
                  <Skeleton className="h-40 w-40 rounded-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Skeleton className="h-20 w-20 rounded-full bg-white dark:bg-gray-800" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Skeleton className="h-5 w-40 mb-4" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 mb-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Skeleton className="h-5 w-40 mb-4" />
              <div className="flex items-end gap-2 h-48">
                {[50, 70, 40, 60, 80].map((h, i) => (
                  <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { summary, appointmentsByMonth, statusBreakdown, topServices, newClientsByMonth } = data;

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={item}>
        <div className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reportes y Analíticas</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Resumen general de la clínica</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ingresos totales</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${Number(summary.totalRevenue).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-sky-400 to-blue-500" />
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/30">
                  <Calendar className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total de citas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.totalAppointments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
                  <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Promedio/mes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.avgPerMonth}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950/30">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tasa de completado</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.completionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={item}>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                Citas por Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appointmentsByMonth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Citas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                Citas por Estado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {statusBreakdown.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      formatter={(value) => {
                        const total = statusBreakdown.reduce((sum, item) => sum + item.count, 0);
                        const item = statusBreakdown.find(x => x.label === value);
                        if (item && total > 0) {
                          const percentage = ((item.count / total) * 100).toFixed(0);
                          return <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{value} ({percentage}%)</span>;
                        }
                        return <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={item}>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Servicios Más Populares
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topServices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <BarChart3 className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No hay datos de servicios</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topServices.map((svc, idx) => {
                    const maxCount = topServices[0]?.count || 1;
                    const pct = (svc.count / maxCount) * 100;
                    return (
                      <div key={svc.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate mr-2">{svc.name}</span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs text-gray-500 dark:text-gray-400">{svc.count} citas</span>
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">${Number(svc.revenue).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.05 }}
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-600" />
                Nuevos Clientes por Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={newClientsByMonth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Nuevos clientes" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

Reports.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;