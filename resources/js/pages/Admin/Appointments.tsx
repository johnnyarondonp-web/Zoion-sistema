import { useEffect, useState, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  UserX,
  Filter,
  CalendarDays,
  Download,
  Stethoscope,
  Syringe,
  Scissors,
  ShieldCheck,
  Activity,
  Plus,
  Loader2,
  MessageCircle,
  Send,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { formatTime12h } from '@/lib/format';

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  paymentAmount: number | null;
  pet: { id: string; name: string; species: string; breed: string | null };
  service: { id: string; name: string; durationMinutes: number; price: number };
  user: { id: string; name: string; email: string; phone?: string };
  unreadMessages?: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Service {
  id: string;
  name: string;
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

const getCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

const validTransitions: Record<string, Array<{ status: string; label: string; icon: React.ReactNode }>> = {
  pending: [
    { status: 'confirmed', label: 'Confirmar', icon: <CheckCircle2 className="h-4 w-4 mr-2 text-sky-600" /> },
    { status: 'cancelled', label: 'Cancelar', icon: <XCircle className="h-4 w-4 mr-2 text-red-600" /> },
    { status: 'no_show', label: 'No asistió', icon: <UserX className="h-4 w-4 mr-2 text-gray-600" /> },
  ],
  confirmed: [
    { status: 'completed', label: 'Completar', icon: <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" /> },
    { status: 'cancelled', label: 'Cancelar', icon: <XCircle className="h-4 w-4 mr-2 text-red-600" /> },
    { status: 'no_show', label: 'No asistió', icon: <UserX className="h-4 w-4 mr-2 text-gray-600" /> },
  ],
};

function formatFullDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function isAppointmentOver(date: string, endTime: string): boolean {
  const now = new Date();
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = endTime.split(':').map(Number);
  const aptEnd = new Date(year, month - 1, day, hour, minute);
  return now > aptEnd;
}

export default function Appointments({ selectedAppointmentId }: { selectedAppointmentId?: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Modal de pago al completar una cita
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentModalAppointmentId, setPaymentModalAppointmentId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMin, setPaymentMin] = useState<number | null>(null);
  const [paymentMax, setPaymentMax] = useState<number | null>(null);

  // Modal de nueva cita (admin agenda para un cliente)
  const [newAppointmentModalOpen, setNewAppointmentModalOpen] = useState(false);
  const [newAptClientSearch, setNewAptClientSearch] = useState('');
  const [newAptClients, setNewAptClients] = useState<{ id: string; name: string; email: string; pets: { id: string; name: string; species: string }[] }[]>([]);
  const [newAptSelectedClient, setNewAptSelectedClient] = useState<{ id: string; name: string; email: string; pets: { id: string; name: string; species: string }[] } | null>(null);
  const [newAptSelectedPetId, setNewAptSelectedPetId] = useState('');
  const [newAptSelectedServiceId, setNewAptSelectedServiceId] = useState('');
  const [newAptDate, setNewAptDate] = useState('');
  const [newAptTime, setNewAptTime] = useState('');
  const [newAptSlots, setNewAptSlots] = useState<{ time: string; label: string }[]>([]);
  const [newAptLoadingSlots, setNewAptLoadingSlots] = useState(false);
  const [newAptSubmitting, setNewAptSubmitting] = useState(false);

  // Chat messages
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services?all=true');
      const data = await res.json();
      if (data.success) setServices(data.data);
    } catch {
      // silent
    }
  };

  const fetchAppointments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (serviceFilter && serviceFilter !== 'all') params.set('serviceId', serviceFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/appointments?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        let filteredAppointments = data.data.appointments as Appointment[];

        if (search.trim()) {
          const q = search.toLowerCase();
          filteredAppointments = filteredAppointments.filter(
            (apt) =>
              apt.pet.name.toLowerCase().includes(q) ||
              apt.user.name.toLowerCase().includes(q) ||
              apt.service.name.toLowerCase().includes(q)
          );
        }

        setAppointments(filteredAppointments);
        setPagination(data.data.pagination);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [statusFilter, serviceFilter, dateFrom, dateTo, search]);

  const fetchMessages = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}/messages`, {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
        const hasUnread = data.data.some((m: any) => !m.isReadByAdmin);
        if (hasUnread) {
          fetch(`/api/appointments/${id}/messages/read`, {
            method: 'PATCH',
            headers: { 'Accept': 'application/json', 'X-CSRF-TOKEN': getCsrfToken() }
          }).catch(() => {});
        }
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchAppointments(1);
  }, [fetchAppointments]);

  useEffect(() => {
    if (selectedAppointmentId) {
      fetch(`/api/appointments/${selectedAppointmentId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setSelectedAppointment(data.data);
            setIsSheetOpen(true);
            fetchMessages(data.data.id);
          }
        });
    }
  }, [selectedAppointmentId, fetchMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedAppointment) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({ message: newMessage.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.data]);
        setNewMessage('');
      }
    } catch {
      toast.error('No se pudo enviar el mensaje');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    setChangingStatus(appointmentId);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Estado cambiado a "${statusLabels[newStatus]}"`);
        fetchAppointments(pagination.page);
      } else {
        toast.error(data.error || 'Error al cambiar estado');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setChangingStatus(null);
    }
  };

  // Intercepta el cambio a "completed" para abrir el modal de pago primero.
  const handleCompleteWithPayment = (appointmentId: string) => {
    const apt = appointments.find(a => a.id === appointmentId) || selectedAppointment;
    if (!apt) return;
    const p = parseFloat(apt.service.price.toString());
    setPaymentAmount(p.toString());
    setPaymentMin(p * 0.8);
    setPaymentMax(p * 1.5);
    setPaymentMethod((apt as any)?.paymentMethod || 'cash');
    setPaymentModalAppointmentId(appointmentId);
    setPaymentModalOpen(true);
  };

  const confirmPayment = async () => {
    if (!paymentModalAppointmentId) return;
    const val = parseFloat(paymentAmount);
    if (paymentMin !== null && paymentMax !== null) {
      if (isNaN(val) || val < paymentMin || val > paymentMax) {
        toast.error(`El monto debe estar entre $${paymentMin.toFixed(2)} y $${paymentMax.toFixed(2)}`);
        return;
      }
    }

    setChangingStatus(paymentModalAppointmentId);
    try {
      const res = await fetch(`/api/appointments/${paymentModalAppointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
        body: JSON.stringify({
          status: 'completed',
          paymentMethod: paymentMethod,
          paymentStatus: 'paid',
          paymentAmount: parseFloat(paymentAmount) || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Cita completada y pago registrado');
        setPaymentModalOpen(false);
        fetchAppointments(pagination.page);
        if (selectedAppointment?.id === paymentModalAppointmentId) {
          setSelectedAppointment(prev => prev ? { ...prev, status: 'completed' } : null);
        }
      } else {
        toast.error(data.error || 'Error al registrar el pago');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setChangingStatus(null);
    }
  };

  // Búsqueda de clientes con debounce para el modal de nueva cita
  useEffect(() => {
    if (!newAptClientSearch || newAptClientSearch.length < 2) { setNewAptClients([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/clients?search=${encodeURIComponent(newAptClientSearch)}&limit=5`);
        const data = await res.json();
        if (data.success) setNewAptClients(data.data.clients || []);
      } catch { /* silent */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [newAptClientSearch]);

  const handleSelectNewAptClient = async (client: typeof newAptClients[0]) => {
    setNewAptSelectedClient({ ...client, pets: [] });
    setNewAptClientSearch(client.name);
    setNewAptClients([]);
    try {
      const res = await fetch(`/api/pets?userId=${client.id}`);
      const data = await res.json();
      if (data.success) setNewAptSelectedClient(prev => prev ? { ...prev, pets: data.data || [] } : null);
    } catch { /* silent */ }
  };

  // Cargar slots cuando cambia fecha o servicio en el modal de nueva cita
  useEffect(() => {
    if (!newAptDate || !newAptSelectedServiceId) return;
    setNewAptLoadingSlots(true);
    fetch(`/api/availability?date=${newAptDate}&serviceId=${newAptSelectedServiceId}`)
      .then(r => r.json())
      .then(data => { setNewAptSlots(data.data?.slots || []); })
      .finally(() => setNewAptLoadingSlots(false));
  }, [newAptDate, newAptSelectedServiceId]);

  const resetNewAptForm = () => {
    setNewAptClientSearch(''); setNewAptClients([]); setNewAptSelectedClient(null);
    setNewAptSelectedPetId(''); setNewAptSelectedServiceId('');
    setNewAptDate(''); setNewAptTime(''); setNewAptSlots([]);
  };

  const submitNewAppointment = async () => {
    if (!newAptSelectedClient || !newAptSelectedPetId || !newAptSelectedServiceId || !newAptDate || !newAptTime) return;
    setNewAptSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
        body: JSON.stringify({
          userId: newAptSelectedClient.id,
          petId: newAptSelectedPetId,
          serviceId: newAptSelectedServiceId,
          date: newAptDate,
          startTime: newAptTime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Cita agendada correctamente');
        setNewAppointmentModalOpen(false);
        resetNewAptForm();
        fetchAppointments(pagination.page);
      } else {
        toast.error(data.error || 'Error al agendar la cita');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setNewAptSubmitting(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setServiceFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearch('');
  };

  const hasActiveFilters = statusFilter !== 'all' || serviceFilter !== 'all' || dateFrom || dateTo || search;

  const exportCSV = () => {
    if (appointments.length === 0) {
      toast.error('No hay citas para exportar');
      return;
    }

    const headers = ['Fecha', 'Hora Inicio', 'Hora Fin', 'Mascota', 'Especie', 'Dueño', 'Email', 'Servicio', 'Estado', 'Notas'];
    const rows = appointments.map((apt) => [
      apt.date, apt.startTime, apt.endTime,
      apt.pet.name, apt.pet.species,
      apt.user.name, apt.user.email,
      apt.service.name,
      statusLabels[apt.status] || apt.status,
      apt.notes || '',
    ]);

    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `citas_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV exportado correctamente');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Citas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestiona todas las citas de la clínica</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setNewAppointmentModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva cita
          </Button>
          <Button
            onClick={exportCSV}
            variant="outline"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtros</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-500 dark:text-gray-400 h-7">
                Limpiar filtros
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar mascota, dueño, servicio..."
                className="pl-9 h-9 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-emerald-400 focus:ring-emerald-400/20"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="confirmed">Confirmada</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
                <SelectItem value="no_show">No asistió</SelectItem>
              </SelectContent>
            </Select>

            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="h-9 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SelectValue placeholder="Servicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los servicios</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-emerald-400 focus:ring-emerald-400/20"
            />

            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-emerald-400 focus:ring-emerald-400/20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : appointments.length > 0 ? (
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
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((apt, index) => (
                    <TableRow
                      key={apt.id}
                      className={`cursor-pointer transition-colors duration-150 ${
                        index % 2 === 0
                          ? 'bg-white dark:bg-transparent hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                          : 'bg-gray-50/60 dark:bg-gray-800/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                      }`}
                      onClick={() => {
                        setMessages([]);
                        setSelectedAppointment(apt);
                        setIsSheetOpen(true);
                        fetchMessages(apt.id);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 dark:text-emerald-400">{getServiceIcon(apt.service.name)}</span>
                          <span className="font-medium text-sm">{apt.service.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{formatFullDate(apt.date)}</TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTime12h(apt.startTime)} - {formatTime12h(apt.endTime)}
                      </TableCell>
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
                      <TableCell>
                        {apt.unreadMessages > 0 && (
                          <div className="flex items-center gap-1 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 px-2 py-1 rounded-full text-[10px] font-bold w-fit">
                            <MessageCircle className="h-3 w-3" />
                            {apt.unreadMessages}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              disabled={changingStatus === apt.id}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { 
                              setSelectedAppointment(apt); 
                              setIsSheetOpen(true); 
                              fetchMessages(apt.id);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            {validTransitions[apt.status] && validTransitions[apt.status].length > 0 && (
                              <>
                                <DropdownMenuSeparator />
                                {validTransitions[apt.status].map((transition) => {
                                  if ((transition.status === 'completed' || transition.status === 'no_show') && !isAppointmentOver(apt.date, apt.endTime)) {
                                    return null;
                                  }
                                  return (
                                    <DropdownMenuItem
                                      key={transition.status}
                                      onClick={() =>
                                        transition.status === 'completed'
                                          ? handleCompleteWithPayment(apt.id)
                                          : handleStatusChange(apt.id, transition.status)
                                      }
                                      disabled={changingStatus === apt.id}
                                    >
                                      {transition.icon}
                                      {transition.label}
                                    </DropdownMenuItem>
                                  );
                                })}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800 mb-4">
                <CalendarDays className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No hay citas</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
                {hasActiveFilters
                  ? 'No se encontraron citas con los filtros aplicados'
                  : 'Aún no hay citas registradas en el sistema'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} citas
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchAppointments(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => fetchAppointments(pagination.page + 1)}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={isSheetOpen} onOpenChange={(open) => {
        setIsSheetOpen(open);
        if (!open) {
          if (selectedAppointmentId) {
            router.visit('/admin/appointments', { preserveState: true, replace: true });
          }
        }
      }}>
        <DialogContent className="w-full sm:max-w-xl overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalle de cita</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-0 pt-2">
              {/* Header */}
              <div className="pb-5 border-b border-gray-100 dark:border-gray-800">
                <Badge className={`${statusBadgeStyles[selectedAppointment.status]} text-xs gap-1.5 mb-2`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor[selectedAppointment.status] || 'bg-gray-400'}`} />
                  {statusLabels[selectedAppointment.status] || selectedAppointment.status}
                </Badge>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {selectedAppointment.service.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {formatFullDate(selectedAppointment.date)} &middot; {formatTime12h(selectedAppointment.startTime)} &ndash; {formatTime12h(selectedAppointment.endTime)}
                </p>
              </div>

              {/* Paciente + dueño en dos columnas */}
              <div className="py-5 border-b border-gray-100 dark:border-gray-800">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Paciente</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedAppointment.pet.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
                      {selectedAppointment.pet.species}{selectedAppointment.pet.breed ? ` · ${selectedAppointment.pet.breed}` : ''}
                    </p>
                    <button
                      onClick={() => router.visit(`/admin/clients/${selectedAppointment.user.id}`)}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline mt-2 flex items-center gap-1"
                    >
                      Ver historial →
                    </button>
                  </div>
                  <div className="border-l border-gray-100 dark:border-gray-800 pl-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Dueño</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedAppointment.user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{selectedAppointment.user.email}</p>
                    {selectedAppointment.user.phone && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{selectedAppointment.user.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Nota del cliente — siempre visible, contenido condicional */}
              <div className="py-5 border-b border-gray-100 dark:border-gray-800">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                  Nota del cliente
                </p>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  {selectedAppointment.notes ? (
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedAppointment.notes}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sin nota del cliente</p>
                  )}
                </div>
              </div>

              {/* Pago */}
              <div className="py-5 border-b border-gray-100 dark:border-gray-800">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Pago</p>
                <div className="flex items-center justify-between">
                  {selectedAppointment.paymentStatus === 'paid' ? (
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-4 w-4" /> Pagado ({selectedAppointment.paymentMethod || 'Efectivo'})
                    </span>
                  ) : (
                    <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">Pendiente de pago</span>
                  )}
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    ${Number(selectedAppointment.paymentAmount || selectedAppointment.service.price).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Chat con el cliente */}
              <div className="py-5 border-b border-gray-100 dark:border-gray-800">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                  Mensajes
                </p>
                <div className="flex flex-col gap-3 max-h-60 overflow-y-auto mb-3 p-2 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center py-4 text-center">
                      <MessageCircle className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">No hay mensajes</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isAdmin = msg.user.role === 'admin' || msg.user.role === 'receptionist';
                      return (
                        <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                            isAdmin
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-semibold ${isAdmin ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                {msg.user.name}
                              </span>
                            </div>
                            <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{msg.message}</p>
                            <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1">
                              {new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                  >
                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Acciones */}
              {validTransitions[selectedAppointment.status] && validTransitions[selectedAppointment.status].length > 0 && (
                <div className="pt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Acciones</p>
                  <div className="flex flex-wrap gap-2">
                    {validTransitions[selectedAppointment.status].map((transition) => {
                      if ((transition.status === 'completed' || transition.status === 'no_show') && !isAppointmentOver(selectedAppointment.date, selectedAppointment.endTime)) {
                        return null;
                      }
                      return (
                        <Button
                          key={transition.status}
                          variant="outline"
                          size="sm"
                          disabled={changingStatus === selectedAppointment.id}
                          onClick={() =>
                            transition.status === 'completed'
                              ? handleCompleteWithPayment(selectedAppointment.id)
                              : handleStatusChange(selectedAppointment.id, transition.status)
                          }
                          className={
                            transition.status === 'completed'
                              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400'
                              : transition.status === 'cancelled'
                              ? 'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400'
                              : 'border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-400'
                          }
                        >
                          {transition.icon}
                          {transition.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de pago al completar cita */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogDescription>
              Confirma cómo pagó el cliente antes de marcar la cita como completada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Método de pago</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ value: 'cash', label: 'Efectivo' }, { value: 'transfer', label: 'Transferencia' }, { value: 'card', label: 'Tarjeta' }, { value: 'pago_movil', label: 'Pago Móvil' }].map((m) => (
                  <button key={m.value} type="button" onClick={() => setPaymentMethod(m.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      paymentMethod === m.value
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Monto cobrado</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input type="number" step="0.01" min={paymentMin ?? 0} max={paymentMax ?? undefined} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full rounded-md border border-gray-200 py-2 pl-7 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-900" />
              </div>
              <p className="text-xs text-gray-400">
                Ajusta si hubo descuento o servicio adicional.<br/>
                Rango permitido: ${paymentMin?.toFixed(2)} - ${paymentMax?.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancelar</Button>
            <Button onClick={confirmPayment} disabled={changingStatus !== null} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {changingStatus ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirmar y cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de nueva cita agendada por el admin */}
      <Dialog open={newAppointmentModalOpen} onOpenChange={(o) => { setNewAppointmentModalOpen(o); if (!o) resetNewAptForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva cita</DialogTitle>
            <DialogDescription>Agenda una cita para un cliente registrado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {/* Buscar cliente */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Buscar cliente</label>
              <div className="relative mt-1">
                <Input
                  value={newAptClientSearch}
                  onChange={(e) => { setNewAptClientSearch(e.target.value); setNewAptSelectedClient(null); }}
                  placeholder="Nombre o email del cliente..."
                />
                {newAptClients.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                    {newAptClients.map(c => (
                      <button key={c.id} type="button" onClick={() => handleSelectNewAptClient(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                        <span className="text-gray-400 ml-2 text-xs">{c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mascota */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Mascota</label>
              <Select value={newAptSelectedPetId} onValueChange={setNewAptSelectedPetId} disabled={!newAptSelectedClient}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar mascota..." /></SelectTrigger>
                <SelectContent>
                  {(newAptSelectedClient?.pets || []).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.species})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Servicio */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Servicio</label>
              <Select value={newAptSelectedServiceId} onValueChange={setNewAptSelectedServiceId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar servicio..." /></SelectTrigger>
                <SelectContent>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha y hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Fecha</label>
                <Input type="date" value={newAptDate} onChange={e => setNewAptDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Hora</label>
                <Select value={newAptTime} onValueChange={setNewAptTime} disabled={!newAptDate || !newAptSelectedServiceId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={newAptLoadingSlots ? 'Cargando...' : 'Hora...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {newAptSlots.length === 0 && !newAptLoadingSlots && newAptDate && newAptSelectedServiceId ? (
                      <SelectItem value="_none" disabled>No hay horarios disponibles</SelectItem>
                    ) : (
                      newAptSlots.map(s => <SelectItem key={s.time} value={s.time}>{s.label}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setNewAppointmentModalOpen(false); resetNewAptForm(); }}>Cancelar</Button>
            <Button
              onClick={submitNewAppointment}
              disabled={newAptSubmitting || !newAptSelectedClient || !newAptSelectedPetId || !newAptSelectedServiceId || !newAptDate || !newAptTime}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {newAptSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Agendar cita
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

Appointments.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;