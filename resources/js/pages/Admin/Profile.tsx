import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, Shield, Save, Loader2, Eye, EyeOff,
  ShieldCheck, KeyRound, Zap, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import AdminLayout from '@/components/layout/AdminLayout';

// ─── Helpers ────────────────────────────────────────────────────────────────
const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

export default function AdminProfile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

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
    <div className="mx-auto max-w-2xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <User className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Mi Perfil Administrativo
          </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestiona tu información de acceso y contacto</p>
      </motion.div>

      {/* Header Banner */}
      <Card className="overflow-hidden">
        <div className="relative h-32 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700">
          <div className="absolute inset-0 overflow-hidden opacity-20">
             <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white blur-3xl" />
             <div className="absolute top-10 left-10 h-24 w-24 rounded-full bg-white blur-2xl" />
          </div>
        </div>
        <div className="relative px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-xl ring-4 ring-white dark:ring-gray-900 text-2xl font-bold text-emerald-600">
              {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="text-center sm:text-left flex-1 pt-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{user.name}</h2>
              <div className="mt-1 flex items-center gap-2 justify-center sm:justify-start">
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-none">
                  👑 {user.role === 'admin' ? 'Administrador' : 'Recepcionista'}
                </Badge>
                <span className="text-xs text-gray-500">{user.email}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600" /> Información Personal
            </CardTitle>
            {!isEditing && <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Editar</Button>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={handleCancel}>Cancelar</Button>
                <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
               <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                 <p className="text-xs text-gray-500 mb-1">Nombre</p>
                 <p className="text-sm font-medium">{user.name}</p>
               </div>
               <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                 <p className="text-xs text-gray-500 mb-1">Correo</p>
                 <p className="text-sm font-medium">{user.email}</p>
               </div>
               <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                 <p className="text-xs text-gray-500 mb-1">Teléfono</p>
                 <p className="text-sm font-medium">{user.phone || 'No registrado'}</p>
               </div>
               <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                 <p className="text-xs text-gray-500 mb-1">Rol de Acceso</p>
                 <p className="text-sm font-medium capitalize">{user.role}</p>
               </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
           <CardTitle className="text-lg flex items-center gap-2">
             <ShieldCheck className="h-5 w-5 text-emerald-600" /> Seguridad
           </CardTitle>
           <CardDescription>Actualiza tu contraseña periódicamente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="space-y-2">
             <Label>Contraseña actual</Label>
             <div className="relative">
               <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
               <Input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="pl-10" />
               <button onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                 {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
               </button>
             </div>
           </div>
           <div className="grid gap-4 sm:grid-cols-2">
             <div className="space-y-2">
               <Label>Nueva contraseña</Label>
               <Input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
             </div>
             <div className="space-y-2">
               <Label>Confirmar nueva</Label>
               <Input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
             </div>
           </div>
           
           {newPassword && (
             <div className="space-y-2">
               <div className="flex gap-1">
                 {[1,2,3,4,5].map(i => (
                   <div key={i} className={`h-1 flex-1 rounded-full ${i <= (passwordStrength.score/20) ? passwordStrength.color : 'bg-gray-200'}`} />
                 ))}
               </div>
               <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Fortaleza: {passwordStrength.level}</p>
             </div>
           )}

           <Button 
            onClick={handleChangePassword} 
            disabled={isChangingPassword || !newPassword || newPassword !== confirmPassword} 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
           >
             {isChangingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
           </Button>
        </CardContent>
      </Card>
    </div>
  );
}

AdminProfile.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
