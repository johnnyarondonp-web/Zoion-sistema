import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, Shield, Save, Loader2, Eye, EyeOff,
  ShieldCheck, KeyRound, Zap, CheckCircle2, AlertCircle,
  Stethoscope,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import DoctorLayout from '@/components/layout/DoctorLayout';

const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

export default function DoctorProfile() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const getPasswordStrength = (password: string) => {
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
    if (!currentPassword || !newPassword) {
      toast.error('Completa todos los campos');
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
      if (!res.ok) throw new Error(data.error || 'Error al cambiar la contraseña');

      toast.success('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      router.reload(); // Reload to update the needsPasswordChange state
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cambiar la contraseña');
    } finally {
      setIsChangingPassword(false);
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
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Mi Perfil</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Consulta tu información y gestiona tu seguridad</p>
      </motion.div>

      {user.needsPasswordChange && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-800">Actualiza tu contraseña</h3>
              <p className="text-sm text-amber-700 mt-1">
                Hemos detectado que sigues usando tu cédula como contraseña predeterminada. Por seguridad, te recomendamos cambiarla lo antes posible.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header Banner */}
      <Card className="overflow-hidden border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 rounded-3xl">
        <div className="relative h-32 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700">
          <div className="absolute inset-0 overflow-hidden opacity-20">
             <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white blur-3xl" />
             <div className="absolute top-10 left-10 h-24 w-24 rounded-full bg-white blur-2xl" />
          </div>
        </div>
        <div className="relative px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
            <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white dark:bg-gray-800 shadow-xl ring-4 ring-white dark:ring-gray-900 text-3xl font-black text-emerald-600">
              {user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="text-center sm:text-left flex-1 pt-2">
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{user.name}</h2>
              <div className="mt-1 flex items-center gap-2 justify-center sm:justify-start">
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-none px-3 font-bold">
                  <Stethoscope className="h-3 w-3 mr-1" /> Médico
                </Badge>
                <span className="text-sm text-gray-500 font-medium">{user.email}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card className="border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-black">
              <User className="h-5 w-5 text-sky-500" /> Información Personal
            </CardTitle>
            <CardDescription>Tus datos de contacto (Solo lectura)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Nombre Completo</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Correo Electrónico</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{user.email}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Teléfono</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{user.phone || 'No registrado'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 rounded-3xl">
          <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2 font-black">
               <ShieldCheck className="h-5 w-5 text-emerald-500" /> Seguridad
             </CardTitle>
             <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
             <div className="space-y-2">
               <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Contraseña actual</Label>
               <div className="relative">
                 <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                 <Input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="pl-10 h-11 rounded-xl bg-gray-50 dark:bg-gray-800/40" />
                 <button onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                   {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                 </button>
               </div>
             </div>
             <div className="space-y-4">
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nueva contraseña</Label>
                 <Input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-11 rounded-xl bg-gray-50 dark:bg-gray-800/40" />
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Confirmar nueva</Label>
                 <Input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="h-11 rounded-xl bg-gray-50 dark:bg-gray-800/40" />
               </div>
             </div>
             
             {newPassword && (
               <div className="space-y-2">
                 <div className="flex gap-1">
                   {[1,2,3,4,5].map(i => (
                     <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= (passwordStrength.score/20) ? passwordStrength.color : 'bg-gray-200 dark:bg-gray-700'}`} />
                   ))}
                 </div>
                 <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Fortaleza: {passwordStrength.level}</p>
               </div>
             )}

             <Button 
              onClick={handleChangePassword} 
              disabled={isChangingPassword || !newPassword || newPassword !== confirmPassword} 
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 rounded-xl font-bold tracking-widest shadow-lg shadow-emerald-500/20"
             >
               {isChangingPassword ? 'ACTUALIZANDO...' : 'CAMBIAR CONTRASEÑA'}
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

DoctorProfile.layout = (page: React.ReactNode) => <DoctorLayout>{page}</DoctorLayout>;
