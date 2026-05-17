import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, UserPlus, Clock, Loader2, CheckCircle2, Stethoscope, DoorOpen } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import AdminLayout from '@/components/layout/AdminLayout';

interface Service { id: string; name: string; price: number; durationMinutes: number; }
interface WalkInRecord {
  id: string; date: string; startTime: string; endTime: string; status: string;
  paymentStatus: string; paymentAmount: number | null;
  client: { ownerName: string; phone: string | null; petName: string; petSpecies: string } | null;
  service: { name: string; price: number } | null;
  doctor: { name: string } | null;
}

const getCsrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
const h = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrf() };

function formatDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(t: string) {
  const [hr, mn] = t.split(':').map(Number);
  const p = hr >= 12 ? 'PM' : 'AM';
  return `${hr > 12 ? hr - 12 : hr || 12}:${String(mn).padStart(2, '0')} ${p}`;
}

const NAME_REGEX = /^[A-Za-záéíóúÁÉÍÓÚüÜñÑ]+( [A-Za-záéíóúÁÉÍÓÚüÜñÑ]+)?$/;
const MIX_REGEX = /^[A-Za-záéíóúÁÉÍÓÚüÜñÑ\s-()/.*]*$/;

const speciesOptions = [
  { value: 'perro',  label: 'Perro'  },
  { value: 'gato',   label: 'Gato'   },
  { value: 'conejo', label: 'Conejo' },
  { value: 'ave',    label: 'Ave'    },
  { value: 'reptil', label: 'Reptil' },
];

const BREED_OPTIONS: Record<string, string[]> = {
  perro: ['Mestizo','Akita','American Staffordshire','Basenji','Beagle','Bichón Frisé','Border Collie','Boxer','Bulldog Francés','Chihuahua','Chow Chow','Cocker Spaniel','Dachshund','Dálmata','Doberman','Golden Retriever','Gran Danés','Husky Siberiano','Labrador Retriever','Malamute de Alaska','Maltés','Pastor Alemán','Pit Bull','Pointer','Pomerania','Poodle Estándar','Poodle Miniatura','Poodle Toy','Rottweiler','Samoyedo','San Bernardo','Schnauzer Estándar','Schnauzer Miniatura','Setter Irlandés','Shar Pei','Shiba Inu','Shih Tzu','Vizsla','Weimaraner','Yorkshire Terrier'],
  gato: ['Mestizo','Abisinio','Angora Turco','Azul Ruso','Bengalí','Birmano','British Shorthair','Cornish Rex','Devon Rex','Maine Coon','Manx','Noruego del Bosque','Persa','Ragdoll','Scottish Fold','Siberiano','Siamés','Somalí','Sphynx','Tonkinés'],
  conejo: ['Mestizo','American Fuzzy Lop','Angora Inglés','Californiano','Dutch','Flemish Giant','Himalayo','Holland Lop','Lionhead','Mini Lop','Mini Rex','Nueva Zelanda','Plateado','Rex','Tan'],
  ave: ['Agapornis (Inseparable)','Cacatúa','Canario','Cotorra','Diamante de Gould','Eclectus','Guacamayo','Jilguero','Loro Africano (Gris del Congo)','Loro Amazónico','Loro Yaco','Ninfa (Cockatiel)','Paloma','Perico Australiano','Periquito'],
  reptil: ['Anolis','Boa Constrictor','Camaleón','Dragón Barbudo','Gecko de Cola de Rábano','Gecko Leopardo','Iguana Verde','Monitor de Savannah','Pitón Ball','Pitón Reticulada','Serpiente del Maíz','Skink de Lengua Azul','Tortuga Acuática','Tortuga de Tierra','Tortuga Sulcata'],
};

const WEIGHT_LIMITS: Record<string, { min: number; max: number }> = {
  perro:  { min: 0.5,  max: 120 },
  gato:   { min: 0.5,  max: 12  },
  conejo: { min: 0.3,  max: 8   },
  ave:    { min: 0.01, max: 2   },
  reptil: { min: 0.05, max: 150 },
};

const SPECIES_AGE_LIMITS: Record<string, { minYears: number; maxYears: number }> = {
  perro:  { minYears: 0, maxYears: 20  },
  gato:   { minYears: 0, maxYears: 25  },
  conejo: { minYears: 0, maxYears: 12  },
  ave:    { minYears: 0, maxYears: 80  },
  reptil: { minYears: 0, maxYears: 50  },
};

