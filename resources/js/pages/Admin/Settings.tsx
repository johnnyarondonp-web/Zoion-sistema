import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/layout/AdminLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Settings as SettingsIcon,
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Bell,
  BellRing,
  MailCheck,
  CalendarCheck,
  Sun,
  Moon,
  Download,
  Trash2,
  Info,
  Code2,
  Heart,
  Save,
  Database,
  Shield,
  Palette,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useTheme, type Theme } from '@/hooks/use-theme';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ClinicInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface NotificationPrefs {
  emailNotifications: boolean;
  appointmentReminders: boolean;
  dailySummary: boolean;
}

interface ScheduleItem {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isAvailable: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const dayLabels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

// ─── Animation Variants ──────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function Settings() {
  const { theme, setTheme } = useTheme();
  
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo>({
    name: 'Clínica Veterinaria Zoion',
    address: 'Av. de la Constitución 42, Madrid',
    phone: '+34 900 123 456',
    email: 'info@zoion.vet',
  });
  
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    emailNotifications: true,
    appointmentReminders: true,
    dailySummary: false,
  });
  
  const [savingClinic, setSavingClinic] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cargar datos al montar
  useEffect(() => {
    const loadData = async () => {
      // Cargar info de clínica (API con fallback a localStorage)
      try {
        const res = await fetch('/api/user/clinic-info', {
          headers: { 'X-CSRF-TOKEN': getCsrfToken() },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) setClinicInfo(data.data);
        }
      } catch {
        // Fallback a localStorage
        const saved = localStorage.getItem('zoion_clinic_info');
        if (saved) {
          try { setClinicInfo(JSON.parse(saved)); } catch { /* ignore */ }
        }
      }

      // Cargar preferencias de notificación (API con fallback)
      try {
        const res = await fetch('/api/user/preferences', {
          headers: { 'X-CSRF-TOKEN': getCsrfToken() },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) setNotificationPrefs(data.data);
        }
      } catch {
        const saved = localStorage.getItem('zoion_notification_prefs');
        if (saved) {
          try { setNotificationPrefs(JSON.parse(saved)); } catch { /* ignore */ }
        }
      }

      // Cargar horarios
      await fetchSchedules();
      setLoading(false);
    };
    
    loadData();
  }, []);

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/schedules', {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      const data = await res.json();
      if (data.success) setSchedules(data.data);
    } catch {
      // silent
    }
  };

  const handleSaveClinic = async () => {
    setSavingClinic(true);
    try {
      const res = await fetch('/api/user/clinic-info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(clinicInfo),
      });
      
      if (res.ok) {
        toast.success('Información de la clínica guardada');
      } else {
        // Fallback a localStorage si falla la API
        localStorage.setItem('zoion_clinic_info', JSON.stringify(clinicInfo));
        toast.success('Información guardada localmente');
      }
    } catch {
      localStorage.setItem('zoion_clinic_info', JSON.stringify(clinicInfo));
      toast.success('Información guardada localmente');
    } finally {
      setSavingClinic(false);
    }
  };

  const handleToggleNotification = async (key: keyof NotificationPrefs) => {
    const newPrefs = { ...notificationPrefs, [key]: !notificationPrefs[key] };
    setNotificationPrefs(newPrefs);
    
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({ [key]: newPrefs[key] }),
      });
      
      if (!res.ok) throw new Error('API error');
      toast.success('Preferencias actualizadas');
    } catch {
      // Fallback a localStorage
      localStorage.setItem('zoion_notification_prefs', JSON.stringify(newPrefs));
      toast.success('Preferencias actualizadas (local)');
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const [appointmentsRes, clientsRes, servicesRes] = await Promise.all([
        fetch('/api/appointments?limit=9999', { headers: { 'X-CSRF-TOKEN': getCsrfToken() } }),
        fetch('/api/admin/clients', { headers: { 'X-CSRF-TOKEN': getCsrfToken() } }),
        fetch('/api/services', { headers: { 'X-CSRF-TOKEN': getCsrfToken() } }),
      ]);

      const appointments = appointmentsRes.ok ? await appointmentsRes.json() : { data: {} };
      const clients = clientsRes.ok ? await clientsRes.json() : { data: [] };
      const services = servicesRes.ok ? await servicesRes.json() : { data: [] };

      const exportData = {
        exportDate: new Date().toISOString(),
        clinic: clinicInfo,
        appointments: appointments.data?.appointments || appointments.data || [],
        clients: clients.data || [],
        services: services.data || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zoion-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Datos exportados exitosamente');
    } catch {
      toast.error('Error al exportar datos');
    } finally {
      setExporting(false);
    }
  };

  const handleClearTestData = () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar todos los datos de prueba? Esta acción no se puede deshacer.')) return;
    setClearing(true);
    setTimeout(() => {
      setClearing(false);
      toast.success('Datos de prueba eliminados (demo)');
    }, 1000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardContent className="p-6 space-y-3"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-3/4" /></CardContent></Card>
          <Card><CardContent className="p-6 space-y-3"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-1/2" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-emerald-600" />
          Configuración
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Administra la configuración del sistema y la información de la clínica
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Clinic Information */}
          <motion.div variants={item}>
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                  Información de la Clínica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Nombre
                  </Label>
                  <Input
                    value={clinicInfo.name}
                    onChange={(e) => setClinicInfo({ ...clinicInfo, name: e.target.value })}
                    className="mt-1"
                    placeholder="Nombre de la clínica"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Dirección
                  </Label>
                  <Input
                    value={clinicInfo.address}
                    onChange={(e) => setClinicInfo({ ...clinicInfo, address: e.target.value })}
                    className="mt-1"
                    placeholder="Dirección"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Teléfono
                  </Label>
                  <Input
                    value={clinicInfo.phone}
                    onChange={(e) => setClinicInfo({ ...clinicInfo, phone: e.target.value })}
                    className="mt-1"
                    placeholder="Teléfono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <Input
                    type="email"
                    value={clinicInfo.email}
                    onChange={(e) => setClinicInfo({ ...clinicInfo, email: e.target.value })}
                    className="mt-1"
                    placeholder="Email"
                  />
                </div>
                <Button
                  onClick={handleSaveClinic}
                  disabled={savingClinic}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  <Save className="h-4 w-4" />
                  {savingClinic ? 'Guardando...' : 'Guardar Información'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Business Hours */}
          <motion.div variants={item}>
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  Horario de Atención
                </CardTitle>
              </CardHeader>
              <CardContent>
                {schedules.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No hay horarios configurados</p>
                ) : (
                  <div className="space-y-2">
                    {schedules.sort((a, b) => {
                      const dayA = (a as any).day_of_week ?? a.dayOfWeek;
                      const dayB = (b as any).day_of_week ?? b.dayOfWeek;
                      return dayA - dayB;
                    }).map((schedule) => {
                      const day = (schedule as any).day_of_week ?? schedule.dayOfWeek;
                      const open = (schedule as any).open_time ?? schedule.openTime;
                      const close = (schedule as any).close_time ?? schedule.closeTime;
                      const available = (schedule as any).is_available ?? schedule.isAvailable;
                      
                      return (
                        <div
                          key={day}
                          className={`flex items-center justify-between p-2.5 rounded-lg border ${
                            available
                              ? 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20'
                              : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-2.5 w-2.5 rounded-full ${available ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {dayLabels[day]}
                            </span>
                          </div>
                          <span className={`text-sm ${available ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                            {available ? `${open} - ${close}` : 'Cerrado'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Theme Settings - CON HOOK PERSONALIZADO */}
          <motion.div variants={item}>
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  <Palette className="h-5 w-5 text-emerald-600" />
                  Apariencia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? (
                      <Moon className="h-5 w-5 text-sky-500" />
                    ) : (
                      <Sun className="h-5 w-5 text-amber-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Tema</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {theme === 'dark' ? 'Modo oscuro activado' : theme === 'light' ? 'Modo claro activado' : 'Tema del sistema'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                    {/* Botón Claro */}
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        theme === 'light'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Sun className="h-3.5 w-3.5" />
                      Claro
                    </button>
                    {/* Botón Oscuro */}
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        theme === 'dark'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Moon className="h-3.5 w-3.5" />
                      Oscuro
                    </button>
                    {/* Botón Sistema */}
                    <button
                      onClick={() => setTheme('system')}
                      className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        theme === 'system'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                      }`}
                    >
                      Sistema
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Notification Preferences */}
          <motion.div variants={item}>
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  <Bell className="h-5 w-5 text-emerald-600" />
                  Preferencias de Notificaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Email notifications */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex items-center gap-3">
                    <MailCheck className="h-5 w-5 text-sky-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Notificaciones por email</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Recibir alertas y actualizaciones por correo</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleNotification('emailNotifications')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                      notificationPrefs.emailNotifications ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        notificationPrefs.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Appointment reminders */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex items-center gap-3">
                    <CalendarCheck className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Recordatorios de citas</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Notificar antes de cada cita programada</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleNotification('appointmentReminders')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                      notificationPrefs.appointmentReminders ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        notificationPrefs.appointmentReminders ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Daily summary */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex items-center gap-3">
                    <BellRing className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Resumen diario</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Recibir un resumen diario de actividad</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleNotification('dailySummary')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                      notificationPrefs.dailySummary ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        notificationPrefs.dailySummary ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Data Management */}
          <motion.div variants={item}>
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  <Database className="h-5 w-5 text-emerald-600" />
                  Gestión de Datos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleExportData}
                  disabled={exporting}
                  variant="outline"
                  className="w-full border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 gap-2"
                >
                  <Download className="h-4 w-4" />
                  {exporting ? 'Exportando...' : 'Exportar Todos los Datos'}
                </Button>
                <Button
                  onClick={handleClearTestData}
                  disabled={clearing}
                  variant="outline"
                  className="w-full border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {clearing ? 'Eliminando...' : 'Limpiar Datos de Prueba'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* About the System */}
          <motion.div variants={item}>
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  <Info className="h-5 w-5 text-emerald-600" />
                  Acerca del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex items-center gap-3">
                    <Code2 className="h-5 w-5 text-sky-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Versión</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">3.9.7</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-none">
                    Estable
                  </Badge>
                </div>

                <Separator />

                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                    Stack Tecnológico
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Laravel 13', color: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
                      { label: 'TypeScript', color: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400' },
                      { label: 'Tailwind CSS 4', color: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400' },
                      { label: 'Inertia.js', color: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400' },
                      { label: 'PostgreSQL', color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
                      { label: 'shadcn/ui', color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
                      { label: 'Framer Motion', color: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' },
                      { label: 'Sanctum', color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
                    ].map((tech) => (
                      <span
                        key={tech.label}
                        className={`text-[10px] font-medium px-2 py-1 rounded-full ${tech.color}`}
                      >
                        {tech.label}
                      </span>
                    ))}
                  </div>
                </div>

                <Separator />



                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span className="text-gray-500 dark:text-gray-400">Zoion Veterinary Management System</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

Settings.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;