import { useEffect, useState, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  DollarSign,
  Dog,
  Cat,
  Bird,
  Fish,
  Rabbit,
  Bug,
  HelpCircle,
  PawPrint,
  Plus,
  Loader2,
  CalendarDays,
  Stethoscope,
  Sparkles,
  Syringe,
  Scissors,
  ShieldCheck,
  Activity,
  ScanLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ClientLayout from '@/components/layout/ClientLayout';
import { formatDuration } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  photo: string | null;
  isActive: boolean;
}

interface TimeSlot {
  time: string;
  label: string;
}

interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
}

// ─── Constants & Helpers ─────────────────────────────────────────────────────
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

const speciesEmojis: Record<string, string> = {
  perro: '🐕',
  gato: '🐈',
  ave: '🐦',
  reptil: '🦎',
  conejo: '🐰',
  hámster: '🐹',
  pez: '🐠',
  otro: '🐾',
};

const speciesColors: Record<string, string> = {
  perro: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  gato: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  ave: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  reptil: 'bg-lime-50 text-lime-600 dark:bg-lime-900/30 dark:text-lime-400',
  conejo: 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  hámster: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  pez: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  otro: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const serviceIconsByName: Record<string, React.ReactNode> = {
  consulta: <Stethoscope className="h-5 w-5" />,
  vacuna: <Syringe className="h-5 w-5" />,
  estética: <Scissors className="h-5 w-5" />,
  desparasitación: <ShieldCheck className="h-5 w-5" />,
  radiografía: <ScanLine className="h-5 w-5" />,
  cirugía: <Activity className="h-5 w-5" />,
};

function getServiceIcon(name: string): React.ReactNode {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(serviceIconsByName)) {
    if (lower.includes(key)) return icon;
  }
  return <Stethoscope className="h-5 w-5" />;
}

