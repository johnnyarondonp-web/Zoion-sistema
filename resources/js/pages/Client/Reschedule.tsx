import { useEffect, useState, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Clock, CalendarSync, PawPrint, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import ClientLayout from '@/components/layout/ClientLayout';

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  pet: { id: string; name: string; photo: string | null; species: string };
  service: { id: string; name: string; price: number; durationMinutes: number };
}

interface TimeSlot {
  time: string;
  label: string;
}

interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
}

// Helpers
const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

function formatDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

export default function Reschedule() {
  // Inertia pasa el ID como prop desde el controlador
  const { appointmentId } = usePage<{ appointmentId: string }>().props;
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Selection state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);

  useEffect(() => {
    if (appointmentId) fetchAppointment(appointmentId);
  }, [appointmentId]);

  useEffect(() => {
    fetchBlockedDates();
  }, []);

  const fetchAppointment = async (id: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success) {
        setAppointment(data.data);
      } else {
        toast.error('Cita no encontrada');
        router.visit('/client/appointments');
      }
    } catch {
      toast.error('Error al cargar la cita');
      router.visit('/client/appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedDates = async () => {
    try {
      const res = await fetch('/api/blocked-dates', {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success) setBlockedDates(data.data);
    } catch { /* silent */ }
  };

  const fetchTimeSlots = useCallback(async (date: Date) => {
    if (!appointment) return;
    setLoadingSlots(true);
    setTimeSlots([]);
    setSelectedTime('');
    try {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const res = await fetch(`/api/availability?date=${dateStr}&serviceId=${appointment.service.id}`, {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success && data.data.available) {
        setTimeSlots(data.data.slots || []);
      } else {
        setTimeSlots([]);
      }
    } catch {
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [appointment]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) fetchTimeSlots(date);
  };

  const isDateBlocked = (date: Date): boolean => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return blockedDates.some((bd) => bd.date === dateStr);
  };

  const isDatePast = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleSubmit = async () => {
    if (!appointment || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    try {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json', 
          'X-Requested-With': 'XMLHttpRequest', 
          'X-CSRF-TOKEN': getCsrfToken() 
        },
        body: JSON.stringify({ date: dateStr, startTime: selectedTime }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Cita reprogramada exitosamente');
        router.visit('/client/appointments');
      } else {
        toast.error(data.error || 'Error al reprogramar la cita');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appointment) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.visit(`/client/appointments/${appointment.id}`)}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reprogramar Cita</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Selecciona una nueva fecha y horario</p>
        </div>
      </div>

      {/* Current Appointment Info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10">
          <CardContent className="p-4">
            <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-3">
              Cita Actual
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-gray-400 dark:text-gray-500">Servicio</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{appointment.service.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-400 dark:text-gray-500">Mascota</p>
                <div className="flex items-center gap-1.5">
                  {appointment.pet.photo ? (
                    <img src={appointment.pet.photo} alt="" className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <PawPrint className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  )}
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{appointment.pet.name}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Fecha
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(appointment.date)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Horario
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Select Date */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              Nueva Fecha
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Selecciona la nueva fecha para tu cita</p>
            <div className="flex flex-col items-center">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => isDatePast(date) || isDateBlocked(date)}
                className="rounded-lg border shadow-sm"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Select Time */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-600" />
                Nuevo Horario
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {formatDateLong(selectedDate)}
              </p>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Buscando horarios...</span>
                </div>
              ) : timeSlots.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Clock className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No hay horarios disponibles para esta fecha</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {timeSlots.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    const hour = parseInt(slot.time.split(':')[0]);
                    const period = hour < 12 ? 'AM' : 'PM';

                    return (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2.5 text-sm transition-all duration-150 ${
                          isSelected
                            ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-200 dark:ring-emerald-700'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-200 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20'
                        }`}
                      >
                        <span className="font-medium">{slot.label.replace(/ (AM|PM)$/, '')}</span>
                        <span className={`text-[10px] font-semibold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {period}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.visit(`/client/appointments/${appointment.id}`)}
          className="flex-1 border-gray-300 dark:border-gray-600"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!selectedDate || !selectedTime || submitting}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <CalendarSync className="h-4 w-4 mr-2" />
          Confirmar Reprogramación
        </Button>
      </div>
    </div>
  );
}
Reschedule.layout = (page: React.ReactNode) => <ClientLayout>{page}</ClientLayout>;