import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, Calendar, Shield, Save, Loader2, Eye, EyeOff,
  ShieldCheck, KeyRound, Heart, Clock, PawPrint, Activity, FileText,
  CheckCircle2, AlertCircle, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import ClientLayout from '@/components/layout/ClientLayout';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ProfileStats {
  petCount: number;
  appointmentCount: number;
  lastAppointment: string | null;
  memberSince: string | null;
}

interface ActivityItem {
  id: string;
  type: 'appointment' | 'pet' | 'profile';
  description: string;
  date: string;
  icon: React.ReactNode;
  color: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

export default function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [stats, setStats] = useState<ProfileStats>({
    petCount: 0,
    appointmentCount: 0,
    lastAppointment: null,
    memberSince: null,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const [petsRes, appointmentsRes] = await Promise.all([
        fetch('/api/pets', { headers: { 'X-CSRF-TOKEN': getCsrfToken() } }),
        fetch('/api/appointments?limit=5', { headers: { 'X-CSRF-TOKEN': getCsrfToken() } }),
      ]);

      let petCount = 0;
      let appointmentCount = 0;
      let lastAppointment: string | null = null;
      const activities: ActivityItem[] = [];

      if (petsRes.ok) {
        const petsData = await petsRes.json();
        const pets = petsData.data || [];
        petCount = pets.length;
        pets.slice(0, 2).forEach((pet: { id: string; name: string; createdAt: string }) => {
          activities.push({
            id: `pet-${pet.id}`,
            type: 'pet',
            description: `Mascota registrada: ${pet.name}`,
            date: pet.createdAt,
            icon: <PawPrint className="h-3.5 w-3.5" />,
            color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
          });
        });
      }

      if (appointmentsRes.ok) {
        const apptData = await appointmentsRes.json();
        appointmentCount = apptData.data?.pagination?.total || 0;
        const appts = apptData.data?.appointments;
        if (appts && appts.length > 0) {
          lastAppointment = appts[0].date;
          const statusEmoji: Record<string, string> = {
            pending: '⏳',
            confirmed: '✅',
            completed: '🎉',
            cancelled: '❌',
            no_show: '⚠️',
          };
          appts.slice(0, 3).forEach((apt: { id: string; status: string; service: { name: string }; date: string; createdAt: string }) => {
            activities.push({
              id: `apt-${apt.id}`,
              type: 'appointment',
              description: `Cita ${statusEmoji[apt.status] || ''} ${apt.service?.name || ''}`,
              date: apt.createdAt || apt.date,
              icon: <Activity className="h-3.5 w-3.5" />,
              color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
            });
          });
        }
      }

      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setStats({
        petCount,
        appointmentCount,
        lastAppointment,
        memberSince: (user as unknown as { createdAt?: string })?.createdAt || null,
      });
      setRecentActivity(activities.slice(0, 5));
    } catch {
      // Silently fail
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchStats();
  }, [user, fetchStats]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar el perfil');
      }

