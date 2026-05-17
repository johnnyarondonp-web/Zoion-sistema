import { useEffect, useState, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
  ArrowLeft,
  Pencil,
  Power,
  Calendar,
  Clock,
  Dog,
  Cat,
  Bird,
  Fish,
  Rabbit,
  Bug,
  HelpCircle,
  PawPrint,
  Weight,
  StickyNote,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Save,
  X,
  Syringe,
  AlertCircle,
  CheckCircle2,
  Clock as ClockIcon,
  ShieldCheck,
  Activity,
  Heart,
  DollarSign,
  CalendarCheck,
  CalendarClock,
  Stethoscope,
  ChevronDown,
  Printer,
  Share2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ClientLayout from '@/components/layout/ClientLayout';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birthdate: string | null;
  weight: number | null;
  photo: string | null;
  notes: string | null;
  weightHistory: string | null;
  isActive: boolean;
}

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  service: { name: string };
}

interface WeightEntry {
  date: string;
  weight: number;
  notes: string;
}

interface VaccinationEntry {
  name: string;
  date: string;
  nextDue: string;
  vet: string;
  notes: string;
}

interface HealthSummary {
  healthScore: number;
  healthStatus: 'bueno' | 'regular' | 'necesita_atencion';
  totalAppointments: number;
  appointmentsByStatus: Record<string, number>;
  totalSpent: number;
  vaccinationSummary: { upToDate: number; dueSoon: number; overdue: number; total: number };
  weightTrend: 'up' | 'down' | 'stable';
  weightTrendPercent: number;
  currentWeight: number | null;
  lastVisitDate: string | null;
  nextAppointmentDate: string | null;
}

// ─── Constants & Helpers ─────────────────────────────────────────────────────
const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

const speciesIcons: Record<string, React.ReactNode> = {
  perro: <Dog className="h-6 w-6" />,
  gato: <Cat className="h-6 w-6" />,
  ave: <Bird className="h-6 w-6" />,
  reptil: <Bug className="h-6 w-6" />,
  conejo: <Rabbit className="h-6 w-6" />,
  hámster: <Rabbit className="h-6 w-6" />,
  pez: <Fish className="h-6 w-6" />,
  otro: <HelpCircle className="h-6 w-6" />,
};



const speciesGradients: Record<string, string> = {
  perro: 'from-amber-500 to-orange-500',
  gato: 'from-violet-500 to-purple-500',
  ave: 'from-sky-500 to-blue-500',
  reptil: 'from-emerald-500 to-green-600',
  conejo: 'from-pink-500 to-rose-500',
  hámster: 'from-yellow-500 to-amber-500',
  pez: 'from-cyan-500 to-teal-500',
  otro: 'from-gray-500 to-slate-500',
};

