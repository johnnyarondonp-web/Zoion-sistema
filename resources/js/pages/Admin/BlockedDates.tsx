import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminLayout from '@/components/layout/AdminLayout';
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
import { Plus, Trash2, CalendarX2, CalendarIcon, CalendarClock, PartyPopper, Wrench, UserX, CalendarCheck2, ShieldAlert, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
  createdAt: string;
}

interface SpecialOpenDate {
  id: string;
  date: string;
  openTime: string;
  closeTime: string;
  reason: string | null;
  createdAt: string;
}

const quickBlockPresets = [
  { label: 'Día festivo', reason: 'Día festivo', icon: PartyPopper, color: 'text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800/50' },
  { label: 'Mantenimiento', reason: 'Mantenimiento', icon: Wrench, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' },
  { label: 'Ausencia personal', reason: 'Ausencia personal', icon: UserX, color: 'text-gray-500 bg-gray-50 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
];

const quickOpenPresets = [
  { label: 'Sábado de guardia', reason: 'Sábado de guardia', icon: Sparkles, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' },
  { label: 'Campaña de vacunación', reason: 'Campaña de vacunación', icon: CalendarCheck2, color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-400 border-teal-200 dark:border-teal-800/50' },
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
  const [activeTab, setActiveTab] = useState<'blocked' | 'specialOpen'>('blocked');
  
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [specialOpenDates, setSpecialOpenDates] = useState<SpecialOpenDate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for Blocked Dates
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // States for Special Open Dates
  const [specialDate, setSpecialDate] = useState<Date | undefined>(undefined);
  const [specialReason, setSpecialReason] = useState('');
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('18:00');
  const [submittingSpecial, setSubmittingSpecial] = useState(false);
  const [specialCalendarOpen, setSpecialCalendarOpen] = useState(false);

  const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const [unavailableDays, setUnavailableDays] = useState<number[]>([]);

  useEffect(() => {
    Promise.all([fetchBlockedDates(), fetchSpecialOpenDates(), fetchUnavailableDays()]).finally(() => {
      setLoading(false);
    });
  }, []);

  const fetchUnavailableDays = async () => {
    try {
      const res = await fetch('/api/availability/schedule');
      const data = await res.json();
      if (data.success) {
        setUnavailableDays(data.data.unavailableDays || []);
      }
    } catch { /* silent */ }
  };

  const fetchBlockedDates = async () => {
    try {
      const res = await fetch('/api/blocked-dates');
      const data = await res.json();
      if (data.success) setBlockedDates(data.data);
    } catch { /* silent */ }
  };

  const fetchSpecialOpenDates = async () => {
    try {
      const res = await fetch('/api/special-open-dates');
      const data = await res.json();
      if (data.success) {
        // Backend returns snake_case, map to camelCase
        const mapped = (data.data as any[]).map((s) => ({
          id: s.id,
          date: s.date,
          openTime: s.open_time ?? s.openTime,
          closeTime: s.close_time ?? s.closeTime,
          reason: s.reason,
          createdAt: s.created_at ?? s.createdAt,
        }));
        setSpecialOpenDates(mapped);
      }
    } catch { /* silent */ }
  };

  const handleAddBlocked = async (presetReason?: string) => {
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
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify({ date: dateStr, reason: finalReason }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Fecha bloqueada agregada');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate.getTime() === today.getTime()) {
          toast.info('Las citas programadas para hoy han sido canceladas automáticamente.');
        }

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

  const handleDeleteBlocked = async (id: string) => {
    try {
      const res = await fetch(`/api/blocked-dates/${id}`, { 
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken()
        }
      });
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

  const handleAddSpecial = async (presetReason?: string) => {
    if (!specialDate) {
      toast.error('Selecciona una fecha');
      return;
    }
    if (openTime >= closeTime) {
      toast.error('La hora de apertura debe ser anterior a la de cierre');
      return;
    }

    const dateStr = `${specialDate.getFullYear()}-${String(specialDate.getMonth() + 1).padStart(2, '0')}-${String(specialDate.getDate()).padStart(2, '0')}`;
    const finalReason = presetReason || specialReason.trim() || null;

    setSubmittingSpecial(true);
    try {
      const res = await fetch('/api/special-open-dates', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify({ 
          date: dateStr, 
          open_time: openTime, 
          close_time: closeTime, 
          reason: finalReason 
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Día de apertura especial registrado exitosamente');
        setSpecialDate(undefined);
        setSpecialReason('');
        fetchSpecialOpenDates();
      } else {
        toast.error(data.error || 'Error al guardar el día de apertura');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSubmittingSpecial(false);
    }
  };

  const handleDeleteSpecial = async (id: string) => {
    try {
      const res = await fetch(`/api/special-open-dates/${id}`, { 
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken()
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Día de apertura especial eliminado');
        setSpecialOpenDates((prev) => prev.filter((s) => s.id !== id));
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

  const specialOpenDateStrings = useMemo(
    () => new Set(specialOpenDates.map((s) => s.date)),
    [specialOpenDates]
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
          <CalendarClock className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          Excepciones del Calendario
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gestiona los feriados no laborables y los días especiales de apertura extra
        </p>
      </div>

      {/* Modern Tabs Switcher */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 max-w-md">
        <button
          onClick={() => setActiveTab('blocked')}
          className={`flex-1 py-3 text-center text-sm font-semibold transition-all duration-200 relative ${
            activeTab === 'blocked'
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <CalendarX2 className="h-4 w-4" />
            Días No Laborables
          </span>
          {activeTab === 'blocked' && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 dark:bg-red-400"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('specialOpen')}
          className={`flex-1 py-3 text-center text-sm font-semibold transition-all duration-200 relative ${
            activeTab === 'specialOpen'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <CalendarCheck2 className="h-4 w-4" />
            Días Especiales de Apertura
          </span>
          {activeTab === 'specialOpen' && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 dark:bg-emerald-400"
            />
          )}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Mini Calendar + Quick Presets */}
        <div className="space-y-4">
          {/* Mini Calendar showing both types of exceptions */}
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Mapa de excepciones
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-gray-400">
                  {activeTab === 'blocked' ? 'Cerrando días' : 'Abriendo días'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <Calendar
                mode="single"
                selected={activeTab === 'blocked' ? selectedDate : specialDate}
                onSelect={activeTab === 'blocked' ? setSelectedDate : setSpecialDate}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (date < today) return true;
                  if (activeTab === 'blocked') {
                    // Solo permitir días que normalmente se trabajan (no en unavailableDays)
                    return unavailableDays.includes(date.getDay());
                  } else {
                    // Solo permitir días que normalmente están cerrados
                    return !unavailableDays.includes(date.getDay());
                  }
                }}
                modifiers={{
                  blocked: (date) => {
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    return blockedDateStrings.has(dateStr);
                  },
                  specialOpen: (date) => {
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    return specialOpenDateStrings.has(dateStr);
                  },
                }}
                modifiersClassNames={{
                  blocked: 'bg-red-50 text-red-500 border border-red-200 dark:bg-red-950/20 dark:text-red-400 line-through font-bold',
                  specialOpen: 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 font-bold',
                }}
                className="rounded-lg border-0 p-0"
              />
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5 text-[11px] text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-100 dark:bg-red-950/30 border border-red-200 inline-block" />
                  <span>Día No Laborable (Feriado o Cierre)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-200 inline-block" />
                  <span>Día Especial de Apertura (Extra)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Presets based on active tab */}
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Motivos rápidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {activeTab === 'blocked' ? (
                quickBlockPresets.map((preset) => {
                  const PresetIcon = preset.icon;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => setReason(preset.reason)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all duration-150 text-left ${preset.color} hover:shadow-sm ${reason === preset.reason ? 'ring-2 ring-red-400' : ''}`}
                    >
                      <PresetIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm font-medium">{preset.label}</span>
                    </button>
                  );
                })
              ) : (
                quickOpenPresets.map((preset) => {
                  const PresetIcon = preset.icon;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => setSpecialReason(preset.reason)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all duration-150 text-left ${preset.color} hover:shadow-sm ${specialReason === preset.reason ? 'ring-2 ring-emerald-400' : ''}`}
                    >
                      <PresetIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm font-medium">{preset.label}</span>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Add form + Blocked dates list */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="wait">
            {activeTab === 'blocked' ? (
              <motion.div
                key="blocked-dates-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Add New Blocked Date */}
                <Card className="border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Plus className="h-5 w-5 text-red-500" />
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
                                  // Solo bloquear fechas pasadas y días que YA están cerrados (no tiene sentido bloquear un domingo)
                                  return date < today || unavailableDays.includes(date.getDay());
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
                        onClick={() => handleAddBlocked()}
                        disabled={submitting || !selectedDate}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
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
                      <CalendarX2 className="h-5 w-5 text-red-500" />
                      Fechas bloqueadas (Cerradas)
                      {blockedDates.length > 0 && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 ml-1">
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
                                      onClick={() => handleDeleteBlocked(bd.id)}
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
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="special-open-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Add New Special Open Date */}
                <Card className="border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Plus className="h-5 w-5 text-emerald-600" />
                      Habilitar día especial (Extra)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha</Label>
                          <Popover open={specialCalendarOpen} onOpenChange={setSpecialCalendarOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal h-10 dark:border-gray-700"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {specialDate
                                  ? specialDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                                  : 'Seleccionar fecha'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={specialDate}
                                onSelect={(date) => {
                                  setSpecialDate(date);
                                  setSpecialCalendarOpen(false);
                                }}
                                disabled={(date) => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  // Solo permitir seleccionar si la fecha es futura y es un día que normalmente está cerrado (en unavailableDays)
                                  return date < today || !unavailableDays.includes(date.getDay());
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Motivo (opcional)</Label>
                          <Input
                            value={specialReason}
                            onChange={(e) => setSpecialReason(e.target.value)}
                            placeholder="Ej: Sábado de guardia, campaña..."
                            className="h-10 dark:border-gray-700"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hora de apertura</Label>
                          <Input
                            type="time"
                            value={openTime}
                            onChange={(e) => setOpenTime(e.target.value)}
                            className="h-10 dark:border-gray-700"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hora de cierre</Label>
                          <Input
                            type="time"
                            value={closeTime}
                            onChange={(e) => setCloseTime(e.target.value)}
                            className="h-10 dark:border-gray-700"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={() => handleAddSpecial()}
                        disabled={submittingSpecial || !specialDate}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {submittingSpecial ? 'Habilitando...' : 'Habilitar Día'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Special Open Dates List */}
                <Card className="border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <CalendarCheck2 className="h-5 w-5 text-emerald-600" />
                      Fechas habilitadas especialmente (Abiertas)
                      {specialOpenDates.length > 0 && (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 ml-1">
                          {specialOpenDates.length}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {specialOpenDates.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800/50 mb-3">
                          <CalendarCheck2 className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No hay fechas de apertura especial</p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                          Habilita días extra (como fines de semana) cuando lo requieras
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {specialOpenDates.map((s) => {
                          return (
                            <motion.div
                              key={s.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm capitalize">
                                    {formatDateSpanish(s.date)}
                                  </p>
                                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0">
                                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                                    {s.openTime} - {s.closeTime}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                  {s.reason || 'Día de atención extra'}
                                </p>
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
                                    <AlertDialogTitle>¿Eliminar apertura especial?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Se eliminará la apertura especial para el día{' '}
                                      <span className="font-medium capitalize">{formatDateSpanish(s.date)}</span>.
                                      Este día volverá a su estado cerrado predeterminado.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteSpecial(s.id)}
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
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

BlockedDates.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;