      // Recargar página para sincronizar sesión Inertia
      router.reload();
      toast.success('Perfil actualizado correctamente');
      setIsEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar el perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setPhone(user?.phone || '');
    setIsEditing(false);
  };

  const getPasswordStrength = (password: string): { level: string; score: number; color: string; checks: { label: string; passed: boolean }[] } => {
    if (!password) return { level: '', score: 0, color: '', checks: [] };
    const checks = [
      { label: 'Mínimo 6 caracteres', passed: password.length >= 6 },
      { label: 'Al menos 8 caracteres', passed: password.length >= 8 },
      { label: 'Contiene mayúscula', passed: /[A-Z]/.test(password) },
      { label: 'Contiene número', passed: /[0-9]/.test(password) },
      { label: 'Contiene símbolo', passed: /[^A-Za-z0-9]/.test(password) },
    ];

    const passedCount = checks.filter(c => c.passed).length;

    if (passedCount <= 2) return { level: 'Débil', score: 20, color: 'bg-red-500', checks };
    if (passedCount <= 3) return { level: 'Media', score: 55, color: 'bg-amber-500', checks };
    if (passedCount <= 4) return { level: 'Buena', score: 80, color: 'bg-emerald-400', checks };
    return { level: 'Fuerte', score: 100, color: 'bg-emerald-500', checks };
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Ingresa tu contraseña actual');
      return;
    }
    if (!newPassword) {
      toast.error('Ingresa la nueva contraseña');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (currentPassword === newPassword) {
      toast.error('La nueva contraseña debe ser diferente a la actual');
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al cambiar la contraseña');
      }

      toast.success('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cambiar la contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatShortDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatActivityDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Hoy';
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      return formatShortDate(dateString) || '';
    } catch {
      return '';
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <User className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Mi Perfil
          </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gestiona la información de tu cuenta
        </p>
      </motion.div>

      {/* Gradient Banner with Avatar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card className="overflow-hidden">
          <div className="relative h-32 bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute top-8 left-12 h-20 w-20 rounded-full bg-white/5 blur-xl" />
              <div className="absolute -bottom-4 left-1/3 h-24 w-24 rounded-full bg-teal-300/10 blur-2xl" />
              <svg className="absolute bottom-0 left-0 right-0 w-full opacity-10" viewBox="0 0 400 40" fill="none">
                <path d="M0 40V20C50 5 100 35 200 20C300 5 350 30 400 15V40H0Z" fill="white" />
              </svg>
            </div>
          </div>
          <div className="relative px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-200/50 dark:shadow-emerald-900/30 ring-4 ring-white dark:ring-gray-900 text-2xl font-bold text-white">
                {user.name
                  ?.split(' ')
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || 'U'}
              </div>
              <div className="text-center sm:text-left flex-1 pt-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{user.name || 'Usuario'}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                <div className="mt-1.5 flex items-center gap-2 justify-center sm:justify-start">
                  <Badge
                    variant={user.role === 'admin' ? 'default' : 'secondary'}
                    className={
                      user.role === 'admin'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }
                  >
                    {user.role === 'admin' ? '👑 Admin' : '👤 Cliente'}
                  </Badge>
                  {user.phone && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {user.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="grid grid-cols-3 gap-3">
          <Card className="overflow-hidden relative group">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500" />
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/40 group-hover:scale-110 transition-transform duration-200">
                  <Heart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              {statsLoading ? (
                <div className="h-7 w-8 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{stats.petCount}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Mascotas</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden relative group">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-500" />
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-900/40 group-hover:scale-110 transition-transform duration-200">
                  <Calendar className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
              {statsLoading ? (
                <div className="h-7 w-8 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{stats.appointmentCount}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Citas totales</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden relative group">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/40 group-hover:scale-110 transition-transform duration-200">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              {statsLoading ? (
                <div className="h-7 w-12 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-7">
                  {stats.memberSince ? new Date(stats.memberSince).getFullYear() : '—'}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Miembro desde</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Recent Activity Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      <div className="h-2 w-20 bg-gray-50 dark:bg-gray-800/50 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="relative">
                <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-100 dark:bg-gray-800" />
                <div className="space-y-4">
                  {recentActivity.map((activity, idx) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.08 }}
                      className="flex items-start gap-3 relative"
                    >
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${activity.color} flex-shrink-0 z-10 ring-2 ring-white dark:ring-gray-900`}>
                        {activity.icon}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{activity.description}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{formatActivityDate(activity.date)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Sin actividad reciente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Editable Fields Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Información Personal
              </CardTitle>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/30"
                >
                  Editar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Nombre</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" placeholder="Tu nombre completo" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" placeholder="+52 555 123 4567" />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3 justify-end">
                  <Button variant="outline" onClick={handleCancel} disabled={isSaving}>Cancelar</Button>
                  <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : (<><Save className="mr-2 h-4 w-4" />Guardar</>)}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                    <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Nombre</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name || 'No especificado'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                    <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Correo electrónico</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.email || 'No especificado'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                    <Phone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Teléfono</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.phone || 'No especificado'}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Account Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Información de la Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rol</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user.role === 'admin' ? 'Administrador' : 'Cliente'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Miembro desde</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatDate((user as unknown as { createdAt?: string }).createdAt ? (user as unknown as { createdAt: string }).createdAt : undefined)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security / Change Password Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Seguridad</CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Cambia tu contraseña para mantener tu cuenta protegida
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-sm font-medium">Contraseña actual</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input id="currentPassword" type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="pl-10 pr-10" placeholder="Ingresa tu contraseña actual" />
                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label={showCurrentPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">Nueva contraseña</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input id="newPassword" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-10 pr-10" placeholder="Mínimo 6 caracteres" />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {newPassword && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3 pt-1"
                >
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((segment) => (
                        <div
                          key={segment}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            segment <= (passwordStrength.score / 20)
                              ? passwordStrength.color
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Zap className={`h-3 w-3 ${
                          passwordStrength.level === 'Débil' ? 'text-red-500' :
                          passwordStrength.level === 'Media' ? 'text-amber-500' :
                          passwordStrength.level === 'Buena' ? 'text-emerald-400' :
                          'text-emerald-500'
                        }`} />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Fortaleza:{' '}
                          <span className={`font-semibold ${
                            passwordStrength.level === 'Débil' ? 'text-red-500' :
                            passwordStrength.level === 'Media' ? 'text-amber-500' :
                            passwordStrength.level === 'Buena' ? 'text-emerald-400' :
                            'text-emerald-500'
                          }`}>
                            {passwordStrength.level}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {passwordStrength.checks.map((check) => (
                      <div key={check.label} className="flex items-center gap-1.5">
                        {check.passed ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                        )}
                        <span className={`text-[11px] ${check.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar nueva contraseña</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 pr-10" placeholder="Repite la nueva contraseña" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
              )}
              {confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                <p className="text-xs text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Las contraseñas coinciden
                </p>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-end">
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isChangingPassword ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Actualizando...</>) : (<><ShieldCheck className="mr-2 h-4 w-4" />Cambiar Contraseña</>)}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
Profile.layout = (page: React.ReactNode) => <ClientLayout>{page}</ClientLayout>;