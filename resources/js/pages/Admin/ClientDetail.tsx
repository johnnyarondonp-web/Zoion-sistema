import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Mail,
  Phone,
  CalendarDays,
  Heart,
  Clock,
  PawPrint,
  DollarSign,
  CheckCircle2,
  XCircle,
  UserX,
  Stethoscope,
  ShieldCheck,
  Calendar,
  Syringe,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  StickyNote,
  Weight,
  Eye,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatTime12h } from '@/lib/format';

interface PetData {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  gender: string | null;
  birthdate: string | null;
  weight: number | null;
  photo: string | null;
  notes: string | null;
  weightHistory: any[] | null;
  isActive: boolean;
  vaccinations: string | null;
}

interface AppointmentData {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { name: string; price: number };
  pet: { name: string };
}

interface ClientDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  pets: PetData[];
  appointments: AppointmentData[];
  _count: { pets: number; appointments: number };
  totalSpent: number;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  confirmed: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  no_show: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  confirmed: <CheckCircle2 className="h-3 w-3" />,
  completed: <CheckCircle2 className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
  no_show: <UserX className="h-3 w-3" />,
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

function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function calculateAge(birthdate: string | null): string {
  if (!birthdate) return '—';
  try {
    const [y, m, d] = birthdate.split('-').map(Number);
    const birth = new Date(y, m - 1, d);
    const today = new Date();
    let ageYears = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) ageYears--;
    if (ageYears <= 0) {
      const ageMonths = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
      if (ageMonths <= 0) return '< 1 mes';
      return `${ageMonths} ${ageMonths === 1 ? 'mes' : 'meses'}`;
    }
    return `${ageYears} ${ageYears === 1 ? 'año' : 'años'}`;
  } catch { return '—'; }
}

function formatFullDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

const speciesLabels: Record<string, string> = {
  perro: 'Perro', gato: 'Gato', ave: 'Ave', reptil: 'Reptil',
  roedor: 'Roedor', conejo: 'Conejo', pez: 'Pez', otro: 'Otro',
};

interface Props {
  clientId: string;
}