function getDateLimits(species: string): { min: string; max: string } {
  const today = new Date();
  const max = today.toISOString().split('T')[0];
  const limits = SPECIES_AGE_LIMITS[species];
  const maxYears = limits ? limits.maxYears : 30;
  const minDate = new Date(today);
  minDate.setFullYear(minDate.getFullYear() - maxYears);
  const min = minDate.toISOString().split('T')[0];
  return { min, max };
}

function getCurrentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function WalkIn() {
  const [services, setServices] = useState<Service[]>([]);
  const [history, setHistory] = useState<WalkInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);

  // Step 1 — client data
  const [phone, setPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [petBirthDate, setPetBirthDate] = useState('');
  const [petWeight, setPetWeight] = useState('');
  const [petMixBreed, setPetMixBreed] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [clientFound, setClientFound] = useState<boolean | null>(null);

  // Step 2 — service + time
  const [serviceId, setServiceId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [done, setDone] = useState<WalkInRecord | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/services?all=true').then(r => r.json()),
      fetch('/api/admin/walk-in').then(r => r.json()),
    ]).then(([s, wi]) => {
      if (s.success) setServices(s.data);
      if (wi.success) setHistory(wi.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleSearch = useCallback(async () => {
    if (phone.length < 4) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/walk-in/search?phone=${encodeURIComponent(phone)}`, { headers: h as HeadersInit });
      const data = await res.json();
      if (data.success && data.data) {
        setOwnerName(data.data.ownerName || '');
        setEmail(data.data.email || '');
        setPetName(data.data.petName || '');
        setPetSpecies(data.data.petSpecies || '');
        setPetBreed(data.data.petBreed || '');
        setClientFound(true);
        toast.success('Cliente encontrado — datos pre-completados');
      } else {
        setClientFound(false);
      }
    } catch { toast.error('Error al buscar'); }
    finally { setSearching(false); }
  }, [phone]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!petName.trim()) {
      errors.petName = 'El nombre de la mascota es requerido';
    } else if (!NAME_REGEX.test(petName.trim())) {
      errors.petName = 'Solo letras y un espacio entre palabras (máx. 25 caracteres)';
    }

    if (phone && !/^\+58\d{10}$/.test(phone)) {
      errors.phone = 'El teléfono debe iniciar con +58 seguido de 10 dígitos';
    }

    if (!petSpecies) {
      errors.petSpecies = 'La especie es obligatoria';
    }

    if (petBirthDate && petSpecies) {
      const { min, max } = getDateLimits(petSpecies);
      if (petBirthDate < min || petBirthDate > max) {
        errors.petBirthDate = 'La fecha no es válida para esta especie';
      }
    }

    if (petWeight && petSpecies) {
      const w = parseFloat(petWeight);
      const limits = WEIGHT_LIMITS[petSpecies];
      if (isNaN(w) || w < limits.min || w > limits.max) {
        errors.petWeight = `El peso debe estar entre ${limits.min} y ${limits.max} kg`;
      }
    }

    const now = getCurrentTimeString();
    if (!startTime) {
      errors.startTime = 'La hora de inicio es requerida';
    } else if (startTime < now) {
      errors.startTime = 'La hora de inicio no puede ser anterior a la hora actual';
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error('Corrige los errores antes de continuar');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!ownerName || !petName || !petSpecies || !serviceId || !startTime) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/walk-in', {
        method: 'POST',
        headers: h as HeadersInit,
        body: JSON.stringify({
          ownerName, phone, email,
          petName,
          petSpecies,
          petBreed: petBreed === 'Mestizo' && petMixBreed.trim()
            ? `Mestizo (${petMixBreed.trim()})`
            : petBreed,
          petBirthDate: petBirthDate || null,
          petWeight: petWeight ? parseFloat(petWeight) : null,
          serviceId,
          startTime,
          paymentMethod
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Atención registrada');
        setDone(data.data);
        setHistory(prev => [data.data, ...prev]);
        // Reset form
        setPhone(''); setOwnerName(''); setEmail(''); setPetName(''); setPetSpecies(''); setPetBreed('');
        setPetBirthDate(''); setPetWeight(''); setPetMixBreed(''); setFormErrors({});
        setServiceId(''); setStartTime(''); setClientFound(null);
      } else {
        toast.error(data.error || 'Error al registrar');
      }
    } catch { toast.error('Error de conexión'); }
    finally { setSubmitting(false); }
  };

  const selectedService = services.find(s => s.id === serviceId);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <DoorOpen className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Atención presencial
          </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Registra una atención walk-in para hoy</p>
      </div>

      {done && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Atención registrada</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              {done.client?.petName} · {done.service?.name} · {formatTime(done.startTime)}
              {done.doctor ? ` · ${done.doctor.name}` : ''}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDone(null)} className="ml-auto text-emerald-600 hover:text-emerald-800">Nuevo</Button>
        </motion.div>
      )}

      <Card className="border-gray-200 dark:border-gray-700">
        <CardContent className="p-6 space-y-6">
          {/* Paso 1 — Datos del cliente */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">1. Datos del cliente</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs text-gray-600 dark:text-gray-400">Teléfono</Label>
                <Input
                  value={phone}
                  onChange={e => {
                    // Solo permitir dígitos y el signo + al inicio
                    let val = e.target.value.replace(/[^\d+]/g, '');
                    // Bloquear a máximo 13 caracteres (+58 + 10 dígitos)
                    if (val.length > 13) val = val.slice(0, 13);
                    setPhone(val);
                    setClientFound(null);
                  }}
                  onKeyDown={e => {
                    // Bloquear letras y caracteres especiales excepto + (solo al inicio)
                    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', '+'];
                    if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                      e.preventDefault();
                    }
                    // El + solo es válido si el campo está vacío
                    if (e.key === '+' && phone.length > 0) e.preventDefault();
                    if (e.key === 'Enter') handleSearch();
                  }}
                  placeholder="+58 seguido de 10 dígitos"
                  maxLength={13}
                  className="mt-1"
                />
                {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
              </div>
              <Button
                variant="outline"
                onClick={handleSearch}
                disabled={searching || phone.length < 4}
                className="mt-6 flex-shrink-0"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {clientFound === false && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Cliente nuevo — completa los datos manualmente</p>
            )}
            {clientFound === true && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Cliente encontrado</p>
            )}

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400">Nombre del dueño *</Label>
                <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400">Email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} type="email" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400">Nombre de la mascota *</Label>
                <Input
                  value={petName}
                  onChange={e => {
                    const val = e.target.value.replace(/[^A-Za-záéíóúÁÉÍÓÚüÜñÑ ]/g, '').slice(0, 25);
                    setPetName(val.charAt(0).toUpperCase() + val.slice(1));
                  }}
                  placeholder="Firulais"
                  className="mt-1"
                />
                {formErrors.petName && <p className="text-xs text-red-500 mt-1">{formErrors.petName}</p>}
              </div>
              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400">Especie *</Label>
                <Select value={petSpecies} onValueChange={(v) => { setPetSpecies(v); setPetBreed(''); setPetMixBreed(''); }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar especie..." />
                  </SelectTrigger>
                  <SelectContent>
                    {speciesOptions.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.petSpecies && <p className="text-xs text-red-500 mt-1">{formErrors.petSpecies}</p>}
              </div>
              <div className="col-span-1">
                <Label className="text-xs text-gray-600 dark:text-gray-400">Raza</Label>
                <Select
                  value={petBreed}
                  onValueChange={setPetBreed}
                  disabled={!petSpecies}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={petSpecies ? 'Seleccionar raza...' : 'Primero elige la especie'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(BREED_OPTIONS[petSpecies] || []).map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Label className="text-xs text-gray-600 dark:text-gray-400">Fecha de nacimiento (opcional)</Label>
                <Input
                  type="date"
                  value={petBirthDate}
                  min={petSpecies ? getDateLimits(petSpecies).min : undefined}
                  max={petSpecies ? getDateLimits(petSpecies).max : undefined}
                  onChange={e => {
                    const val = e.target.value;
                    setPetBirthDate(val);
                    // Validar en tiempo real si ya hay especie seleccionada
                    if (val && petSpecies) {
                      const { min, max } = getDateLimits(petSpecies);
                      if (val < min || val > max) {
                        setFormErrors(prev => ({ ...prev, petBirthDate: 'La fecha no es válida para esta especie' }));
                      } else {
                        setFormErrors(prev => { const next = { ...prev }; delete next.petBirthDate; return next; });
                      }
                    } else {
                      setFormErrors(prev => { const next = { ...prev }; delete next.petBirthDate; return next; });
                    }
                  }}
                  disabled={!petSpecies}
                  className="mt-1"
                />
                {formErrors.petBirthDate && <p className="text-xs text-red-500 mt-1">{formErrors.petBirthDate}</p>}
              </div>
              <div className="col-span-2">
                {petBreed === 'Mestizo' && (petSpecies === 'perro' || petSpecies === 'gato' || petSpecies === 'conejo') && (
                  <Input
                    value={petMixBreed}
                    onChange={e => {
                      if (MIX_REGEX.test(e.target.value)) setPetMixBreed(e.target.value);
                    }}
                    placeholder="Mezcla (opcional): ej. Labrador con Poodle"
                    className="mt-2 text-sm"
                    maxLength={50}
                  />
                )}
              </div>
              {petSpecies && (
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Peso (kg) — rango: {WEIGHT_LIMITS[petSpecies]?.min} – {WEIGHT_LIMITS[petSpecies]?.max} kg
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={petSpecies ? WEIGHT_LIMITS[petSpecies]?.min : 0.01}
                    max={petSpecies ? WEIGHT_LIMITS[petSpecies]?.max : 999}
                    value={petWeight}
                    onChange={e => {
                      let val = e.target.value;
                      if (val !== '' && petSpecies && WEIGHT_LIMITS[petSpecies]) {
                        const num = parseFloat(val);
                        const { min, max } = WEIGHT_LIMITS[petSpecies];
                        if (!isNaN(num)) {
                          if (num > max) val = String(max);
                          // No clampear al mínimo mientras escribe
                        }
                      }
                      setPetWeight(val);
                    }}
                    onBlur={e => {
                      // Al salir del campo, clampear también al mínimo
                      if (petWeight !== '' && petSpecies && WEIGHT_LIMITS[petSpecies]) {
                        const num = parseFloat(petWeight);
                        const { min, max } = WEIGHT_LIMITS[petSpecies];
                        if (!isNaN(num)) {
                          if (num < min) setPetWeight(String(min));
                          if (num > max) setPetWeight(String(max));
                        }
                      }
                    }}
                    placeholder={petSpecies && WEIGHT_LIMITS[petSpecies] ? `${WEIGHT_LIMITS[petSpecies].min}–${WEIGHT_LIMITS[petSpecies].max} kg` : 'Peso en kg'}
                    className="mt-1"
                  />
                  {formErrors.petWeight && <p className="text-xs text-red-500 mt-1">{formErrors.petWeight}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Paso 2 — Servicio y hora */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">2. Servicio y horario</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs text-gray-600 dark:text-gray-400">Servicio *</Label>
                {loading ? <Skeleton className="h-9 mt-1" /> : (
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar servicio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} — ${Number(s.price).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400">Hora de inicio *</Label>
                <Input
                  type="time"
                  value={startTime}
                  min={getCurrentTimeString()}
                  onChange={e => {
                    const selected = e.target.value;
                    const now = getCurrentTimeString();
                    if (selected < now) {
                      toast.error('No puedes seleccionar una hora que ya pasó');
                      return;
                    }
                    setStartTime(selected);
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400">Método de pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="pago_movil">Pago Móvil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedService && (
              <div className="flex items-center justify-between mt-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Duración</span>
                <span className="font-medium">{selectedService.durationMinutes} min</span>
                <span className="text-gray-400 mx-2">·</span>
                <span className="text-gray-500 dark:text-gray-400">Precio</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">${Number(selectedService.price).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Registrar atención
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historial del día */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Registros recientes</p>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Clock className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Sin atenciones presenciales registradas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(rec => (
              <div key={rec.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex-shrink-0">
                  <Stethoscope className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {rec.client?.petName} · {rec.service?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {rec.client?.ownerName} · {formatDate(rec.date)} {formatTime(rec.startTime)}
                    {rec.doctor ? ` · ${rec.doctor.name}` : ''}
                  </p>
                </div>
                <Badge variant="outline" className={rec.paymentStatus === 'paid' ? 'border-emerald-200 text-emerald-700 text-[10px]' : 'border-amber-200 text-amber-700 text-[10px]'}>
                  {rec.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

WalkIn.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
