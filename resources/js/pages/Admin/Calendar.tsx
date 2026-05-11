'use client';
import { useEffect, useState, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  PawPrint,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  pet: { id: string; name: string; species: string; breed: string | null };
  service: { id: string; name: string; durationMinutes: number; price: number };
  user: { id: string; name: string; email: string };
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const statusBadgeColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300',
  confirmed: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300',
  completed: 'bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300',
  cancelled: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300',
  no_show: 'bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
};

const blockBorderColors: Record<string, string> = {
  pending: 'border-l-amber-400',
  confirmed: 'border-l-emerald-400',
  completed: 'border-l-sky-400',
  cancelled: 'border-l-red-300',
  no_show: 'border-l-gray-300',
};

const blockBgColors: Record<string, string> = {
  pending: 'bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30',
  confirmed: 'bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30',
  completed: 'bg-sky-50/50 hover:bg-sky-50 dark:bg-sky-950/20 dark:hover:bg-sky-950/30',
  cancelled: 'bg-red-50/30 hover:bg-red-50/50 dark:bg-red-950/10 dark:hover:bg-red-950/20',
  no_show: 'bg-gray-50/50 hover:bg-gray-50 dark:bg-gray-800/20 dark:hover:bg-gray-800/30',
};

const speciesEmojis: Record<string, string> = {
  perro: '🐕',
  gato: '🐈',
  ave: '🐦',
  reptil: '🦎',
  conejo: '🐰',
  hámster: '🐹',
  hamster: '🐹',
  pez: '🐠',
  serpiente: '🐍',
  otro: '🐾',
};

function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatLongDate(date: Date): string {
  return format(date, 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es });
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}

const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const fetchAppointments = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = formatDateStr(date);
      const res = await fetch(`/api/appointments?date=${dateStr}&limit=100`, {
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
  }, []);

  useEffect(() => {
    fetchAppointments(selectedDate);
  }, [selectedDate, fetchAppointments]);

  const goToPrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const goToToday = () => setSelectedDate(new Date());

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const statusCounts: Record<string, number> = {};
  appointments.forEach((apt) => {
    statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1;
  });

  const sortedAppointments = [...appointments].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' as const }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-emerald-600" />
          Calendario
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Vista diaria de citas</p>
      </div>

      {/* Status Legend */}
      <Card className="border-gray-200 dark:border-gray-700 bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">
              Leyenda
            </span>
            <LegendItem color="bg-amber-400" label="Pendiente" />
            <LegendItem color="bg-emerald-400" label="Confirmada" />
            <LegendItem color="bg-sky-400" label="Completada" />
            <LegendItem color="bg-red-400" label="Cancelada" />
            <LegendItem color="bg-gray-400" label="No asistió" />
            <div className="ml-auto flex items-center gap-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Badge key={status} className={`${statusBadgeColors[status] || ''} text-[10px] px-1.5 py-0`}>
                  {count} {statusLabels[status]}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Navigation */}
      <Card className={`border-gray-200 dark:border-gray-700 ${isToday ? 'ring-2 ring-emerald-200 dark:ring-emerald-800/50 shadow-md shadow-emerald-100/50 dark:shadow-emerald-900/20' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPrevDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 font-medium">
                    <CalendarIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="capitalize">{formatLongDate(selectedDate)}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setCalendarOpen(false);
                      }
                    }}
                    className="rounded-md border"
                  />
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="sm" onClick={goToNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {!isToday && (
                <Button variant="ghost" size="sm" onClick={goToToday} className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                  Hoy
                </Button>
              )}
              {isToday && (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Hoy
                </Badge>
              )}
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300">
                {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily View */}
      <Card className={`border-gray-200 dark:border-gray-700 ${isToday ? 'ring-1 ring-emerald-100 dark:ring-emerald-900/30' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 capitalize flex items-center gap-2">
            {isToday && <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
            {formatLongDate(selectedDate)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : sortedAppointments.length > 0 ? (
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {sortedAppointments.map((apt, idx) => {
                  const petEmoji = speciesEmojis[apt.pet.species.toLowerCase()] || '🐾';
                  const isCancelled = apt.status === 'cancelled';

                  return (
                    <motion.div
                      key={apt.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2, delay: idx * 0.04, ease: 'easeOut' as const }}
                      className={`rounded-lg border-l-4 ${blockBorderColors[apt.status] || 'border-l-gray-300'} ${blockBgColors[apt.status] || 'bg-gray-50'} p-4 cursor-pointer transition-all duration-200 hover:shadow-md`}
                      onClick={() => router.visit(`/admin/appointments/${apt.id}`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                            <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <span className={isCancelled ? 'line-through opacity-60' : ''}>
                              {apt.startTime} - {apt.endTime}
                            </span>
                          </div>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span className={`text-sm font-medium ${isCancelled ? 'line-through opacity-60 text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {apt.service.name}
                          </span>
                        </div>

                        <Badge className={`${statusBadgeColors[apt.status] || ''} text-xs`}>
                          {statusLabels[apt.status] || apt.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base leading-none">{petEmoji}</span>
                          <PawPrint className="h-3.5 w-3.5" />
                          <span className={isCancelled ? 'line-through opacity-60' : ''}>{apt.pet.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          <span className={isCancelled ? 'line-through opacity-60' : ''}>{apt.user.name}</span>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
                          {apt.pet.breed || apt.pet.species}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800/50 mb-4">
                <CalendarIcon className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin citas</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
                No hay citas programadas para este día
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

Calendar.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;