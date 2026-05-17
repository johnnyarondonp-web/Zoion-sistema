import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminLayout from '@/components/layout/AdminLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Save, Clock, CalendarDays, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Schedule {
  id?: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isAvailable: boolean;
}

const dayNames: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

const dayShortNames: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

const dayColors: Record<number, { open: string; closed: string; badge: string }> = {
  0: { open: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/50', closed: 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700', badge: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  1: { open: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/50', closed: 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700', badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  2: { open: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/50', closed: 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700', badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  3: { open: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/50', closed: 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700', badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  4: { open: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/50', closed: 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700', badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  5: { open: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/50', closed: 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700', badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  6: { open: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/50', closed: 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700', badge: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
};

const defaultSchedule: Schedule[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  openTime: '09:00',
  closeTime: '18:00',
  isAvailable: i >= 1 && i <= 5, // Monday to Friday
}));

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}


function minutesToPercentage(minutes: number): number {
  return Math.min(100, Math.max(0, (minutes / (24 * 60)) * 100));
}

function TimeRangeBar({ openTime, closeTime, isAvailable }: { openTime: string; closeTime: string; isAvailable: boolean }) {
  if (!isAvailable) {
    return (
      <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className="h-full w-full flex items-center justify-center">
          <span className="text-[8px] text-gray-400 font-medium">CERRADO</span>
        </div>
      </div>
    );
  }

  const openMin = timeToMinutes(openTime);
  const closeMin = timeToMinutes(closeTime);
  const leftPct = minutesToPercentage(openMin);
  const widthPct = minutesToPercentage(closeMin) - leftPct;

  return (
    <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
      {[0, 6, 12, 18, 24].map((hour) => {
        const pct = (hour / 24) * 100;
        return (
          <div
            key={hour}
            className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700"
            style={{ left: `${pct}%` }}
          />
        );
      })}
      <motion.div
        initial={{ width: 0, left: `${leftPct}%` }}
        animate={{ width: `${widthPct}%`, left: `${leftPct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
      />
      <span className="absolute top-1/2 -translate-y-1/2 text-[8px] font-semibold text-emerald-700 dark:text-emerald-400" style={{ left: `${leftPct + 1}%` }}>
        {openTime}
      </span>
      <span className="absolute top-1/2 -translate-y-1/2 text-[8px] font-semibold text-teal-700 dark:text-teal-400" style={{ left: `${leftPct + widthPct - 7}%` }}>
        {closeTime}
      </span>
    </div>
  );
}

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>(defaultSchedule);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/schedules', {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        // El backend devuelve snake_case — normalizar antes de usar.
        const normalized = (data.data as any[]).map((s) => ({
          dayOfWeek: s.day_of_week ?? s.dayOfWeek,
          openTime:  s.open_time  ?? s.openTime,
          closeTime: s.close_time ?? s.closeTime,
          isAvailable: s.is_available ?? s.isAvailable,
        }));
        const scheduleMap = new Map(normalized.map((s) => [s.dayOfWeek, s]));
        const merged = defaultSchedule.map((def) => {
          const existing = scheduleMap.get(def.dayOfWeek);
          return existing || def;
        });
        setSchedules(merged);
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    for (const s of schedules) {
      if (s.isAvailable) {
        if (!s.openTime || !s.closeTime) {
          toast.error(`${dayNames[s.dayOfWeek]}: horario incompleto`);
          return;
        }
        if (s.openTime >= s.closeTime) {
          toast.error(`${dayNames[s.dayOfWeek]}: la hora de apertura debe ser anterior a la de cierre`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = schedules.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        openTime: s.openTime,
        closeTime: s.closeTime,
        isAvailable: s.isAvailable,
      }));

      const res = await fetch('/api/schedules', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Horarios guardados exitosamente');
        fetchSchedules();
      } else {
        toast.error(data.error || 'Error al guardar horarios');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const updateSchedule = (dayOfWeek: number, updates: Partial<Schedule>) => {
    setSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, ...updates } : s))
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const openDays = schedules.filter((s) => s.isAvailable).length;
  const closedDays = schedules.filter((s) => !s.isAvailable).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Clock className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Horarios
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configura el horario general recurrente de la clínica (se aplica a todas las semanas).
          </p>
        </div>
      </div>



      {/* Weekly Overview Cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Plantilla Semanal Recurrente
        </h2>
        <div className="grid grid-cols-7 gap-2">
          {schedules.map((schedule) => {
            const colors = dayColors[schedule.dayOfWeek];
            const isOpen = schedule.isAvailable;

            return (
              <motion.div
                key={schedule.dayOfWeek}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: schedule.dayOfWeek * 0.05 }}
                className={`rounded-xl border-2 p-3 text-center transition-all duration-200 ${
                  isOpen ? colors.open : colors.closed
                }`}
              >
                <p className={`text-xs font-bold ${isOpen ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {dayShortNames[schedule.dayOfWeek]}
                </p>
                {isOpen ? (
                  <>
                    <div className="flex items-center justify-center mt-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                      {schedule.openTime}
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {schedule.closeTime}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center mt-1.5">
                      <XCircle className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium">Cerrado</p>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Abierto ({openDays} días)
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <div className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
            Cerrado ({closedDays} días)
          </div>
        </div>
      </div>

      {/* Detailed Schedule Editor */}
      <Card className="border-gray-200 dark:border-gray-700 max-w-4xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Horario semanal detallado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-800">
            {schedules.map((schedule, idx) => {
              const dayName = dayNames[schedule.dayOfWeek];
              const isDisabled = !schedule.isAvailable;

              return (
                <motion.div
                  key={schedule.dayOfWeek}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.04 }}
                  className={`py-4 transition-all duration-200 ${isDisabled ? 'opacity-50' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-2">
                    <div className="w-28 flex-shrink-0 flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${schedule.isAvailable ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {dayName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-32 flex-shrink-0">
                      <Switch
                        checked={schedule.isAvailable}
                        onCheckedChange={(checked) =>
                          updateSchedule(schedule.dayOfWeek, { isAvailable: checked })
                        }
                      />
                      <Badge
                        className={
                          schedule.isAvailable
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 text-xs'
                        }
                      >
                        {schedule.isAvailable ? 'Abierto' : 'Cerrado'}
                      </Badge>
                    </div>

                    <div className={`flex items-center gap-3 flex-1 ${isDisabled ? 'pointer-events-none' : ''}`}>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 w-12">Apertura</Label>
                        <Input
                          type="time"
                          value={schedule.openTime}
                          onChange={(e) =>
                            updateSchedule(schedule.dayOfWeek, { openTime: e.target.value })
                          }
                          className="w-32 h-9 text-sm dark:border-gray-700"
                          disabled={isDisabled}
                        />
                      </div>
                      <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 w-10">Cierre</Label>
                        <Input
                          type="time"
                          value={schedule.closeTime}
                          onChange={(e) =>
                            updateSchedule(schedule.dayOfWeek, { closeTime: e.target.value })
                          }
                          className="w-32 h-9 text-sm dark:border-gray-700"
                          disabled={isDisabled}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="sm:ml-[9.5rem]">
                    <TimeRangeBar
                      openTime={schedule.openTime}
                      closeTime={schedule.closeTime}
                      isAvailable={schedule.isAvailable}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* General Advice Alert Moved to Bottom */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sky-800 dark:bg-sky-950/20 dark:border-sky-900/50 dark:text-sky-300 text-sm w-full mt-4"
      >
        <span className="font-semibold">💡 Consejo de gestión:</span> Este panel define el horario de apertura fijo que se repite <strong>todas las semanas</strong>. Si necesitas abrir o cerrar un día específico (como un feriado o habilitar un sábado de guardia único), no alteres este horario general; en su lugar, utiliza el nuevo módulo de <a href="/admin/blocked-dates" className="underline font-medium hover:text-sky-700 dark:hover:text-sky-400">📅 Excepciones del Calendario</a> para gestionar fechas especiales sin afectar al resto del año.
      </motion.div>
    </motion.div>
  );
}

Schedules.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;