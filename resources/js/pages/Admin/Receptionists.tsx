import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Plus, User, Phone, Pencil, Loader2, Trash2, IdCard } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import AdminLayout from '@/components/layout/AdminLayout';

interface Receptionist {
  id: string;
  name: string;
  cedula: string;
  phone: string | null;
  email: string;
}

const emptyForm = { 
  name: '', 
  cedula: '',
  phone: '', 
  email: '', 
  password: '',
  confirmPassword: ''
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
      cedula: rec.cedula || '',
      phone: rec.phone || '', 
      email: rec.email || '', 
      password: '',
      confirmPassword: ''
    });
    setTouched({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: string[] = [];

    // Validar nombre: 4-40 chars, solo letras y espacios
    if (!form.name.trim()) {
      errors.push('El nombre es requerido');
    } else if (form.name.trim().length < 4 || form.name.trim().length > 40) {
      errors.push('El nombre debe tener entre 4 y 40 caracteres');
    } else if (!NAME_REGEX.test(form.name.trim())) {
      errors.push('El nombre solo puede contener letras y espacios');
    }

    // Validar cédula: 5M - 33M
    if (!form.cedula.trim()) {
      errors.push('La cédula es requerida');
    } else {
      const c = parseInt(form.cedula);
      if (isNaN(c) || c < 5000000 || c > 33000000) {
        errors.push('Ingrese una cédula válida entre 5,000,000 y 33,000,000');
      }
    }

    // Validar correo: max 50 chars
    if (!form.email) {
      errors.push('El correo es requerido');
    } else if (form.email.length > 50) {
      errors.push('El correo no puede exceder los 50 caracteres');
    } else if (!EMAIL_REGEX.test(form.email)) {
      errors.push('El correo electrónico no es válido');
    }

    // Validar contraseña
    if (!editTarget && !form.password) {
      errors.push('La contraseña es obligatoria');
    } else if (form.password && form.password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    if (form.password !== form.confirmPassword) {
      errors.push('Las contraseñas no coinciden');
    }

    // Validar teléfono
    if (form.phone && !VENEZUELA_PHONE_REGEX.test(form.phone)) {
      errors.push('El teléfono debe tener el formato +58 seguido de 10 dígitos');
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
      delete payload.confirmPassword;
      if (isEditing && !form.password) {
        delete payload.password;
      }

      const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(payload) });
      const data = await res.json();
      
      if (data.success) {
        toast.success(isEditing ? 'Recepcionista actualizado' : 'Recepcionista registrado');
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

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Recepcionistas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestiona el personal de recepción de la clínica</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Agregar recepcionista
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : receptionists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800 mb-4">
            <User className="h-10 w-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin personal registrado</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Agrega al primer recepcionista del equipo</p>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Agregar recepcionista
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {receptionists.map(rec => (
            <ReceptionistCard 
              key={rec.id} 
              receptionist={rec} 
              onEdit={openEdit} 
              onDelete={setConfirmDelete} 
            />
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Editar recepcionista' : 'Nuevo recepcionista'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Nombre completo *</Label>
              <Input 
                value={form.name} 
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
                  setForm(f => ({ ...f, name: val }));
                }} 
                placeholder="Ej. María Pérez" 
                maxLength={40}
                className="mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Cédula *</Label>
              <Input 
                value={form.cedula} 
                onChange={e => setForm(f => ({ ...f, cedula: e.target.value.replace(/\D/g, '').slice(0, 8) }))} 
                onBlur={() => setTouched(prev => ({ ...prev, cedula: true }))}
                placeholder="Ej. 12345678" 
                maxLength={8}
                className="mt-1" 
              />
              {touched.cedula && form.cedula && (parseInt(form.cedula) < 5000000 || parseInt(form.cedula) > 33000000) && (
                <p className="text-[10px] text-red-500 mt-1">Cédula fuera de rango (5M - 33M)</p>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Correo electrónico *</Label>
              <Input 
                type="email"
                value={form.email} 
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                placeholder="correo@clinica.com" 
                maxLength={50}
                className="mt-1" 
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Contraseña {editTarget ? '(Opcional)' : '*'}
                </Label>
                <Input 
                  type="password"
                  value={form.password} 
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                  placeholder="******" 
                  className="mt-1" 
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Repetir contraseña</Label>
                <Input 
                  type="password"
                  value={form.confirmPassword} 
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} 
                  placeholder="******" 
                  className="mt-1" 
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Teléfono</Label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-sm font-semibold text-gray-500">+58</span>
                </div>
                <Input 
                  value={form.phone.replace('+58', '')} 
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setForm(f => ({ ...f, phone: '+58' + val }));
                  }} 
                  placeholder="4241234567" 
                  maxLength={10}
                  className="pl-11" 
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editTarget ? 'Guardar cambios' : 'Crear recepcionista'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación eliminar */}
      <AlertDialog open={!!confirmDelete} onOpenChange={o => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al recepcionista del sistema. No podrá volver a iniciar sesión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteReceptionist} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

function ReceptionistCard({ 
  receptionist, 
  onEdit, 
  onDelete 
}: { 
  receptionist: Receptionist; 
  onEdit: (r: Receptionist) => void; 
  onDelete: (r: Receptionist) => void;
}) {
  const initials = receptionist.name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
  return (
    <Card className="border-gray-200 dark:border-gray-700 transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{receptionist.name}</p>
              <Badge variant="outline" className="border-sky-200 text-sky-700 text-[10px]">
                Recepción
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <IdCard className="h-3 w-3 text-gray-400" />
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{receptionist.cedula}</p>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate" title={receptionist.email}>{receptionist.email}</p>
            {receptionist.phone && (
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3" /> {receptionist.phone}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button variant="ghost" size="sm" onClick={() => onEdit(receptionist)} className="h-7 text-xs flex-1">
            <Pencil className="h-3 w-3 mr-1" /> Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(receptionist)} className="h-7 text-xs flex-1 text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="h-3 w-3 mr-1" /> Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

Receptionists.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
