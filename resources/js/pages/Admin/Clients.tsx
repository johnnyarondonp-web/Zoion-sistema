import { useEffect, useState, useCallback, useRef } from 'react';
import { router } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import AdminLayout from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Mail,
  Phone,
  Heart,
  Calendar,
  ChevronRight,
  Download,
  LayoutGrid,
  List,
  Eye,
  CalendarPlus,
  X,
} from 'lucide-react';

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  _count?: {
    pets: number;
    appointments: number;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

const avatarColors = [
  'from-emerald-400 to-teal-500',
  'from-teal-400 to-cyan-500',
  'from-emerald-500 to-green-600',
  'from-green-400 to-emerald-500',
  'from-teal-500 to-emerald-600',
  'from-cyan-400 to-teal-500',
  'from-emerald-600 to-teal-700',
  'from-green-500 to-teal-600',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function formatSpanishDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
  const years = Math.floor(diffDays / 365);
  return `Hace ${years} ${years === 1 ? 'año' : 'años'}`;
}

export default function Clients() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | 'activos' | 'leads' | 'archivados'>('todos');
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  // Usamos ReturnType<typeof setTimeout> para evitar errores de tipos en entornos browser/Vite
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const fetchClients = useCallback(async (searchTerm: string, filterType: string, page: number = 1, append: boolean = false) => {
    if (page === 1 && !append) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (filterType !== 'todos') params.set('filter', filterType);
      params.set('page', page.toString());

      const res = await fetch(`/api/admin/clients?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      const data = await res.json();
      if (data.success) {
        setClients((prev) => (append ? [...prev, ...(data.data.clients ?? [])] : (data.data.clients ?? [])));
        setPagination(data.data.pagination ?? {});
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchClients('', 'todos');
  }, [fetchClients]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchClients(value, filter, 1, false);
    }, 300);
  };

  const handleFilterChange = (newFilter: 'todos' | 'activos' | 'leads' | 'archivados') => {
    setFilter(newFilter);
    fetchClients(search, newFilter, 1, false);
  };

  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.totalPages) {
      fetchClients(search, filter, pagination.page + 1, true);
    }
  };

  const exportCSV = () => {
    if (clients.length === 0) {
      toast.error('No hay clientes para exportar');
      return;
    }

    const headers = ['Nombre', 'Email', 'Teléfono', 'Mascotas', 'Citas', 'Fecha Registro'];
    const rows = clients.map((client) => [
      client.name,
      client.email,
      client.phone || '',
      String(client._count?.pets ?? 0),
      String(client._count?.appointments ?? 0),
      new Date(client.createdAt).toLocaleDateString('es-ES'),
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
    link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV exportado correctamente');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
          <Skeleton className="h-10 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clientes</h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {pagination
                ? `${pagination.total} ${pagination.total === 1 ? 'cliente registrado' : 'clientes registrados'}`
                : 'Gestiona las cuentas de clientes'}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-emerald-400 focus:ring-emerald-400/20"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); fetchClients('', filter, 1, false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 transition-colors ${viewMode === 'cards' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 transition-colors ${viewMode === 'table' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <Button
              onClick={exportCSV}
              variant="outline"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30 shrink-0"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Exportar CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mt-4 scrollbar-thin">
          <button
            onClick={() => handleFilterChange('todos')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              filter === 'todos'
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => handleFilterChange('activos')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
              filter === 'activos'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30'
                : 'bg-white dark:bg-gray-800 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:text-gray-400 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
            Activos
          </button>
          <button
            onClick={() => handleFilterChange('leads')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
              filter === 'leads'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/30'
                : 'bg-white dark:bg-gray-800 text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:text-gray-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Leads / Potenciales
          </button>
          <button
            onClick={() => handleFilterChange('archivados')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
              filter === 'archivados'
                ? 'bg-gray-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            Archivados
          </button>
        </div>
      </motion.div>

      {/* Card View */}
      {viewMode === 'cards' && clients.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client, index) => (
              <motion.div
                key={client.id}
                custom={index}
                variants={{
                  hidden: { opacity: 0, y: 16, scale: 0.97 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { delay: index * 0.04, duration: 0.35, ease: 'easeOut' as const },
                  },
                }}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Card className="border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-700 transition-all duration-200 hover:shadow-lg overflow-hidden relative group">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3.5">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(client.name)} text-white font-semibold text-sm shrink-0 shadow-sm ring-2 ring-white dark:ring-gray-800`}>
                        {getInitials(client.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{client.name}</h3>
                        {(client._count?.pets ?? 0) === 0 && (
                          <Badge variant="outline" className="mt-1 border-orange-200 text-orange-600 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-400 text-[10px] px-1.5 py-0.5 font-medium tracking-wide shadow-sm">
                            Sin mascotas registradas
                          </Badge>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 text-gray-500 dark:text-gray-400">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs truncate" title={client.email}>{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-1.5 mt-0.5 text-gray-500 dark:text-gray-400">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-xs">{client.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3.5">
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 gap-1 text-xs">
                        <Heart className="h-3 w-3" />
                        {client._count?.pets ?? 0} {(client._count?.pets ?? 0) === 1 ? 'mascota' : 'mascotas'}
                      </Badge>
                      <Badge variant="secondary" className="bg-teal-50 text-teal-700 hover:bg-teal-50 dark:bg-teal-950/30 dark:text-teal-300 gap-1 text-xs">
                        <Calendar className="h-3 w-3" />
                        {client._count?.appointments ?? 0} {(client._count?.appointments ?? 0) === 1 ? 'cita' : 'citas'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                      <span className="text-[11px] text-gray-400 dark:text-gray-500" title={formatSpanishDate(client.createdAt)}>
                        Cliente {getRelativeTime(client.createdAt)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/30 px-2 gap-1"
                          onClick={() => router.visit(`/admin/clients/${client.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Ver</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:text-teal-300 dark:hover:bg-teal-950/30 px-2 gap-1"
                          onClick={() => router.visit('/appointments/new')}
                        >
                          <CalendarPlus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Cita</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {pagination && pagination.page < pagination.totalPages && (
            <motion.div variants={item} className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-700"
              >
                {loadingMore ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mr-2" />
                    Cargando...
                  </>
                ) : (
                  <>
                    Cargar más clientes
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </>
      )}

      {/* Table View */}
      {viewMode === 'table' && clients.length > 0 && (
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Cliente</th>
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Contacto</th>
                    <th className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Mascotas</th>
                    <th className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Citas</th>
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Cliente desde</th>
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client, index) => (
                    <motion.tr
                      key={client.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.25 }}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(client.name)} text-white font-semibold text-xs shrink-0 shadow-sm ring-2 ring-white dark:ring-gray-800`}>
                            {getInitials(client.name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{client.name}</span>
                            {(client._count?.pets ?? 0) === 0 && (
                              <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400 mt-0.5">Sin mascotas registradas</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </div>
                          {client.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                              <Phone className="h-3 w-3" />
                              {client.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 text-xs gap-1">
                          <Heart className="h-3 w-3" />
                          {client._count?.pets ?? 0}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300 text-xs gap-1">
                          <Calendar className="h-3 w-3" />
                          {client._count?.appointments ?? 0}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600 dark:text-gray-400">{getRelativeTime(client.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                            onClick={() => router.visit(`/admin/clients/${client.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Ver
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/30"
                            onClick={() => router.visit('/appointments/new')}
                          >
                            <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                            Cita
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {clients.length === 0 && (
        <motion.div variants={item}>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative flex h-24 w-24 items-center justify-center mb-2">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20" />
                <svg className="relative z-10 h-14 w-14" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="7" className="fill-emerald-300 dark:fill-emerald-600" />
                  <circle cx="36" cy="20" r="7" className="fill-teal-300 dark:fill-teal-600" />
                  <path d="M8 40c0-6.627 5.373-12 12-12h0c6.627 0 12 5.373 12 12v2H8v-2z" className="fill-emerald-300 dark:fill-emerald-600" />
                  <path d="M24 40c0-6.627 5.373-12 12-12h0c6.627 0 12 5.373 12 12v2H24v-2z" className="fill-teal-300 dark:fill-teal-600" />
                </svg>
              </div>
              <div className="flex gap-1.5 mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 dark:bg-emerald-700" />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 dark:bg-emerald-600" />
                <span className="h-1.5 w-1.5 rounded-full bg-teal-300 dark:bg-teal-700" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {search ? 'Sin resultados' : 'No hay clientes'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                {search
                  ? `No se encontraron clientes que coincidan con "${search}"`
                  : 'Aún no hay clientes registrados en el sistema. Los clientes se registrarán automáticamente al crear su cuenta.'}
              </p>
              {search && (
                <Button
                  variant="outline"
                  onClick={() => { setSearch(''); handleFilterChange('todos'); }}
                  className="mt-4 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                >
                  Limpiar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

Clients.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;