export default function ClientDetail({ clientId }: Props) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState<PetData | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (clientId) fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`);
      const data = await res.json();
      if (data.success) {
        setClient(data.data);
      } else {
        toast.error(data.error || 'Cliente no encontrado');
        router.visit('/admin/clients');
      }
    } catch {
      toast.error('Error de conexión');
      router.visit('/admin/clients');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20" />
        </div>
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-gray-200 dark:border-gray-700">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 mb-4">
          <PawPrint className="h-10 w-10 text-emerald-400 dark:text-emerald-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Cliente no encontrado</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">No se pudo encontrar la información del cliente.</p>
        <Button
          variant="outline"
          onClick={() => router.visit('/admin/clients')}
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a clientes
        </Button>
      </div>
    );
  }

  const completedAppointments = client.appointments.filter((a) => a.status === 'completed');
  const upcomingAppointments = client.appointments.filter((a) => a.status === 'pending' || a.status === 'confirmed');

  return (
    <>
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">
      {/* Back Button */}
      <motion.div variants={item}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.visit('/admin/clients')}
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver a Clientes
        </Button>
      </motion.div>

      {/* Client Header */}
      <motion.div variants={item}>
        <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500" />
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(client.name)} text-white font-bold text-2xl shrink-0 shadow-lg ring-4 ring-white dark:ring-gray-800`}>
                {getInitials(client.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{client.name}</h1>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 gap-1 w-fit">
                    <ShieldCheck className="h-3 w-3" />
                    Cliente
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>Registrado: {formatSpanishDate(client.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={item}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                  <Heart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mascotas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{client._count.pets}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/30">
                  <Calendar className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Citas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{client._count.appointments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950/30">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total gastado</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${Number(client.totalSpent).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Pets Section */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-3">
          <PawPrint className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Mascotas ({client.pets.length})
          </h2>
        </div>

        {client.pets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {client.pets.map((pet) => (
              <Card 
                key={pet.id} 
                className="border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 hover:shadow-md overflow-hidden group cursor-pointer"
                onClick={() => setSelectedPet(pet)}
              >
                <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {pet.photo ? (
                      <img
                        src={pet.photo}
                        alt={pet.name}
                        className="h-12 w-12 rounded-xl object-cover shrink-0 ring-2 ring-white dark:ring-gray-700"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 shrink-0">
                        <PawPrint className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{pet.name}</h3>
                        <Badge
                          variant="secondary"
                          className={pet.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 text-[10px] px-1.5 py-0'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-[10px] px-1.5 py-0'}
                        >
                          {pet.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {speciesLabels[pet.species.toLowerCase()] || pet.species}
                        {pet.breed ? ` · ${pet.breed}` : ''}
                      </p>
                      {(() => {
                        let vaccList: Array<{ name: string; nextDue: string }> = [];
                        if (pet.vaccinations) {
                          try { vaccList = JSON.parse(pet.vaccinations); } catch { /* ignore */ }
                        }
                        const overdue = vaccList.filter(v => {
                          if (!v.nextDue) return false;
                          return new Date(v.nextDue + 'T00:00:00') < new Date();
                        });
                        const soon = vaccList.filter(v => {
                          if (!v.nextDue) return false;
                          const diff = Math.ceil((new Date(v.nextDue + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                          return diff >= 0 && diff <= 30;
                        });
                        return (
                          <div className="flex items-center gap-2 mt-1.5">
                            <Syringe className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                              {vaccList.length} vacuna{vaccList.length !== 1 ? 's' : ''}
                            </span>
                            {overdue.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-0.5">
                                <AlertCircle className="h-2.5 w-2.5" />
                                {overdue.length} vencida{overdue.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {soon.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                {soon.length} próxima{soon.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 mb-3">
                <PawPrint className="h-7 w-7 text-emerald-400 dark:text-emerald-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Este cliente aún no tiene mascotas registradas.</p>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Appointments Section */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Citas ({client.appointments.length})
          </h2>
          {upcomingAppointments.length > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs ml-1">
              {upcomingAppointments.length} próxima{upcomingAppointments.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {client.appointments.length > 0 ? (
          <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
            <CardContent className="p-0">
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                      {['Fecha', 'Hora', 'Mascota', 'Servicio', 'Precio', 'Estado'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {client.appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{formatShortDate(apt.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatTime12h(apt.startTime)} - {formatTime12h(apt.endTime)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{apt.pet.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{apt.service.name}</td>
                        <td className="px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">${Number(apt.service.price).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <Badge className={`${statusColors[apt.status]} gap-1 text-xs`}>
                            {statusIcons[apt.status]}
                            {statusLabels[apt.status]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700/50">
                {client.appointments.map((apt) => (
                  <div key={apt.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">{formatShortDate(apt.date)}</span>
                      <Badge className={`${statusColors[apt.status]} gap-1 text-xs`}>
                        {statusIcons[apt.status]}
                        {statusLabels[apt.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>{formatTime12h(apt.startTime)} - {formatTime12h(apt.endTime)}</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">${Number(apt.service.price).toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {apt.service.name} · <span className="text-gray-400 dark:text-gray-500">{apt.pet.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 mb-3">
                <CalendarDays className="h-7 w-7 text-emerald-400 dark:text-emerald-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Este cliente aún no tiene citas registradas.</p>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Summary footer */}
      {completedAppointments.length > 0 && (
        <motion.div variants={item}>
          <Card className="border-gray-200 dark:border-gray-700 bg-emerald-50/30 dark:bg-emerald-950/10">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{completedAppointments.length}</span>{' '}
                  {completedAppointments.length === 1 ? 'cita completada' : 'citas completadas'} con un total de{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">${Number(client.totalSpent).toFixed(2)}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Pet Detail Modal */}
      <Dialog open={!!selectedPet} onOpenChange={(open) => !open && setSelectedPet(null)}>
        <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border-none shadow-2xl">
          {selectedPet && (
            <>
              <DialogHeader className="p-0">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white relative">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center gap-4 relative">
                    {selectedPet.photo ? (
                      <div className="relative group cursor-zoom-in" onClick={() => setPreviewImage(selectedPet.photo)}>
                        <img src={selectedPet.photo} alt={selectedPet.name} className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white/20 shadow-lg transition-transform hover:scale-105" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                          <Eye className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-2xl bg-white/10 flex items-center justify-center ring-4 ring-white/20">
                        <PawPrint className="h-10 w-10 text-white/80" />
                      </div>
                    )}
                    <div>
                      <DialogTitle className="text-2xl font-bold text-white">{selectedPet.name}</DialogTitle>
                      <DialogDescription className="text-emerald-50/80 mt-1 flex items-center gap-1.5 font-medium">
                        {speciesLabels[selectedPet.species.toLowerCase()] || selectedPet.species}
                        {selectedPet.breed && <span> · {selectedPet.breed}</span>}
                      </DialogDescription>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 text-center border border-gray-100 dark:border-gray-800">
                    <Calendar className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{calculateAge(selectedPet.birthdate)}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Edad</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 text-center border border-gray-100 dark:border-gray-800">
                    <Weight className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{selectedPet.weight ? `${selectedPet.weight} kg` : '—'}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Peso</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 text-center border border-gray-100 dark:border-gray-800">
                    <Heart className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 capitalize">{selectedPet.gender === 'macho' ? 'Macho' : selectedPet.gender === 'hembra' ? 'Hembra' : '—'}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Sexo</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nacimiento</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{formatFullDate(selectedPet.birthdate)}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estado</p>
                      <Badge variant="secondary" className={selectedPet.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}>
                        {selectedPet.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>

                  {selectedPet.notes && (
                    <div className="space-y-1.5 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30">
                      <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <StickyNote className="h-3 w-3" /> Notas médicas
                      </p>
                      <p className="text-xs text-amber-800/80 dark:text-amber-300/80 italic leading-relaxed">
                        "{selectedPet.notes}"
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Syringe className="h-3 w-3" /> Resumen de Vacunación
                    </p>
                    {(() => {
                       let vaccList: Array<{ name: string; date: string; nextDue: string }> = [];
                       try { vaccList = selectedPet.vaccinations ? JSON.parse(selectedPet.vaccinations) : []; } catch { /* ignore */ }
                       
                       if (vaccList.length === 0) return <p className="text-xs text-gray-500 italic">No hay vacunas registradas.</p>;
                       
                       return (
                         <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                           {vaccList.map((v, i) => (
                             <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                               <div>
                                 <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{v.name}</p>
                                 <p className="text-[10px] text-gray-500">{v.date ? formatFullDate(v.date) : 'Sin fecha'}</p>
                               </div>
                               {v.nextDue && (
                                 <Badge variant="outline" className="text-[9px] border-emerald-200 text-emerald-700">
                                   Próx: {formatShortDate(v.nextDue)}
                                 </Badge>
                               )}
                             </div>
                           ))}
                         </div>
                       );
                    })()}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none bg-transparent shadow-none flex items-center justify-center">
          {previewImage && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
              <img src={previewImage} alt="Preview" className="max-h-[90vh] max-w-full rounded-xl shadow-2xl" />
              <Button 
                variant="secondary" 
                size="icon" 
                className="absolute top-4 right-4 rounded-full bg-black/50 text-white hover:bg-black/70 border-none"
                onClick={() => setPreviewImage(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
    </>
  );
}

ClientDetail.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;