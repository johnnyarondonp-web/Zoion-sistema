import { useEffect, useState, useCallback, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Calendar, Clock, XCircle, CalendarSync, DollarSign,
  StickyNote, FileText, AlertTriangle, Loader2, PawPrint, Stethoscope,
  Receipt, Printer, X, Activity, Pill, ClipboardList, MessageCircle,
  Send, CheckCircle2, CircleDot, Timer, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ClientLayout from '@/components/layout/ClientLayout';

// ─── Types ───────────────────────────────────────────────────────────────────
interface AppointmentDetailProps {
  appointmentId: string;
}

interface ClinicalNoteItem {
  id: string;
  note: string;
  diagnosis: string | null;
  treatment: string | null;
  followUp: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MessageItem {
  id: string;
  message: string;
  createdAt: string;
  user: { id: string; name: string; role: string };
}

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  clinicalNotes: string | null;
  statusHistory: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  rating: number | null;
  review: string | null;
  pet: { id: string; name: string; photo: string | null; species: string; breed: string | null };
  service: { id: string; name: string; price: number; durationMinutes: number };
  clinicalNotesRecords?: ClinicalNoteItem[];
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' },
  confirmed: { label: 'Confirmada', className: 'bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400' },
  completed: { label: 'Completada', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' },
  cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
  no_show: { label: 'No asistió', className: 'bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400' },
};

const STATUS_DOT_COLORS: Record<string, string> = {
  pending: 'bg-amber-500',
  confirmed: 'bg-sky-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-red-500',
  no_show: 'bg-gray-500',
};

const STATUS_BG_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800',
  confirmed: 'bg-sky-50 dark:bg-sky-900/20 border-sky-100 dark:border-sky-800',
  completed: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800',
  cancelled: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800',
  no_show: 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700',
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  pending: 'Cita creada',
  confirmed: 'Cita confirmada',
  completed: 'Cita completada',
  cancelled: 'Cita cancelada',
  no_show: 'No asistió a la cita',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

const formatDate = (dateStr: string): string => {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
};

const formatTime = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
};

const formatPrice = (price: number): string => `$${Number(price).toFixed(2)}`;

const formatDateTime = (isoStr: string): string => {
  const date = new Date(isoStr);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const canCancel24h = (date: string, startTime: string): boolean => {
  const now = new Date();
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = startTime.split(':').map(Number);
  const aptDate = new Date(year, month - 1, day, hours, minutes);
  const minCancelTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return aptDate >= minCancelTime;
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function AppointmentDetail({ appointmentId }: AppointmentDetailProps) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const fetchAppointment = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/client/appointments/${id}`, {
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
  }, []);

  const fetchMessages = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/client/appointments/${id}/messages`, {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success) setMessages(data.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (appointmentId) {
      fetchAppointment(appointmentId);
      fetchMessages(appointmentId);
    }
  }, [appointmentId, fetchAppointment, fetchMessages]);

  const handleCancel = async () => {
    if (!appointment || cancelling) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/client/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
        body: JSON.stringify({ status: 'cancelled', cancelReason: cancelReason.trim() || null }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Cita cancelada exitosamente');
        setAppointment(data.data);
        setCancelDialogOpen(false);
        setCancelReason('');
      } else {
        toast.error(data.error || 'Error al cancelar la cita');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setCancelling(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !appointment) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/client/appointments/${appointment.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        fetchMessages(appointment.id);
      } else {
        toast.error(data.error || 'Error al enviar mensaje');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSubmitRating = async () => {
    if (ratingValue < 1 || !appointment) {
      toast.error('Selecciona al menos 1 estrella');
      return;
    }
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/client/appointments/${appointment.id}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
        body: JSON.stringify({ rating: ratingValue, review: reviewText.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('¡Gracias por tu calificación!');
        setAppointment({ ...appointment, rating: data.data.rating, review: data.data.review });
        setRatingValue(0);
        setReviewText('');
      } else {
        toast.error(data.error || 'Error al enviar calificación');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handlePrint = () => window.print();

  // Memoized derived state
  const st = useMemo(() => appointment ? STATUS_CONFIG[appointment.status] || STATUS_CONFIG.pending : STATUS_CONFIG.pending, [appointment?.status]);
  const canCancel = useMemo(() => appointment ? (appointment.status === 'pending' || appointment.status === 'confirmed') && canCancel24h(appointment.date, appointment.startTime) : false, [appointment]);
  const cannotCancelReason = useMemo(() => appointment ? (appointment.status === 'pending' || appointment.status === 'confirmed') && !canCancel24h(appointment.date, appointment.startTime) : false, [appointment]);
  const canReschedule = useMemo(() => appointment ? (appointment.status === 'pending' || appointment.status === 'confirmed') : false, [appointment]);
  const isCompleted = appointment?.status === 'completed';
  const clinicalNotesRecords = appointment?.clinicalNotesRecords || [];

  const statusHistory = useMemo(() => {
    if (!appointment?.statusHistory) return [{ status: appointment?.status || 'pending', date: new Date().toISOString() }];
    try { return JSON.parse(appointment.statusHistory) as Array<{ status: string; date: string }>; }
    catch { return [{ status: appointment.status, date: new Date().toISOString() }]; }
  }, [appointment]);

  if (loading || !appointment) {
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
            <Skeleton className="h-4 w-36" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Receipt Overlay */}
      <AnimatePresence>
        {showReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 print:block print:bg-white print:relative print:inset-auto print:z-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setShowReceipt(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="receipt-printable bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-4 no-print">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Recibo de Cita</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowReceipt(false)} className="h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <PawPrint className="h-6 w-6 text-emerald-600" />
                    <h1 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">Clínica Veterinaria Zoion</h1>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Av. de la Constitución 42, Madrid</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tel: +34 900 123 456</p>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Nº de Recibo</span>
                    <span className="font-mono text-gray-700 dark:text-gray-300">{appointment.id.slice(-8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Fecha</span>
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{formatDate(appointment.date)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Hora</span>
                    <span className="text-gray-700 dark:text-gray-300">{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Mascota</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{appointment.pet.name}</span>
                  </div>
                  {appointment.pet.breed && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Raza</span>
                      <span className="text-gray-700 dark:text-gray-300">{appointment.pet.breed}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Servicio</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{appointment.service.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Duración</span>
                    <span className="text-gray-700 dark:text-gray-300">{appointment.service.durationMinutes} min</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-semibold">
                    <span className="text-gray-900 dark:text-gray-100">Total</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{formatPrice(appointment.service.price)}</span>
                  </div>
                </div>

                {(clinicalNotesRecords.length > 0 || appointment.clinicalNotes) && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                        <Stethoscope className="h-4 w-4 text-emerald-600" />
                        Resumen Clínico
                      </h3>
                      {clinicalNotesRecords.map((cn) => (
                        <div key={cn.id} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 space-y-1.5">
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cn.note}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {cn.diagnosis && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400">
                                Dx: {cn.diagnosis}
                              </span>
                            )}
                            {cn.treatment && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                                Tx: {cn.treatment}
                              </span>
                            )}
                            {cn.followUp && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                Seguimiento: {cn.followUp}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {appointment.clinicalNotes && clinicalNotesRecords.length === 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{appointment.clinicalNotes}</p>
                      )}
                    </div>
                  </>
                )}

                <Separator className="my-4" />

                <div className="text-center">
                  <p className="text-xs text-gray-400 dark:text-gray-500">Gracias por confiar en Clínica Veterinaria Zoion</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">
                    Este recibo es válido como comprobante de servicio
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-2 no-print">
                <Button onClick={handlePrint} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimir Recibo
                </Button>
                <Button variant="outline" onClick={() => setShowReceipt(false)} className="flex-1">
                  Cerrar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.visit('/client/appointments')}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Detalle de Cita</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(appointment.date)}</p>
          </div>
          <Badge variant="secondary" className={`${st.className} text-sm px-3 py-1`}>
            {st.label}
          </Badge>
        </div>

        {/* Main Info Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6 space-y-5">
              {/* Service */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{appointment.service.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      <DollarSign className="h-3.5 w-3.5" />
                      {formatPrice(appointment.service.price)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Pet */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl overflow-hidden bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                  {appointment.pet.photo ? (
                    <img src={appointment.pet.photo} alt={appointment.pet.name} className="h-full w-full object-cover" />
                  ) : (
                    <PawPrint className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Mascota</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{appointment.pet.name}</p>
                  {appointment.pet.breed && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{appointment.pet.breed}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Date & Time Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Fecha</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(appointment.date)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Horario</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</p>
                </div>
              </div>

              {/* Client Notes */}
              {appointment.notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <StickyNote className="h-3 w-3" /> Notas del cliente
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">{appointment.notes}</p>
                  </div>
                </>
              )}

              {/* Clinical Notes */}
              {(clinicalNotesRecords.length > 0 || appointment.clinicalNotes) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Stethoscope className="h-3 w-3" /> Notas clínicas del veterinario
                    </p>
                    {clinicalNotesRecords.length > 0 ? (
                      <div className="space-y-3">
                        {clinicalNotesRecords.map((cn, idx) => (
                          <motion.div
                            key={cn.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3 space-y-2 relative pl-5"
                          >
                            {idx < clinicalNotesRecords.length - 1 && (
                              <div className="absolute left-[7px] top-full w-px h-3 bg-emerald-200 dark:bg-emerald-800" />
                            )}
                            <div className="absolute left-0 top-3 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white dark:border-gray-800" />
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cn.note}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {cn.diagnosis && (
                                <Badge variant="outline" className="text-[10px] border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20">
                                  <Activity className="h-2.5 w-2.5 mr-1" />
                                  {cn.diagnosis}
                                </Badge>
                              )}
                              {cn.treatment && (
                                <Badge variant="outline" className="text-[10px] border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20">
                                  <Pill className="h-2.5 w-2.5 mr-1" />
                                  {cn.treatment}
                                </Badge>
                              )}
                              {cn.followUp && (
                                <Badge variant="outline" className="text-[10px] border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20">
                                  <ClipboardList className="h-2.5 w-2.5 mr-1" />
                                  {cn.followUp}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">{formatDateTime(cn.createdAt)}</p>
                          </motion.div>
                        ))}
                      </div>
                    ) : appointment.clinicalNotes ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">{appointment.clinicalNotes}</p>
                    ) : null}
                  </div>
                </>
              )}

              {/* Cancellation Info */}
              {appointment.status === 'cancelled' && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-red-400 dark:text-red-500 uppercase tracking-wider flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Información de cancelación
                    </p>
                    {appointment.cancelledAt && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Cancelada el {new Date(appointment.cancelledAt).toLocaleDateString('es-ES', {
                          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                    {appointment.cancelReason && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">{appointment.cancelReason}</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Timeline */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.075 }}>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-gray-100">
                <Timer className="h-5 w-5 text-emerald-600" />
                Historial de Estado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {statusHistory.map((entry, idx) => {
                  const stConf = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending;
                  const desc = STATUS_DESCRIPTIONS[entry.status] || entry.status;
                  const dotColor = STATUS_DOT_COLORS[entry.status] || 'bg-gray-400';
                  const bgColor = STATUS_BG_COLORS[entry.status] || 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700';
                  return (
                    <motion.div
                      key={`${entry.status}-${idx}`}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1, duration: 0.3 }}
                      className="relative pl-8 pb-4 last:pb-0"
                    >
                      {idx < statusHistory.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                      )}
                      <div className={`absolute left-0 top-1.5 h-6 w-6 rounded-full ${dotColor} flex items-center justify-center ring-4 ring-white dark:ring-gray-900`}>
                        {entry.status === 'completed' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                        ) : entry.status === 'cancelled' ? (
                          <XCircle className="h-3.5 w-3.5 text-white" />
                        ) : (
                          <CircleDot className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className={`rounded-lg border p-3 ${bgColor}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className={`${stConf.className} text-[10px]`}>
                            {stConf.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{desc}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {new Date(entry.date).toLocaleDateString('es-ES', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Messages Section */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-gray-100">
                  <MessageCircle className="h-5 w-5 text-emerald-600" />
                  Mensajes
                  {messages.length > 0 && (
                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                      {messages.length}
                    </span>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-center">
                    <MessageCircle className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No hay mensajes en esta cita</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Envía un mensaje si tienes preguntas sobre tu cita
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isClient = msg.user.role === 'client';
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 ${
                          isClient
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-semibold ${isClient ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`}>
                              {msg.user.name}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                              isClient
                                ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300'
                                : 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400'
                            }`}>
                              {isClient ? 'Tú' : 'Veterinario'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{msg.message}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(msg.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rating Section */}
        {isCompleted && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-gray-100">
                  <Star className="h-5 w-5 text-amber-500" />
                  {appointment.rating ? 'Tu Calificación' : 'Calificar Cita'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {appointment.rating ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <motion.div
                          key={star}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: star * 0.08, type: 'spring', stiffness: 400, damping: 15 }}
                        >
                          <Star
                            className={`h-7 w-7 ${
                              star <= (appointment.rating || 0)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        </motion.div>
                      ))}
                      <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {appointment.rating}/5
                      </span>
                    </div>
                    {appointment.review && (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{appointment.review}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        ¿Cómo fue tu experiencia con esta cita?
                      </p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <motion.button
                            key={star}
                            type="button"
                            onClick={() => setRatingValue(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            className="focus:outline-none"
                          >
                            <motion.div
                              animate={{ scale: star <= (hoverRating || ratingValue) ? 1.1 : 1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            >
                              <Star
                                className={`h-9 w-9 transition-colors duration-150 ${
                                  star <= (hoverRating || ratingValue)
                                    ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                                    : 'text-gray-300 dark:text-gray-600 hover:text-amber-300'
                                }`}
                              />
                            </motion.div>
                          </motion.button>
                        ))}
                        {ratingValue > 0 && (
                          <motion.span
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="ml-2 text-sm font-medium text-amber-600 dark:text-amber-400"
                          >
                            {ratingValue === 1 ? 'Malo' : ratingValue === 2 ? 'Regular' : ratingValue === 3 ? 'Bueno' : ratingValue === 4 ? 'Muy bueno' : 'Excelente'}
                          </motion.span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Comentario (opcional)
                      </Label>
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Cuéntanos tu experiencia..."
                        rows={3}
                        className="mt-1 flex w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 resize-none"
                      />
                    </div>
                    <Button
                      onClick={handleSubmitRating}
                      disabled={submittingRating || ratingValue === 0}
                      className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                    >
                      <Star className="h-4 w-4" />
                      {submittingRating ? 'Enviando...' : 'Enviar Calificación'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {isCompleted && (
                  <Button onClick={() => setShowReceipt(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 gap-2">
                    <Receipt className="h-4 w-4" />
                    Ver Recibo
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="outline"
                    onClick={() => setCancelDialogOpen(true)}
                    className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar Cita
                  </Button>
                )}
                {cannotCancelReason && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 flex-1">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>La cita no puede cancelarse (requiere al menos 24h de anticipación)</span>
                  </div>
                )}
                {canReschedule && (
                  <Button
                    variant="outline"
                    onClick={() => router.visit(`/client/appointments/reschedule/${appointment.id}`)}
                    className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 flex-1"
                  >
                    <CalendarSync className="h-4 w-4 mr-2" />
                    Reprogramar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cancel Dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Cancelar Cita
              </AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="cancel-reason" className="text-sm font-medium">Motivo de cancelación (opcional)</Label>
              <Textarea
                id="cancel-reason"
                placeholder="¿Por qué cancelas la cita?"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancelling}>No, mantener cita</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={cancelling}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sí, cancelar cita
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
AppointmentDetail.layout = (page: React.ReactNode) => <ClientLayout>{page}</ClientLayout>;