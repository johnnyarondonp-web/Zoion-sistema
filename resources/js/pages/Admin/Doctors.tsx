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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Stethoscope, Phone, Power, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import AdminLayout from '@/components/layout/AdminLayout';

interface Service { id: string; name: string; }
interface Doctor {
  id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  photo: string | null;
  isActive: boolean;
  appointmentsCount: number;
  services: Service[];
}

const emptyForm = { name: '', specialty: '', phone: '', email: '', isActive: true, serviceIds: [] as string[] };
const getCsrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
const headers = (extra = {}) => ({ 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrf(), ...extra });

const SPECIALTIES = [
  'Medicina General Veterinaria',
  'Cirugía Veterinaria',
  'Dermatología Veterinaria',
  'Odontología Veterinaria',
  'Cardiología Veterinaria',
  'Oftalmología Veterinaria',
];

const DOCTOR_NAME_REGEX = /^(Dr\.|Dra\.)?\s?[A-Za-záéíóúÁÉÍÓÚüÜñÑ]+(\s[A-Za-záéíóúÁÉÍÓÚüÜñÑ]+){1,3}$/;
const VENEZUELA_PHONE_REGEX = /^\+58\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Doctor | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [confirmDeactivate, setConfirmDeactivate] = useState<Doctor | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/doctors').then(r => r.json()),
      fetch('/api/services?all=true').then(r => r.json()),
    ]).then(([d, s]) => {
      if (d.success) setDoctors(d.data);
      if (s.success) setServices(s.data);
    }).finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (doc: Doctor) => {
    setEditTarget(doc);
    setForm({ name: doc.name, specialty: doc.specialty || '', phone: doc.phone || '', email: doc.email || '', isActive: doc.isActive, serviceIds: doc.services.map(s => s.id) });
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: string[] = [];

    if (!form.name.trim()) {
      errors.push('El nombre es requerido');
    } else if (form.name.trim().length > 60) {
      errors.push('El nombre no puede superar 60 caracteres');
    } else if (!DOCTOR_NAME_REGEX.test(form.name.trim())) {
      errors.push('El nombre debe contener al menos nombre y apellido (solo letras)');
    }

    if (form.phone && !VENEZUELA_PHONE_REGEX.test(form.phone)) {
      errors.push('El teléfono debe tener el formato +58 seguido de 10 dígitos');
    }

    if (form.email && !EMAIL_REGEX.test(form.email)) {
      errors.push('El correo electrónico no es válido');
    }

    if (errors.length > 0) {
      errors.forEach(e => toast.error(e));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const url = editTarget ? `/api/admin/doctors/${editTarget.id}` : '/api/admin/doctors';
      const method = editTarget ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) {
        toast.success(editTarget ? 'Médico actualizado' : 'Médico creado');
        setDoctors(prev => editTarget
          ? prev.map(d => d.id === editTarget.id ? { ...d, ...data.data } : d)
          : [...prev, data.data]
        );
        setModalOpen(false);
      } else {
        toast.error(data.error || 'Error al guardar');
      }
    } catch { toast.error('Error de conexión'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (doc: Doctor) => {
    if (!doc.isActive) {
      // Reactivar directamente sin confirmación
      const res = await fetch(`/api/admin/doctors/${doc.id}/toggle`, { method: 'PATCH', headers: headers() });
      const data = await res.json();
      if (data.success) {
        setDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, ...data.data } : d));
        toast.success('Médico reactivado');
      }
    } else {
      setConfirmDeactivate(doc);
    }
  };

  const confirmToggle = async () => {
    if (!confirmDeactivate) return;
    const res = await fetch(`/api/admin/doctors/${confirmDeactivate.id}/toggle`, { method: 'PATCH', headers: headers() });
    const data = await res.json();
    if (data.success) {
      setDoctors(prev => prev.map(d => d.id === confirmDeactivate.id ? { ...d, ...data.data } : d));
      toast.success('Médico desactivado');
    } else {
      toast.error(data.error || 'No se pudo desactivar');
    }
    setConfirmDeactivate(null);
  };

  const toggleService = (id: string) => {
    setForm(f => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter(s => s !== id) : [...f.serviceIds, id],
    }));
  };

  const activeDoctors   = doctors.filter(d => d.isActive);
  const inactiveDoctors = doctors.filter(d => !d.isActive);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Equipo médico</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestiona los médicos y sus servicios asignados</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Agregar médico
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : doctors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800 mb-4">
            <Stethoscope className="h-10 w-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin médicos registrados</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Agrega el primer miembro del equipo</p>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Agregar médico
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeDoctors.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Activos ({activeDoctors.length})</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeDoctors.map(doc => <DoctorCard key={doc.id} doctor={doc} onEdit={openEdit} onToggle={handleToggle} />)}
              </div>
            </div>
          )}
          {inactiveDoctors.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Inactivos ({inactiveDoctors.length})</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inactiveDoctors.map(doc => <DoctorCard key={doc.id} doctor={doc} onEdit={openEdit} onToggle={handleToggle} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal crear/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Editar médico' : 'Nuevo médico'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Nombre *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. García" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Especialidad</Label>
              <Select value={form.specialty} onValueChange={(v) => setForm(f => ({ ...f, specialty: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar especialidad..." />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Teléfono</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+584241234567" maxLength={13} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Correo electrónico</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="doctor@clinica.com" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-2">Servicios que atiende</Label>
              {services.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No hay servicios registrados</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {services.map(s => {
                    const selected = form.serviceIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleService(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editTarget ? 'Guardar cambios' : 'Crear médico'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación desactivar */}
      <AlertDialog open={!!confirmDeactivate} onOpenChange={o => { if (!o) setConfirmDeactivate(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar a {confirmDeactivate?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              El médico no aparecerá en la asignación automática de nuevas citas. Las citas existentes no se modifican.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle} className="bg-red-600 hover:bg-red-700 text-white">
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

function DoctorCard({ doctor, onEdit, onToggle }: { doctor: Doctor; onEdit: (d: Doctor) => void; onToggle: (d: Doctor) => void }) {
  const initials = doctor.name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
  return (
    <Card className={`border-gray-200 dark:border-gray-700 transition-opacity ${!doctor.isActive ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-sm flex-shrink-0">
            {doctor.photo ? <img src={doctor.photo} alt={doctor.name} className="h-full w-full object-cover rounded-xl" /> : initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{doctor.name}</p>
              <Badge variant="outline" className={doctor.isActive ? 'border-emerald-200 text-emerald-700 text-[10px]' : 'border-gray-200 text-gray-400 text-[10px]'}>
                {doctor.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            {doctor.specialty && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{doctor.specialty}</p>}
            {doctor.phone && (
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3" /> {doctor.phone}
              </p>
            )}
            {doctor.email && (
              <p className="text-xs text-gray-400 mt-0.5">{doctor.email}</p>
            )}
          </div>
        </div>

        {doctor.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {doctor.services.map(s => (
              <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                {s.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button variant="ghost" size="sm" onClick={() => onEdit(doctor)} className="h-7 text-xs flex-1">
            <Pencil className="h-3 w-3 mr-1" /> Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onToggle(doctor)} className={`h-7 text-xs flex-1 ${doctor.isActive ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'}`}>
            <Power className="h-3 w-3 mr-1" /> {doctor.isActive ? 'Desactivar' : 'Reactivar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

Doctors.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
