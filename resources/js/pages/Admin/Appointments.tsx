import { useEffect, useState, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  pet: { id: string; name: string; species: string; breed: string | null };
  service: { id: string; name: string; durationMinutes: number; price: number };
  user: { id: string; name: string; email: string; phone?: string };
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

export default function Appointments() {
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

  useEffect(() => {
    fetchAppointments(1);
  }, [fetchAppointments]);

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    setChangingStatus(appointmentId);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
        <Button
          onClick={exportCSV}
          variant="outline"
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
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
                      onClick={() => router.visit(`/admin/appointments/${apt.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 dark:text-emerald-400">{getServiceIcon(apt.service.name)}</span>
                          <span className="font-medium text-sm">{apt.service.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{formatFullDate(apt.date)}</TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {apt.startTime} - {apt.endTime}
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
                            <DropdownMenuItem onClick={() => router.visit(`/admin/appointments/${apt.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            {validTransitions[apt.status] && validTransitions[apt.status].length > 0 && (
                              <>
                                <DropdownMenuSeparator />
                                {validTransitions[apt.status].map((transition) => (
                                  <DropdownMenuItem
                                    key={transition.status}
                                    onClick={() => handleStatusChange(apt.id, transition.status)}
                                    disabled={changingStatus === apt.id}
                                  >
                                    {transition.icon}
                                    {transition.label}
                                  </DropdownMenuItem>
                                ))}
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
    </motion.div>
  );
}