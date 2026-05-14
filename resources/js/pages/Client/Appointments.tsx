import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Calendar,
  Clock,
  CalendarCheck,
  CalendarX,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  Stethoscope,
  Syringe,
  Scissors,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ClientLayout from '@/components/layout/ClientLayout';

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  pet: { id: string; name: string; photo: string | null; species: string };
  service: { id: string; name: string; price: number };
}

const statusConfig: Record<string, { label: string; badgeStyle: string; dotColor: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pendiente',
    badgeStyle: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    icon: <Hourglass className="h-3.5 w-3.5" />,
  },
  confirmed: {
    label: 'Confirmada',
    badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  completed: {
    label: 'Completada',
    badgeStyle: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    dotColor: 'bg-sky-500',
    icon: <CalendarCheck className="h-3.5 w-3.5" />,
  },
  cancelled: {
    label: 'Cancelada',
    badgeStyle: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    dotColor: 'bg-red-500',
    icon: <CalendarX className="h-3.5 w-3.5" />,
  },
  no_show: {
    label: 'No asistió',
    badgeStyle: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
    dotColor: 'bg-gray-400',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
};

const serviceTypeIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  consulta: { icon: <Stethoscope className="h-4 w-4" />, color: 'text-emerald-600 dark:text-emerald-400' },
  vacunación: { icon: <Syringe className="h-4 w-4" />, color: 'text-teal-600 dark:text-teal-400' },
  vacunacion: { icon: <Syringe className="h-4 w-4" />, color: 'text-teal-600 dark:text-teal-400' },
  vacuna: { icon: <Syringe className="h-4 w-4" />, color: 'text-teal-600 dark:text-teal-400' },
  estética: { icon: <Scissors className="h-4 w-4" />, color: 'text-pink-600 dark:text-pink-400' },
  estetica: { icon: <Scissors className="h-4 w-4" />, color: 'text-pink-600 dark:text-pink-400' },
  peluquería: { icon: <Scissors className="h-4 w-4" />, color: 'text-pink-600 dark:text-pink-400' },
  peluqueria: { icon: <Scissors className="h-4 w-4" />, color: 'text-pink-600 dark:text-pink-400' },
  desparasitación: { icon: <ShieldCheck className="h-4 w-4" />, color: 'text-amber-600 dark:text-amber-400' },
  desparasitacion: { icon: <ShieldCheck className="h-4 w-4" />, color: 'text-amber-600 dark:text-amber-400' },
  cirugía: { icon: <Activity className="h-4 w-4" />, color: 'text-rose-600 dark:text-rose-400' },
  cirugia: { icon: <Activity className="h-4 w-4" />, color: 'text-rose-600 dark:text-rose-400' },
};

function getServiceIcon(serviceName: string) {
  const lower = serviceName.toLowerCase();
  for (const [key, val] of Object.entries(serviceTypeIcons)) {
    if (lower.includes(key)) return val;
  }
  return { icon: <Stethoscope className="h-4 w-4" />, color: 'text-emerald-600 dark:text-emerald-400' };
}



function formatDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

type FilterTab = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments?limit=100', {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      const data = await res.json();
      if (data.success) {
        setAppointments(data.data.appointments || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments
    .filter((apt) => activeTab === 'all' || apt.status === activeTab)
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.startTime.localeCompare(a.startTime);
    });

  const counts = {
    all: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-10 w-full max-w-lg" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis Citas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Consulta y gestiona tus citas</p>
        </div>
        <Button
          onClick={() => router.visit('/client/appointments/new')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agendar Cita
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
        <TabsList className="bg-gray-100 dark:bg-gray-800 h-auto p-1 flex-wrap">
          <TabsTrigger value="all" className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">
            Todas ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5 hidden sm:inline-block" />
            Pendientes ({counts.pending})
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 hidden sm:inline-block" />
            Confirmadas ({counts.confirmed})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500 mr-1.5 hidden sm:inline-block" />
            Completadas ({counts.completed})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5 hidden sm:inline-block" />
            Canceladas ({counts.cancelled})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Empty State */}
      {appointments.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="relative flex h-28 w-28 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/30" />
              <svg className="relative z-10 h-16 w-16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="14" width="48" height="42" rx="6" className="fill-emerald-200 dark:fill-emerald-900/60" />
                <rect x="8" y="14" width="48" height="14" rx="6" className="fill-emerald-400 dark:fill-emerald-600" />
                <rect x="8" y="22" width="48" height="6" className="fill-emerald-400 dark:fill-emerald-600" />
                <circle cx="22" cy="38" r="3" className="fill-emerald-500 dark:fill-emerald-400" />
                <circle cx="32" cy="38" r="3" className="fill-emerald-500 dark:fill-emerald-400" />
                <circle cx="42" cy="38" r="3" className="fill-teal-400 dark:fill-teal-300" />
                <circle cx="22" cy="48" r="3" className="fill-emerald-300 dark:fill-emerald-500" />
                <circle cx="32" cy="48" r="3" className="fill-emerald-300 dark:fill-emerald-500" />
                <rect x="20" y="8" width="4" height="10" rx="2" className="fill-emerald-600 dark:fill-emerald-300" />
                <rect x="40" y="8" width="4" height="10" rx="2" className="fill-emerald-600 dark:fill-emerald-300" />
              </svg>
            </div>
          </motion.div>
          <div className="flex gap-1.5 mt-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 dark:bg-emerald-700" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 dark:bg-emerald-600" />
            <span className="h-1.5 w-1.5 rounded-full bg-teal-300 dark:bg-teal-700" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-4">No tienes citas</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
            Agenda tu primera cita y cuida la salud de tu mascota. Es rápido y fácil.
          </p>
          <Button
            onClick={() => router.visit('/client/appointments/new')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-shadow"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agendar Cita
          </Button>
        </motion.div>
      )}

      {/* Filtered Empty State */}
      {appointments.length > 0 && filteredAppointments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarX className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No hay citas en esta categoría</p>
        </div>
      )}

      {/* Appointment List */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-3">
          {filteredAppointments.map((apt, index) => {
            const st = statusConfig[apt.status] || statusConfig.pending;
            const svc = getServiceIcon(apt.service.name);

            return (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
              >
                <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
                  <Card
                    className="cursor-pointer border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-200 overflow-hidden"
                    onClick={() => router.visit(`/client/appointments/${apt.id}`)}
                  >
                    <div className={`h-0.5 ${
                      apt.status === 'pending' ? 'bg-gradient-to-r from-amber-300 to-amber-500' :
                      apt.status === 'confirmed' ? 'bg-gradient-to-r from-emerald-300 to-emerald-500' :
                      apt.status === 'completed' ? 'bg-gradient-to-r from-sky-300 to-sky-500' :
                      apt.status === 'cancelled' ? 'bg-gradient-to-r from-red-300 to-red-500' :
                      'bg-gradient-to-r from-gray-300 to-gray-400'
                    }`} />
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 ${svc.color} flex-shrink-0`}>
                          {svc.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{apt.service.name}</h3>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {apt.pet.name} · {formatDate(apt.date)} · {formatTime(apt.startTime)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${st.badgeStyle} gap-1.5 font-medium`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${st.dotColor}`} />
                          <span className="hidden sm:inline">{st.label}</span>
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>
    </div>
  );
}
Appointments.layout = (page: React.ReactNode) => <ClientLayout>{page}</ClientLayout>;