const speciesLabels: Record<string, string> = {
  perro: 'Perro',
  gato: 'Gato',
  ave: 'Ave',
  reptil: 'Reptil',
  conejo: 'Conejo',
  hámster: 'Hámster',
  pez: 'Pez',
  otro: 'Otro',
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' },
  confirmed: { label: 'Confirmada', className: 'bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400' },
  completed: { label: 'Completada', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' },
  cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
  no_show: { label: 'No asistió', className: 'bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
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
  } catch {
    return '—';
  }
}

function getWeightTrend(entries: WeightEntry[]): { direction: 'up' | 'down' | 'stable'; percent: number } {
  if (entries.length < 2) return { direction: 'stable', percent: 0 };
  const last = entries[entries.length - 1].weight;
  const prev = entries[entries.length - 2].weight;
  const diff = last - prev;
  const percent = prev !== 0 ? Math.abs((diff / prev) * 100) : 0;
  if (Math.abs(diff) < 0.05) return { direction: 'stable', percent };
  return { direction: diff > 0 ? 'up' : 'down', percent };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: WeightEntry }> }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as WeightEntry;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2.5 text-xs">
        <p className="font-medium text-gray-900 dark:text-gray-100">{formatShortDate(data.date)}</p>
        <p className="text-emerald-600 dark:text-emerald-400 font-semibold">{data.weight} kg</p>
        {data.notes && <p className="text-gray-500 dark:text-gray-400 mt-0.5">{data.notes}</p>}
      </div>
    );
  }
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function PetDetail() {
  const { petId } = usePage<{ petId: string }>().props;
  const [pet, setPet] = useState<Pet | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weightForm, setWeightForm] = useState({ date: new Date().toISOString().split('T')[0], weight: '', notes: '' });
  const [savingWeight, setSavingWeight] = useState(false);
  const [showVaccForm, setShowVaccForm] = useState(false);
  const [vaccForm, setVaccForm] = useState({ name: '', date: new Date().toISOString().split('T')[0], nextDue: '', vet: '', notes: '' });
  const [savingVacc, setSavingVacc] = useState(false);
  const [healthExpanded, setHealthExpanded] = useState(true);
  const [healthSummary, setHealthSummary] = useState<any>({
    totalSpent: 0,
    upToDate: false,
    nextDue: null,
    vaccinations: []
  });

  useEffect(() => {
    if (petId) {
      fetchPet(petId);
      fetchAppointments(petId);
      fetchWeightHistory(petId);
      fetchVaccinations(petId);
      fetchHealthSummary(petId);
    }
  }, [petId]);

  const fetchPet = async (id: string) => {
    try {
      const res = await fetch(`/api/pets/${id}`, {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success) setPet(data.data);
      else { toast.error('Mascota no encontrada'); router.visit('/client/pets'); }
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar la mascota');
      router.visit('/client/pets');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async (petId: string) => {
    try {
      const res = await fetch(`/api/appointments?petId=${petId}&limit=50`, {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success) setAppointments(data.data.appointments || []);
    } catch { /* silent */ }
  };

  const fetchWeightHistory = async (petId: string) => {
    try {
      const res = await fetch(`/api/pets/${petId}/weight`, {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success) setWeightHistory(data.data);
    } catch { /* silent */ }
  };

  const fetchVaccinations = async (petId: string) => {
    try {
      const res = await fetch(`/api/pets/${petId}/vaccinations`, {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success) setVaccinations(data.data);
    } catch { /* silent */ }
  };

  const fetchHealthSummary = async (petId: string) => {
    try {
      const res = await fetch(`/api/pets/${petId}/health-summary`, {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success) setHealthSummary(data.data);
    } catch { /* silent */ }
  };

  // ✅ CAMBIO 3: URL cambiada a /toggle y agregado el body
  const handleToggleActive = async () => {
    if (!pet || toggling) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/pets/${pet.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
        body: JSON.stringify({ is_active: !pet.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setPet(data.data);
        toast.success(data.data.isActive ? 'Mascota reactivada' : 'Mascota desactivada');
      } else {
        toast.error(data.error || 'Error al cambiar estado');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setToggling(false);
    }
  };

  const handleSaveWeight = async () => {
    if (!weightForm.date || !weightForm.weight) { toast.error('Fecha y peso son requeridos'); return; }
    const weightNum = parseFloat(weightForm.weight);
    if (isNaN(weightNum) || weightNum <= 0) { toast.error('El peso debe ser un número positivo'); return; }
    setSavingWeight(true);
    try {
      const res = await fetch(`/api/pets/${pet?.id}/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
        body: JSON.stringify(weightForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Registro de peso agregado');
        setWeightForm({ date: new Date().toISOString().split('T')[0], weight: '', notes: '' });
        setShowWeightForm(false);
        fetchWeightHistory(pet?.id || '');
        fetchPet(pet?.id || '');
      } else { toast.error(data.error || 'Error al guardar peso'); }
    } catch { toast.error('Error de conexión'); }
    finally { setSavingWeight(false); }
  };

  const handleSaveVaccination = async () => {
    if (!vaccForm.name || !vaccForm.date) { toast.error('Nombre y fecha son requeridos'); return; }
    setSavingVacc(true);
    try {
      const res = await fetch(`/api/pets/${pet?.id}/vaccinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
        body: JSON.stringify(vaccForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Vacunación registrada');
        setVaccForm({ name: '', date: new Date().toISOString().split('T')[0], nextDue: '', vet: '', notes: '' });
        setShowVaccForm(false);
        fetchVaccinations(pet?.id || '');
      } else { toast.error(data.error || 'Error al guardar vacunación'); }
    } catch { toast.error('Error de conexión'); }
    finally { setSavingVacc(false); }
  };

  const handleShareProfile = () => {
    if (!pet) return;
    const shareText = `${pet.name} — ${speciesLabels[pet.species.toLowerCase()] || pet.species}${pet.breed ? `, ${pet.breed}` : ''}\nEdad: ${calculateAge(pet.birthdate)}\nPeso: ${pet.weight != null ? `${pet.weight} kg` : '—'}\nVacunas: ${vaccinations.length}\n— Compartido desde Zoion Vet`;
    navigator.clipboard.writeText(shareText).then(() => toast.success('Perfil copiado al portapapeles')).catch(() => toast.error('No se pudo copiar al portapapeles'));
  };

  const getVaccinationStatus = (nextDue: string): 'ok' | 'soon' | 'overdue' => {
    if (!nextDue) return 'ok';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(nextDue + 'T00:00:00');
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 30) return 'soon';
    return 'ok';
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4"> <Skeleton className="h-10 w-10 rounded-lg" /> <Skeleton className="h-8 w-48" /> </div>
        <Card> <CardContent className="p-6"> <div className="flex gap-6"> <Skeleton className="h-24 w-24 rounded-2xl" /> <div className="flex-1 space-y-3"> <Skeleton className="h-6 w-40" /> <Skeleton className="h-4 w-24" /> </div> </div> </CardContent> </Card>
      </div>
    );
  }

  if (!pet) return null;

  const sp = pet.species.toLowerCase();
  const icon = speciesIcons[sp] || speciesIcons.otro;
  const label = speciesLabels[sp] || pet.species;
  const trend = getWeightTrend(weightHistory);
  const chartData = weightHistory.map((entry) => ({ ...entry, shortDate: formatShortDate(entry.date) }));
  const TrendIcon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;
  const trendColor = trend.direction === 'up' ? 'text-amber-600 dark:text-amber-400' : trend.direction === 'down' ? 'text-sky-600 dark:text-sky-400' : 'text-gray-500 dark:text-gray-400';
  const trendBg = trend.direction === 'up' ? 'bg-amber-50 dark:bg-amber-900/20' : trend.direction === 'down' ? 'bg-sky-50 dark:bg-sky-900/20' : 'bg-gray-50 dark:bg-gray-800/50';
  const trendLabel = trend.direction === 'up' ? 'Aumentando' : trend.direction === 'down' ? 'Bajando' : 'Estable';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Gradient Header Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="relative rounded-2xl overflow-hidden">
        {/* ✅ CAMBIO 2: Gradiente fijo verde del proyecto */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.visit('/client/pets')} className="text-white/80 hover:text-white hover:bg-white/20 h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <PawPrint className="h-10 w-10 text-white/90" />
                <div>
                  <h1 className="text-2xl font-bold">{pet.name}</h1>
                  <p className="text-white/80 text-sm">{label}{pet.breed ? ` · ${pet.breed}` : ''}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {/* ✅ CAMBIO 1: Botón "Compartir" eliminado */}
              <Button variant="ghost" size="sm" onClick={() => router.visit(`/client/pets/${pet.id}/edit`)} className="text-white/80 hover:text-white hover:bg-white/20 border border-white/20">
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={handleToggleActive} disabled={toggling} className="text-white/80 hover:text-white hover:bg-white/20 border border-white/20">
                <Power className="h-4 w-4 mr-1" /> {pet.isActive ? 'Desactivar' : 'Reactivar'}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Row */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-3 text-center">
          <Calendar className="h-5 w-5 mx-auto text-emerald-500 dark:text-emerald-400 mb-1" />
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{calculateAge(pet.birthdate)}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Edad</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-3 text-center">
          <Weight className="h-5 w-5 mx-auto text-emerald-500 dark:text-emerald-400 mb-1" />
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{pet.weight != null ? `${pet.weight} kg` : '—'}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Peso</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-3 text-center">
          <Syringe className="h-5 w-5 mx-auto text-emerald-500 dark:text-emerald-400 mb-1" />
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{vaccinations.length}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vacunas</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-3 text-center">
          <CalendarClock className="h-5 w-5 mx-auto text-emerald-500 dark:text-emerald-400 mb-1" />
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{healthSummary?.nextAppointmentDate ? formatShortDate(healthSummary?.nextAppointmentDate) : '—'}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Próxima cita</p>
        </div>
      </motion.div>

      {/* Pet Info Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {pet.photo ? (
                <div className="h-28 w-28 rounded-2xl overflow-hidden flex-shrink-0">
                  <img src={pet.photo} alt={pet.name} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex-shrink-0">{icon}</div>
              )}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nombre</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{pet.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Especie</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Raza</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{pet.breed || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Estado</p>
                  <Badge variant="secondary" className={pet.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400'}>
                    {pet.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1"> <Calendar className="h-3 w-3" /> Nacimiento</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(pet.birthdate)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1"> <Weight className="h-3 w-3" /> Peso actual</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-900 dark:text-gray-100">{pet.weight != null ? `${pet.weight} kg` : '—'}</p>
                    {weightHistory.length >= 2 && (
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${trendColor} ${trendBg}`}>
                        <TrendIcon className="h-3 w-3" /> {trendLabel} {trend.percent > 0 && `(${(trend.percent != null ? Number(trend.percent).toFixed(1) : '—')}%)`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {pet.notes && (
              <>
                <Separator className="my-4" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1"> <StickyNote className="h-3 w-3" /> Notas</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pet.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Health Summary Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.025 }} id="health-summary-section">
        <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <button onClick={() => setHealthExpanded(!healthExpanded)} className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                <Heart className="h-5 w-5 text-emerald-600" /> Resumen Clínico
                <motion.span animate={{ rotate: healthExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}> <ChevronDown className="h-4 w-4 text-gray-400" /> </motion.span>
              </button>
            </div>
          </CardHeader>
          <AnimatePresence initial={false}>
            {healthExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }} className="overflow-hidden">
                <CardContent className="space-y-4 pt-0">
                  {healthSummary ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-3 text-center flex flex-col justify-center">
                        <Calendar className="h-5 w-5 mx-auto text-emerald-500 dark:text-emerald-400 mb-1" />
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{healthSummary?.totalAppointments ?? 0}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Citas</p>
                      </div>
                      <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-3 text-center flex flex-col justify-center">
                        <Syringe className="h-5 w-5 mx-auto text-emerald-500 dark:text-emerald-400 mb-1" />
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{healthSummary?.vaccinationSummary?.upToDate ?? 0}/{healthSummary?.vaccinationSummary?.total ?? 0}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Vacunas al día</p>
                        {((healthSummary?.vaccinationSummary?.overdue ?? 0) > 0 || (healthSummary?.vaccinationSummary?.dueSoon ?? 0) > 0) && (
                          <div className="flex items-center justify-center gap-1 mt-1">
                            {(healthSummary?.vaccinationSummary?.overdue ?? 0) > 0 && <span className="text-[9px] text-red-600 dark:text-red-400 font-medium">{healthSummary?.vaccinationSummary?.overdue} vencida(s)</span>}
                            {(healthSummary?.vaccinationSummary?.dueSoon ?? 0) > 0 && <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">{healthSummary?.vaccinationSummary?.dueSoon} próxima(s)</span>}
                          </div>
                        )}
                      </div>
                      <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-3 text-center flex flex-col justify-center">
                        <CalendarCheck className="h-5 w-5 mx-auto text-emerald-500 dark:text-emerald-400 mb-1" />
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1 mb-1">{healthSummary?.lastVisitDate ? formatShortDate(healthSummary?.lastVisitDate) : '—'}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Última visita</p>
                      </div>
                      <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-3 text-center flex flex-col justify-center">
                        <CalendarClock className="h-5 w-5 mx-auto text-emerald-500 dark:text-emerald-400 mb-1" />
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1 mb-1">{healthSummary?.nextAppointmentDate ? formatShortDate(healthSummary?.nextAppointmentDate) : '—'}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Próxima cita</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-6 text-center"> <Stethoscope className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" /> <p className="text-sm text-gray-500 dark:text-gray-400">Cargando resumen clínico...</p> </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Weight Tracker Section */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
        <Card className="border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-gray-100"> <Weight className="h-5 w-5 text-emerald-600" /> Registro de Peso</CardTitle>
              {!showWeightForm && (
                <Button size="sm" onClick={() => setShowWeightForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"> <Plus className="h-3.5 w-3.5" /> Agregar</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatePresence>
              {showWeightForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Nuevo Registro de Peso</h4>
                      <Button variant="ghost" size="sm" onClick={() => setShowWeightForm(false)} className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"> <X className="h-4 w-4" /> </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div> <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Fecha *</Label> <Input type="date" value={weightForm.date} onChange={(e) => setWeightForm({ ...weightForm, date: e.target.value })} className="mt-1" /> </div>
                      <div> <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Peso (kg) *</Label> <Input type="number" step="0.1" min="0" placeholder="Ej: 5.2" value={weightForm.weight} onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })} className="mt-1" /> </div>
                      <div> <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Notas</Label> <Input placeholder="Ej: Checkup anual" value={weightForm.notes} onChange={(e) => setWeightForm({ ...weightForm, notes: e.target.value })} className="mt-1" /> </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveWeight} disabled={savingWeight} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"> <Save className="h-3.5 w-3.5 mr-1" /> {savingWeight ? 'Guardando...' : 'Guardar'}</Button>
                      <Button variant="outline" size="sm" onClick={() => setShowWeightForm(false)}>Cancelar</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {chartData.length >= 2 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                    <XAxis dataKey="shortDate" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} domain={['auto', 'auto']} unit=" kg" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }} />
                    {chartData.length > 0 && <ReferenceDot x={chartData[chartData.length - 1].shortDate} y={chartData[chartData.length - 1].weight} r={5} fill="#059669" stroke="#fff" strokeWidth={2} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            {weightHistory.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center"> <Weight className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" /> <p className="text-sm text-gray-500 dark:text-gray-400">No hay registros de peso</p> <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Agrega el primer registro para empezar a rastrear el peso</p> </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[...weightHistory].reverse().map((entry, idx) => {
                  const prevEntry = weightHistory[weightHistory.length - 1 - idx - 1];
                  const diff = prevEntry ? entry.weight - prevEntry.weight : 0;
                  const diffColor = diff > 0.05 ? 'text-amber-600 dark:text-amber-400' : diff < -0.05 ? 'text-sky-600 dark:text-sky-400' : 'text-gray-400 dark:text-gray-500';
                  return (
                    <div key={`${entry.date}-${idx}`} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex-shrink-0"> <Weight className="h-4 w-4" /> </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{entry.weight} kg</p>
                          {prevEntry && <span className={`text-[10px] font-medium ${diffColor}`}>{diff > 0.05 ? '+' : ''}{(diff != null ? Number(diff).toFixed(1) : '—')}</span>}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(entry.date)}{entry.notes ? ` · ${entry.notes}` : ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Vaccination Tracker Section */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.075 }}>
        <Card className="border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-gray-100"> <Syringe className="h-5 w-5 text-emerald-600" /> Vacunaciones</CardTitle>
              {!showVaccForm && (
                <Button size="sm" onClick={() => setShowVaccForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"> <Plus className="h-3.5 w-3.5" /> Agregar</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {vaccinations.filter(v => v.nextDue && getVaccinationStatus(v.nextDue) !== 'ok').length > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1"> <AlertCircle className="h-3.5 w-3.5" /> Próximas vacunas por vencer</p>
                {vaccinations.filter(v => v.nextDue && getVaccinationStatus(v.nextDue) !== 'ok').map((v, idx) => {
                  const status = getVaccinationStatus(v.nextDue);
                  const isOverdue = status === 'overdue';
                  return (
                    <div key={`due-${idx}`} className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                      {isOverdue ? <AlertCircle className="h-4 w-4 text-red-500" /> : <ClockIcon className="h-4 w-4 text-amber-500" />}
                      <span className="font-medium">{v.name}</span>
                      <span className="text-xs">— {isOverdue ? 'Vencida' : 'Vence'}: {formatDate(v.nextDue)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <AnimatePresence>
              {showVaccForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Nueva Vacunación</h4>
                      <Button variant="ghost" size="sm" onClick={() => setShowVaccForm(false)} className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"> <X className="h-4 w-4" /> </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div> <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Nombre de vacuna *</Label> <Input placeholder="Ej: Rabia" value={vaccForm.name} onChange={(e) => setVaccForm({ ...vaccForm, name: e.target.value })} className="mt-1" /> </div>
                      <div> <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Fecha de aplicación *</Label> <Input type="date" value={vaccForm.date} onChange={(e) => setVaccForm({ ...vaccForm, date: e.target.value })} className="mt-1" /> </div>
                      <div> <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Próxima dosis</Label> <Input type="date" value={vaccForm.nextDue} onChange={(e) => setVaccForm({ ...vaccForm, nextDue: e.target.value })} className="mt-1" /> </div>
                      <div> <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Veterinario</Label> <Input placeholder="Ej: Dr. García" value={vaccForm.vet} onChange={(e) => setVaccForm({ ...vaccForm, vet: e.target.value })} className="mt-1" /> </div>
                    </div>
                    <div> <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Notas</Label> <Input placeholder="Notas adicionales..." value={vaccForm.notes} onChange={(e) => setVaccForm({ ...vaccForm, notes: e.target.value })} className="mt-1" /> </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveVaccination} disabled={savingVacc} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"> <Save className="h-3.5 w-3.5 mr-1" /> {savingVacc ? 'Guardando...' : 'Guardar'}</Button>
                      <Button variant="outline" size="sm" onClick={() => setShowVaccForm(false)}>Cancelar</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {vaccinations.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center"> <Syringe className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" /> <p className="text-sm text-gray-500 dark:text-gray-400">No hay vacunaciones registradas</p> <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Agrega la primera vacunación para empezar el seguimiento</p> </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {vaccinations.map((vacc, idx) => {
                  const status = getVaccinationStatus(vacc.nextDue);
                  const statusColor = status === 'ok' ? 'bg-emerald-500' : status === 'soon' ? 'bg-amber-500' : 'bg-red-500';
                  const statusBg = status === 'ok' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : status === 'soon' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800';
                  const statusBadge = status === 'ok' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : status === 'soon' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
                  const statusLabel = status === 'ok' ? 'Al día' : status === 'soon' ? 'Próxima' : 'Vencida';
                  const StatusIcon = status === 'ok' ? CheckCircle2 : status === 'soon' ? ClockIcon : AlertCircle;
                  return (
                    <div key={`vacc-${idx}`} className="relative pl-6 py-2.5">
                      {idx < vaccinations.length - 1 && <div className="absolute left-[7px] top-6 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />}
                      <div className={`absolute left-0 top-3 h-3.5 w-3.5 rounded-full ${statusColor} border-2 border-white dark:border-gray-800`} />
                      <div className={`rounded-lg border p-3 space-y-1 ${statusBg}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2"> <Syringe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{vacc.name}</p> </div>
                          <Badge variant="secondary" className={`${statusBadge} text-[10px] gap-0.5`}> <StatusIcon className="h-2.5 w-2.5" />{statusLabel}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1"> <Calendar className="h-3 w-3" />{formatShortDate(vacc.date)}</span>
                          {vacc.nextDue && <span className="flex items-center gap-1"> <ClockIcon className="h-3 w-3" />Próxima: {formatShortDate(vacc.nextDue)}</span>}
                          {vacc.vet && <span className="flex items-center gap-1"> <ShieldCheck className="h-3 w-3" />{vacc.vet}</span>}
                        </div>
                        {vacc.notes && <p className="text-xs text-gray-400 dark:text-gray-500">{vacc.notes}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Appointment History */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card className="border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3"> <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-gray-100"> <Calendar className="h-5 w-5 text-emerald-600" /> Historial de Citas</CardTitle> </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center"> <PawPrint className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" /> <p className="text-sm text-gray-500 dark:text-gray-400">No hay citas registradas para esta mascota</p> </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {appointments.map((apt) => {
                  const st = statusConfig[apt.status] || statusConfig.pending;
                  return (
                    <div key={apt.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer" onClick={() => router.visit(`/client/appointments/${apt.id}`)}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex-shrink-0"> <Clock className="h-4 w-4" /> </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{apt.service.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(apt.date)} · {formatTime(apt.startTime)} - {formatTime(apt.endTime)}</p>
                      </div>
                      <Badge variant="secondary" className={st.className}>{st.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

PetDetail.layout = (page: React.ReactNode) => <ClientLayout>{page}</ClientLayout>;