import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, CalendarX2, CalendarIcon, PartyPopper, Wrench, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
  createdAt: string;
}

const quickBlockPresets = [
  { label: 'Día festivo', reason: 'Día festivo', icon: PartyPopper, color: 'text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800/50' },
  { label: 'Mantenimiento', reason: 'Mantenimiento', icon: Wrench, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' },
  { label: 'Ausencia personal', reason: 'Ausencia personal', icon: UserX, color: 'text-gray-500 bg-gray-50 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
];

function getReasonCategory(reason: string | null): { color: string; label: string; icon: React.ElementType } {
  if (!reason) return { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', label: 'Sin motivo', icon: CalendarX2 };
  const lower = reason.toLowerCase();
  if (lower.includes('festivo') || lower.includes('feriado') || lower.includes('holiday')) {
    return { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Festivo', icon: PartyPopper };
  }
  if (lower.includes('mantenimiento') || lower.includes('maintenance')) {
    return { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'Mantenimiento', icon: Wrench };
  }
  if (lower.includes('personal') || lower.includes('ausencia')) {
    return { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', label: 'Personal', icon: UserX };
  }
  return { color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', label: reason, icon: CalendarX2 };
}

function formatDateSpanish(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BlockedDates() {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchBlockedDates();
  }, []);

  const fetchBlockedDates = async () => {
    try {
      const res = await fetch('/api/blocked-dates');
      const data = await res.json();
      if (data.success) setBlockedDates(data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (presetReason?: string) => {
    if (!selectedDate) {
      toast.error('Selecciona una fecha');
      return;
    }

    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const finalReason = presetReason || reason.trim() || null;

    setSubmitting(true);
    try {
      const res = await fetch('/api/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, reason: finalReason }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Fecha bloqueada agregada');
        setSelectedDate(undefined);
        setReason('');
        fetchBlockedDates();
      } else {
        toast.error(data.error || 'Error al bloquear fecha');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/blocked-dates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Fecha bloqueada eliminada');
        setBlockedDates((prev) => prev.filter((bd) => bd.id !== id));
      } else {
        toast.error(data.error || 'Error al eliminar');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  const blockedDateStrings = useMemo(
    () => new Set(blockedDates.map((bd) => bd.date)),
    [blockedDates]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          🚫 Fechas Bloqueadas
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gestiona los días en que la clínica no estará disponible
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Mini Calendar + Quick Presets */}
        <div className="space-y-4">
          {/* Mini Calendar */}
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Vista mensual
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  blocked: (date) => {
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    return blockedDateStrings.has(dateStr);
                  },
                }}
                modifiersClassNames={{
                  blocked: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 line-through',
                }}
                className="rounded-lg border-0 p-0"
              />
            </CardContent>
          </Card>

          {/* Quick Presets */}
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Motivos rápidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {quickBlockPresets.map((preset) => {
                const PresetIcon = preset.icon;
                return (
                  <button
                    key={preset.label}
                    onClick={() => setReason(preset.reason)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all duration-150 text-left ${preset.color} hover:shadow-sm ${reason === preset.reason ? 'ring-2 ring-emerald-400' : ''}`}
                  >
                    <PresetIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{preset.label}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right: Add form + Blocked dates list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add New Blocked Date */}
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Bloquear nueva fecha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha</Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal h-10 dark:border-gray-700"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate
                            ? selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                            : 'Seleccionar fecha'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date);
                            setCalendarOpen(false);
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Motivo (opcional)</Label>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ej: Feriado, mantenimiento..."
                      className="h-10 dark:border-gray-700"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => handleAdd()}
                  disabled={submitting || !selectedDate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {submitting ? 'Agregando...' : 'Bloquear Fecha'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Blocked Dates List */}
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <CalendarX2 className="h-5 w-5 text-orange-500" />
                Fechas bloqueadas
                {blockedDates.length > 0 && (
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 ml-1">
                    {blockedDates.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {blockedDates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800/50 mb-3">
                    <CalendarX2 className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No hay fechas bloqueadas</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    Agrega fechas cuando la clínica no estará disponible
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {blockedDates.map((bd) => {
                      const category = getReasonCategory(bd.reason);
                      const CategoryIcon = category.icon;

                      return (
                        <motion.div
                          key={bd.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm capitalize">
                                {formatDateSpanish(bd.date)}
                              </p>
                              <Badge className={`${category.color} text-[10px] px-1.5 py-0`}>
                                <CategoryIcon className="h-2.5 w-2.5 mr-0.5" />
                                {category.label}
                              </Badge>
                            </div>
                            {bd.reason && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{bd.reason}</p>
                            )}
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar fecha bloqueada?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se eliminará el bloqueo para el día{' '}
                                  <span className="font-medium capitalize">{formatDateSpanish(bd.date)}</span>.
                                  Esto permitirá agendar citas en esa fecha.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(bd.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </motion.div>
                      );
                    })}
                  </div>
                </AnimatePresence>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}