function formatPrice(price: number): string {
  return `$${Number(price).toFixed(2)}`;
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

// ─── Step Indicator ──────────────────────────────────────────────────────────
const steps = [
  { num: 1, label: 'Servicio', icon: Stethoscope },
  { num: 2, label: 'Mascota', icon: PawPrint },
  { num: 3, label: 'Fecha', icon: CalendarDays },
  { num: 4, label: 'Horario', icon: Clock },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="relative flex items-center justify-center gap-0 py-2">
      <div className="absolute top-[22px] left-1/2 -translate-x-1/2 w-[calc(100%-6rem)] sm:w-[calc(100%-10rem)] h-0.5 bg-gray-200 dark:bg-gray-700" />
      <div
        className="absolute top-[22px] left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
        style={{ width: `${Math.max(0, ((currentStep - 1) / (steps.length - 1)) * 100)}%`, maxWidth: 'calc(100% - 6rem)' }}
      />
      {steps.map((step, i) => {
        const isActive = step.num === currentStep;
        const isCompleted = step.num < currentStep;
        const StepIcon = step.icon;

        return (
          <div key={step.num} className="flex items-center relative z-10">
            <div className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 border-2 ${
                  isCompleted
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/30'
                    : isActive
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200/60 dark:shadow-emerald-900/40 ring-4 ring-emerald-100 dark:ring-emerald-900/30'
                    : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-600'
                }`}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : <StepIcon className="h-4.5 w-4.5" />}
              </motion.div>
              <span
                className={`mt-2 text-xs font-semibold transition-colors ${
                  isActive ? 'text-emerald-700 dark:text-emerald-400' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Slide Transition Variants ───────────────────────────────────────────────
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
  }),
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function BookingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  const [services, setServices] = useState<Service[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [unavailableDays, setUnavailableDays] = useState<number[]>([]);

  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingPets, setLoadingPets] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<{
    service: string;
    pet: string;
    date: string;
    time: string;
  } | null>(null);

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedPet = pets.find((p) => p.id === selectedPetId);

  // Fetch services on mount
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch('/api/services', {
          headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
        });
        const data = await res.json();
        if (data.success) setServices(data.data);
      } catch { /* silent */ } finally { setLoadingServices(false); }
    };
    fetchServices();
  }, []);

  // Fetch pets when step 2
  useEffect(() => {
    if (currentStep === 2 && pets.length === 0) {
      setLoadingPets(true);
      const fetchPets = async () => {
        try {
          const res = await fetch('/api/pets', {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
          });
          const data = await res.json();
          if (data.success) setPets(data.data.filter((p: Pet) => p.isActive));
        } catch { /* silent */ } finally { setLoadingPets(false); }
      };
      fetchPets();
    }
  }, [currentStep, pets.length]);

  // Fetch blocked dates and unavailable weekdays when reaching the date step.
  // Both are needed before the calendar renders — run in parallel.
  useEffect(() => {
    if (currentStep === 3 && blockedDates.length === 0) {
      const headers = { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() };

      const fetchBlocked = fetch('/api/blocked-dates', { headers })
        .then(r => r.json())
        .then(data => { if (data.success) setBlockedDates(data.data); })
        .catch(() => {});

      const fetchSchedule = fetch('/api/availability/schedule', { headers })
        .then(r => r.json())
        .then(data => { if (data.success) setUnavailableDays(data.data.unavailableDays); })
        .catch(() => {});

      Promise.all([fetchBlocked, fetchSchedule]);
    }
  }, [currentStep, blockedDates.length]);

  // Fetch time slots when date is selected
  const fetchTimeSlots = useCallback(async (date: Date): Promise<boolean> => {
    if (!selectedServiceId) return false;
    setLoadingSlots(true);
    setTimeSlots([]);
    setSelectedTime('');
    try {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const res = await fetch(`/api/availability?date=${dateStr}&serviceId=${selectedServiceId}`, {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success && data.data.available && data.data.slots && data.data.slots.length > 0) {
        setTimeSlots(data.data.slots);
        return true;
      } else {
        setTimeSlots([]);
        return false;
      }
    } catch {
      setTimeSlots([]);
      return false;
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedServiceId]);

  const handleDateSelect = async (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      if (isDateBlocked(date)) {
        // no avanzar, el calendario ya la deshabilitó pero por si acaso
        return;
      }
      toast.loading("Buscando horarios...", { id: "fetching-slots" });
      const hasSlots = await fetchTimeSlots(date);
      toast.dismiss("fetching-slots");
      
      if (!hasSlots) {
        toast.error("No hay horarios disponibles para esta fecha.");
        setSelectedDate(undefined);
        return;
      }
      
      setCurrentStep(4);
      setDirection(1);
    }
  };

  const isDateBlocked = (date: Date): boolean => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return blockedDates.some((bd) => bd.date === dateStr);
  };

  const isDatePast = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedServiceId || !selectedPetId || !selectedDate || !selectedTime) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrfToken() },
        body: JSON.stringify({
          petId: selectedPetId,
          serviceId: selectedServiceId,
          date: dateStr,
          startTime: selectedTime,
          notes: notes.trim() || null,
          paymentMethod: selectedPaymentMethod || null,
        }),
      });

      if (!res.ok) {
        if (res.status === 409) {
          toast.error('Este horario ya fue reservado o coincide con otra cita.');
        } else if (res.status === 400) {
          const errData = await res.json().catch(() => null);
          toast.error(errData?.error || 'Error al procesar la cita.');
        } else {
          toast.error('Error del servidor al agendar la cita.');
        }
        return;
      }

      const data = await res.json();
      if (res.status === 201 && data.success) {
        toast.success('¡Cita agendada exitosamente!');
        setConfirmedAppointment({
          service: selectedService?.name || '',
          pet: selectedPet?.name || '',
          date: formatDateLong(selectedDate),
          time: selectedTime,
        });
        setConfirmDialogOpen(true);
      } else {
        toast.error(data.error || 'Error al agendar la cita');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogClose = () => {
    setConfirmDialogOpen(false);
    router.visit('/client/appointments');
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return !!selectedServiceId;
      case 2: return !!selectedPetId;
      case 3: return !!selectedDate;
      case 4: return !!selectedTime;
      default: return false;
    }
  };

  const stepTitles: Record<number, { title: string; subtitle: string; emoji: string }> = {
    1: { title: 'Selecciona un Servicio', subtitle: 'Elige el servicio que necesitas para tu mascota', emoji: '🩺' },
    2: { title: 'Selecciona tu Mascota', subtitle: '¿Para qué mascota es la cita?', emoji: '🐾' },
    3: { title: 'Selecciona la Fecha', subtitle: 'Elige el día de tu preferencia', emoji: '📅' },
    4: { title: 'Selecciona el Horario', subtitle: 'Elige la hora que mejor te convenga', emoji: '🕐' },
  };

  // ─── Render Steps ───────────────────────────────────────────────────────────
  const renderStep1 = () => {
    if (loadingServices) {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    if (services.length === 0) {
      return (
        <div className="flex flex-col items-center py-12 text-center">
          <Stethoscope className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No hay servicios disponibles</p>
        </div>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {services.map((service) => {
          const isSelected = selectedServiceId === service.id;
          return (
            <motion.div
              key={service.id}
              whileHover={{ y: -2, boxShadow: '0 8px 25px -5px rgba(0,0,0,0.1)' }}
              transition={{ duration: 0.15 }}
            >
              <Card
                className={`cursor-pointer transition-all duration-200 overflow-hidden h-full ${
                  isSelected
                    ? 'border-emerald-400 ring-2 ring-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-600 dark:ring-emerald-800 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-700'
                }`}
                onClick={() => setSelectedServiceId(service.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
                        isSelected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {getServiceIcon(service.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-semibold ${isSelected ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-900 dark:text-gray-100'}`}>
                        {service.name}
                      </h3>
                      {service.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{service.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          {formatDuration(service.durationMinutes)}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          <DollarSign className="h-3 w-3" />
                          {formatPrice(service.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderStep2 = () => {
    if (loadingPets) {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    if (pets.length === 0) {
      return (
        <div className="flex flex-col items-center py-12 text-center">
          <PawPrint className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">No tienes mascotas activas</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Registra una mascota para poder agendar una cita</p>
          <Button
            onClick={() => router.visit('/client/pets/new')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Registrar Mascota
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {pets.map((pet) => {
          const isSelected = selectedPetId === pet.id;
          const sp = pet.species.toLowerCase();
          const icon = speciesIcons[sp] || speciesIcons.otro;
          const color = speciesColors[sp] || speciesColors.otro;
          const emoji = speciesEmojis[sp] || '🐾';

          return (
            <motion.div
              key={pet.id}
              whileHover={{ y: -2, boxShadow: '0 8px 25px -5px rgba(0,0,0,0.1)' }}
              transition={{ duration: 0.15 }}
            >
              <Card
                className={`cursor-pointer transition-all duration-200 overflow-hidden h-full ${
                  isSelected
                    ? 'border-emerald-400 ring-2 ring-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-600 dark:ring-emerald-800 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-700'
                }`}
                onClick={() => setSelectedPetId(pet.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {pet.photo ? (
                      <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-gray-100 dark:ring-gray-700">
                        <img src={pet.photo} alt={pet.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 ${color}`}>
                        {icon}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-semibold ${isSelected ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-900 dark:text-gray-100'}`}>
                        {emoji} {pet.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderStep3 = () => {
    return (
      <div className="flex flex-col items-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={(date) =>
            isDatePast(date) ||
            isDateBlocked(date) ||
            unavailableDays.includes(date.getDay())
          }
          className="rounded-lg border shadow-sm dark:border-gray-700"
          modifiers={{
            blocked: (date) => isDateBlocked(date),
            unavailable: (date) => unavailableDays.includes(date.getDay()),
          }}
          modifiersClassNames={{
            blocked: 'text-red-400 line-through opacity-60 cursor-not-allowed',
            unavailable: 'text-gray-300 opacity-40 cursor-not-allowed',
          }}
        />
        <div className="flex items-center justify-center gap-5 mt-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 inline-block" />
            Fecha pasada
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full bg-red-300 dark:bg-red-700 inline-block" />
            No disponible
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 inline-block" />
            Día no laborable
          </span>
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    return (
      <div className="space-y-5">
        {selectedDate && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg">
            <CalendarDays className="h-4 w-4" />
            {formatDateLong(selectedDate)}
          </div>
        )}

        {loadingSlots ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="ml-3 text-gray-500 dark:text-gray-400">Buscando horarios disponibles...</span>
          </div>
        ) : timeSlots.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Clock className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {selectedDate && isDateBlocked(selectedDate)
                ? 'Esta fecha no está disponible. Selecciona otro día.'
                : 'No hay horarios disponibles para este día.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setCurrentStep(3); setDirection(-1); }}
              className="mt-3 border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
            >
              Elegir otra fecha
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {timeSlots.map((slot) => {
              const isSelected = selectedTime === slot.time;
              const hour = parseInt(slot.time.split(':')[0]);
              const period = hour < 12 ? 'AM' : 'PM';

              return (
                <motion.button
                  key={slot.time}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedTime(slot.time)}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2.5 text-sm transition-all duration-150 ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-600 shadow-sm ring-1 ring-emerald-200 dark:ring-emerald-800'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-200 hover:bg-emerald-50/50 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20'
                  }`}
                >
                  <span className="font-medium">{slot.label.replace(/ (AM|PM)$/, '')}</span>
                  <span className={`text-[10px] font-semibold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {period}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}

        {timeSlots.length > 0 && (
          <div className="space-y-2 pt-2">
            <Label htmlFor="booking-notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Notas adicionales (opcional)
            </Label>
            <Textarea
              id="booking-notes"
              placeholder="Instrucciones especiales para la cita..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        )}

        {selectedService && selectedPet && selectedDate && selectedTime && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' as const }}
          >
            <Card className="border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 shadow-lg shadow-emerald-100/30 dark:shadow-emerald-900/10">
              <CardContent className="p-5">
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> Resumen de la Cita
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5" /> Servicio
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <PawPrint className="h-3.5 w-3.5" /> Mascota
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {speciesEmojis[selectedPet.species.toLowerCase()] || '🐾'} {selectedPet.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> Fecha
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{formatDateLong(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Horario
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {timeSlots.find((s) => s.time === selectedTime)?.label || selectedTime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Duración</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{formatDuration(selectedService.durationMinutes)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-emerald-200 dark:border-emerald-800/50">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Total</span>
                    <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      {formatPrice(selectedService.price)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {selectedTime && (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              ¿Cómo prefieres pagar?
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              El pago se realiza en la clínica al momento de la consulta.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'cash',     label: 'Efectivo' },
                { value: 'transfer', label: 'Transferencia' },
                { value: 'card',     label: 'Tarjeta' },
                { value: 'pago_movil',    label: 'Pago Móvil' },
              ].map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setSelectedPaymentMethod(prev => prev === m.value ? '' : m.value)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    selectedPaymentMethod === m.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => currentStep > 1 ? handleBack() : router.visit('/client/appointments')}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            ✨ Agendar Cita
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Completa los pasos para reservar tu cita</p>
        </div>
      </div>

      {/* Step Indicator */}
      <Card className="border-gray-200 dark:border-gray-700 bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
        <CardContent className="p-4">
          <StepIndicator currentStep={currentStep} />
        </CardContent>
      </Card>

      {/* Step Content */}
      <motion.div
        animate={{
          boxShadow: currentStep === 1
            ? '0 4px 20px -5px rgba(16,185,129,0.1)'
            : currentStep === 2
            ? '0 4px 20px -5px rgba(139,92,246,0.1)'
            : currentStep === 3
            ? '0 4px 20px -5px rgba(14,165,233,0.1)'
            : '0 4px 20px -5px rgba(245,158,11,0.1)',
        }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-gray-200 dark:border-gray-700 transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span className="text-xl">{stepTitles[currentStep].emoji}</span>
                {stepTitles[currentStep].title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stepTitles[currentStep].subtitle}</p>
            </div>

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' as const }}
              >
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep > 1 ? handleBack : () => router.visit('/client/appointments')}
          className="border-gray-300 dark:border-gray-600"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep > 1 ? 'Anterior' : 'Volver'}
        </Button>

        {currentStep < 4 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            Siguiente
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed() || submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Cita
            <Check className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              ¡Cita Confirmada!
            </DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Tu cita ha sido agendada exitosamente. Aquí están los detalles:
            </DialogDescription>
          </DialogHeader>
          {confirmedAppointment && (
            <div className="space-y-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Servicio</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{confirmedAppointment.service}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Mascota</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{confirmedAppointment.pet}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Fecha</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{confirmedAppointment.date}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Horario</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{confirmedAppointment.time}</span>
              </div>
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button onClick={handleDialogClose} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Ver Mis Citas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
BookingWizard.layout = (page: React.ReactNode) => <ClientLayout>{page}</ClientLayout>;