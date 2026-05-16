import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Plus, User, Phone, Pencil, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import AdminLayout from '@/components/layout/AdminLayout';

interface Receptionist {
  id: string;
  name: string;
  phone: string | null;
  email: string;
}

const emptyForm = { 
  name: '', 
  phone: '', 
  email: '', 
  password: ''
};
const getCsrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
const headers = (extra = {}) => ({ 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrf(), ...extra });

const NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
const VENEZUELA_PHONE_REGEX = /^\+58\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Receptionists() {
  const [receptionists, setReceptionists] = useState<Receptionist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Receptionist | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [confirmDelete, setConfirmDelete] = useState<Receptionist | null>(null);

  useEffect(() => {
    fetch('/api/admin/receptionists').then(r => r.json())
    .then((d) => {
      if (d.success) setReceptionists(d.data);
    }).finally(() => setLoading(false));
  }, []);

  const openCreate = () => { 
    setEditTarget(null); 
    setForm(emptyForm); 
    setTouched({});
    setModalOpen(true); 
  };

  const openEdit = (rec: Receptionist) => {
    setEditTarget(rec);
    setForm({ 
      name: rec.name, 
      phone: rec.phone || '', 
      email: rec.email || '', 
      password: ''
    });
    setTouched({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: string[] = [];

    if (!form.name.trim()) {
      errors.push('El nombre es requerido');
    } else if (form.name.trim().length < 4 || form.name.trim().length > 40) {
      errors.push('El nombre debe tener entre 4 y 40 caracteres');
    } else if (!NAME_REGEX.test(form.name.trim())) {
      errors.push('El nombre solo puede contener letras y espacios');
    }

    if (!form.email) {
      errors.push('El correo es requerido');
    } else if (!EMAIL_REGEX.test(form.email)) {
      errors.push('El correo electrónico no es válido');
    }

    if (!editTarget && !form.password) {
      errors.push('La contraseña es obligatoria al crear un usuario');
    } else if (form.password && form.password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    if (form.phone && !VENEZUELA_PHONE_REGEX.test(form.phone)) {
      errors.push('Teléfono inválido. Formato requerido: +584121234567');
    }

    if (errors.length > 0) {
      toast.error(errors[0]);
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const isEditing = !!editTarget;
      const url = isEditing ? `/api/admin/receptionists/${editTarget.id}` : '/api/admin/receptionists';
      const method = isEditing ? 'PATCH' : 'POST';

      const payload: any = { ...form };
      if (isEditing && !form.password) {
        delete payload.password;
      }

      const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(payload) });
      const data = await res.json();
      
      if (data.success) {
        toast.success(isEditing ? 'Recepcionista actualizado' : 'Recepcionista registrado exitosamente');
        setModalOpen(false);
        if (isEditing) {
          setReceptionists(prev => prev.map(r => r.id === editTarget.id ? data.data : r));
        } else {
          setReceptionists(prev => [data.data, ...prev]);
        }
      } else {
        toast.error(data.error || 'Error al guardar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const deleteReceptionist = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/admin/receptionists/${confirmDelete.id}`, { method: 'DELETE', headers: headers() });
      const data = await res.json();
      if (data.success) {
        toast.success('Recepcionista eliminado');
        setReceptionists(prev => prev.filter(r => r.id !== confirmDelete.id));
      } else {
        toast.error(data.error || 'Error al eliminar');
      }
    } catch {
      toast.error('Error de red');
    } finally {
      setConfirmDelete(null);
    }
  };

  const hasError = (field: keyof typeof form) => {
    if (!touched[field]) return false;
    if (field === 'name') return !form.name.trim() || form.name.length < 4 || !NAME_REGEX.test(form.name);
    if (field === 'email') return !form.email.trim() || !EMAIL_REGEX.test(form.email);
    if (field === 'phone') return form.phone && !VENEZUELA_PHONE_REGEX.test(form.phone);
    if (field === 'password') return !editTarget && form.password.length < 6;
    return false;
  };

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6 max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Recepcionistas</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Gestiona el personal de recepción de la clínica</p>
          </div>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 h-11 font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
            <Plus className="h-4 w-4 mr-2" /> Nuevo Recepcionista
          </Button>
        </div>

        {/* Grid de Recepcionistas */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}
          </div>
        ) : receptionists.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800">
            <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sin personal registrado</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">Aún no has registrado a ningún recepcionista en el sistema.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {receptionists.map((rec, i) => (
              <motion.div key={rec.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                <Card className="rounded-3xl border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 group bg-white dark:bg-gray-900">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/20 flex items-center justify-center border border-emerald-100/50 dark:border-emerald-800/50 shadow-inner">
                          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                            {rec.name[0]}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1 text-lg">{rec.name}</h3>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Recepción</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                        <User className="h-4 w-4 text-sky-500" />
                        <span className="truncate">{rec.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                        <Phone className="h-4 w-4 text-amber-500" />
                        {rec.phone || <span className="text-gray-400 italic text-xs">Sin teléfono</span>}
                      </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                      <Button variant="outline" className="flex-1 rounded-xl h-10 border-gray-200 dark:border-gray-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200" onClick={() => openEdit(rec)}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </Button>
                      <Button variant="outline" className="w-10 px-0 rounded-xl border-gray-200 dark:border-gray-700 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={() => setConfirmDelete(rec)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal de Formulario */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <User className="h-5 w-5" />
                {editTarget ? 'Editar Recepcionista' : 'Nuevo Recepcionista'}
              </DialogTitle>
            </div>
            
            <div className="p-6 space-y-4 bg-white dark:bg-gray-900">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre Completo <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={e => { setForm({...form, name: e.target.value}); setTouched({...touched, name: true}); }} placeholder="Ej: María Pérez" className={`h-11 rounded-xl ${hasError('name') ? 'border-red-500' : ''}`} />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Correo Electrónico <span className="text-red-500">*</span></Label>
                <Input value={form.email} onChange={e => { setForm({...form, email: e.target.value}); setTouched({...touched, email: true}); }} placeholder="correo@clinica.com" type="email" className={`h-11 rounded-xl ${hasError('email') ? 'border-red-500' : ''}`} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contraseña {editTarget ? '(Opcional para cambiar)' : '<span className="text-red-500">*</span>'}</Label>
                <Input value={form.password} onChange={e => { setForm({...form, password: e.target.value}); setTouched({...touched, password: true}); }} placeholder="Mínimo 6 caracteres" type="password" className={`h-11 rounded-xl ${hasError('password') ? 'border-red-500' : ''}`} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Teléfono</Label>
                <Input value={form.phone} onChange={e => { setForm({...form, phone: e.target.value}); setTouched({...touched, phone: true}); }} placeholder="+584121234567" className={`h-11 rounded-xl ${hasError('phone') ? 'border-red-500' : ''}`} />
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="ghost" className="flex-1 rounded-xl font-bold" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-lg shadow-emerald-500/20" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Confirmación Desactivar/Eliminar */}
        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-md p-6">
            <AlertDialogHeader>
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-center text-xl font-bold">¿Eliminar recepcionista?</AlertDialogTitle>
              <AlertDialogDescription className="text-center text-gray-500">
                Esta acción eliminará permanentemente a <strong>{confirmDelete?.name}</strong> del sistema. Sus acciones previas quedarán registradas, pero ya no podrá iniciar sesión.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="rounded-xl border-gray-200 mt-0 h-11 font-bold flex-1">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); deleteReceptionist(); }} className="rounded-xl bg-red-600 hover:bg-red-700 h-11 font-bold text-white flex-1">
                Eliminar definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
      </motion.div>
    </AdminLayout>
  );
}
