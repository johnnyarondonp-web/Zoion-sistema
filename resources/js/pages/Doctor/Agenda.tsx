import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import DoctorLayout from '@/components/layout/DoctorLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePage } from '@inertiajs/react';
import {
  CalendarDays, Clock, User, MessageCircle, 
  Stethoscope, Activity, ClipboardList, CheckCircle2,
  ChevronRight, ArrowRight, Save, History,
  AlertCircle, Plus, Search, Weight, Syringe, X, ShieldCheck
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { formatTime12h } from '@/lib/format';

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  pet: { 
    id: string; 
    name: string; 
    species: string; 
    breed: string | null;
    gender: string | null;
    birthdate: string | null;
    weight: number | null;
    photo: string | null;
  };
  service: { id: string; name: string; durationMinutes: number; price: number };
  user: { id: string; name: string; email: string; phone?: string };
}

interface ClinicalNote {
  id: string;
  note: string;
  diagnosis: string | null;
  treatment: string | null;
  followUp: string | null;
  createdAt: string;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const statusBadgeStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  confirmed: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300',
  no_show: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
};

const getCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

export default function DoctorAgenda({ selectedAppointmentId }: { selectedAppointmentId?: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedGlobalPet, setSelectedGlobalPet] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState({
    note: '',
    diagnosis: '',
    treatment: '',
    followUp: '',
  });
  const [submittingNote, setSubmittingNote] = useState(false);

  // Buscador Global
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Actualizar Peso
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [submittingWeight, setSubmittingWeight] = useState(false);

  // Vacunación
  const { auth } = usePage().props as any;
  const doctorName = auth?.user?.name || '';
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [isVaccModalOpen, setIsVaccModalOpen] = useState(false);
  const [vaccForm, setVaccForm] = useState({
    name: '',
    date: new Date().toLocaleDateString('en-CA'),
    nextDue: '',
    notes: '',
    vet: '',
  });
  const [submittingVacc, setSubmittingVacc] = useState(false);

  const handleOpenVaccModal = () => {
    setVaccForm({
      name: '',
      date: new Date().toLocaleDateString('en-CA'),
      nextDue: '',
      notes: '',
      vet: doctorName,
    });
    setIsVaccModalOpen(true);
  };

  // Auto-open appointment from notification
  useEffect(() => {
    if (selectedAppointmentId && appointments.length > 0) {
      const found = appointments.find(a => a.id === selectedAppointmentId);
      if (found) {
        setSelectedAppointment(found);
        setIsDetailOpen(true);
      }
    }
  }, [selectedAppointmentId, appointments]);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/appointments?limit=50&status=confirmed,pending,completed');
      const data = await res.json();
      if (data.success) {
        setAppointments(data.data.appointments);
      }
    } catch {
      toast.error('No se pudo cargar la agenda');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/pets?search=${query}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data);
    } catch {
      toast.error('Error al buscar paciente');
    } finally {
      setIsSearching(false);
    }
  };

  const fetchPetHistory = async (petId: string) => {
    setLoadingNotes(true);
    try {
      // Optimizamos cargando todo el historial (notas, peso, vacunas) en un solo hit
      const res = await fetch(`/api/pets/${petId}/health-summary`);
      const data = await res.json();
      if (data.success) {
        setNotes(data.data.notes || []);
        setVaccinations(data.data.vaccinations || []);
      }
    } catch {
      toast.error('Error al cargar historial clínico');
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleOpenDetail = (apt: Appointment) => {
    setSelectedGlobalPet(null);
    setSelectedAppointment(apt);
    setIsDetailOpen(true);
    fetchPetHistory(apt.pet.id);
  };

  const handleOpenGlobalPet = (pet: any) => {
    setSelectedAppointment(null);
    setSelectedGlobalPet(pet);
    setIsDetailOpen(true);
    fetchPetHistory(pet.id);
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Cita marcada como ${statusLabels[newStatus]}`);
        setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a));
        if (selectedAppointment?.id === appointmentId) {
          setSelectedAppointment(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch {
      toast.error('No se pudo actualizar el estado');
    }
  };

  const submitNote = async () => {
    if (!selectedAppointment || !noteForm.note.trim()) return;
    
    if (isFutureAppointment(selectedAppointment)) {
        toast.error('No puedes registrar notas de una cita futura.');
        return;
    }

    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}/clinical-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(noteForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Nota clínica registrada');
        setNotes(prev => [data.data, ...prev]);
        setIsNoteModalOpen(false);
        setNoteForm({ note: '', diagnosis: '', treatment: '', followUp: '' });
        
        if (selectedAppointment.status !== 'completed') {
          updateStatus(selectedAppointment.id, 'completed');
        }
      } else {
          toast.error(data.error || 'Error al guardar la nota');
      }
    } catch {
      toast.error('Error de conexión al guardar la nota');
    } finally {
      setSubmittingNote(false);
    }
  };

  const isFutureAppointment = (apt: Appointment) => {
    const now = new Date();
    const aptDate = new Date(`${apt.date}T${apt.startTime}`);
    return aptDate > now;
  };

  const updateWeight = async () => {
    const activePet = selectedAppointment?.pet || selectedGlobalPet;
    if (!activePet || !newWeight) return;

    setSubmittingWeight(true);
    try {
      const res = await fetch(`/api/pets/${activePet.id}/weight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({
            weight: newWeight,
            date: new Date().toLocaleDateString('en-CA'),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Peso actualizado correctamente');
        if (selectedAppointment) {
            setSelectedAppointment(prev => prev ? { ...prev, pet: { ...prev.pet, weight: Number(newWeight) } } : null);
            setAppointments(prev => prev.map(a => a.pet.id === activePet.id ? { ...a, pet: { ...a.pet, weight: Number(newWeight) } } : a));
        } else if (selectedGlobalPet) {
            setSelectedGlobalPet((prev: any) => ({ ...prev, weight: Number(newWeight) }));
        }
        setIsWeightModalOpen(false);
        setNewWeight('');
      } else {
        toast.error(data.error || 'Error al actualizar el peso');
      }
    } catch {
      toast.error('Error de conexión al actualizar peso');
    } finally {
      setSubmittingWeight(false);
    }
  };

  const submitVaccination = async () => {
    const activePet = selectedAppointment?.pet || selectedGlobalPet;
    if (!activePet || !vaccForm.name.trim()) return;

    setSubmittingVacc(true);
    try {
      const res = await fetch(`/api/pets/${activePet.id}/vaccinations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(vaccForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Vacuna registrada correctamente');
        setVaccinations(data.data.vaccinations || []);
        setIsVaccModalOpen(false);
        setVaccForm({
          name: '',
          date: new Date().toLocaleDateString('en-CA'),
          nextDue: '',
          notes: '',
          vet: doctorName,
        });
      } else {
        toast.error(data.error || 'Error al guardar la vacuna');
      }
    } catch {
      toast.error('Error de conexión al guardar la vacuna');
    } finally {
      setSubmittingVacc(false);
    }
  };

  const calculateAge = (birthdate: string | null) => {
    if (!birthdate) return 'N/A';
    const birth = new Date(birthdate);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--;
    return `${years} años`;
  };

  const petAge = useMemo(() => {
    const activePet = selectedAppointment?.pet || selectedGlobalPet;
    return calculateAge(activePet?.birthdate);
  }, [selectedAppointment, selectedGlobalPet]);

  const groupedAppointments = useMemo(() => {
    return appointments.reduce((acc, apt) => {
      if (!acc[apt.date]) acc[apt.date] = [];
      acc[apt.date].push(apt);
      return acc;
    }, {} as Record<string, Appointment[]>);
  }, [appointments]);

  const sortedDates = Object.keys(groupedAppointments).sort();

  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const todayAppointments = appointments.filter(a => a.date === todayStr);
  const totalToday = todayAppointments.length;
  const completedToday = todayAppointments.filter(a => a.status === 'completed').length;
  const pendingToday = todayAppointments.filter(a => ['confirmed', 'pending'].includes(a.status)).length;

  return (
    <DoctorLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Mi Agenda Médica
          </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión clínica y atención de pacientes</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Buscar paciente..." 
                className="pl-9 h-9 rounded-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
              />
              {searchQuery.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 max-h-64 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-gray-500">Buscando...</div>
                  ) : searchResults.length > 0 ? (
                    <div className="p-2 space-y-1">
                      {searchResults.map(pet => (
                        <button
                          key={pet.id}
                          className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl flex items-center justify-between group"
                          onClick={() => handleOpenGlobalPet(pet)}
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{pet.name}</p>
                            <p className="text-[10px] text-gray-500">{pet.user?.name || 'Sin dueño'}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">No hay resultados</div>
                  )}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={fetchAppointments} className="h-9 px-4 rounded-full">
              <History className="h-4 w-4 mr-2" /> Actualizar
            </Button>
          </div>
        </div>

        {/* Dashboard de Estadísticas Médicas */}
        {!loading && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Citas Hoy</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{totalToday}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 rounded-2xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-gray-950">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest">Completadas</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 leading-none">{completedToday}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 rounded-2xl bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-gray-950">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-600/70 dark:text-amber-400/70 uppercase tracking-widest">Pendientes</p>
                  <p className="text-2xl font-black text-amber-700 dark:text-amber-400 leading-none">{pendingToday}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                <CardContent className="p-6">
                  <div className="flex gap-4"><Skeleton className="h-16 w-16 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-1/4" /><Skeleton className="h-4 w-1/2" /></div></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50/50 dark:bg-gray-900/20 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
            <CalendarDays className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sin citas asignadas</h3>
          </div>
        ) : (
          <div className="space-y-10">
            {sortedDates.map(date => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    {new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                  <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                </div>
                <div className="grid gap-4">
                  {groupedAppointments[date].map(apt => {
                    const isFuture = isFutureAppointment(apt);
                    return (
                      <motion.div key={apt.id} whileHover={{ scale: 1.005, y: -2 }}>
                        <Card 
                          className={cn(
                            "group cursor-pointer transition-all border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800",
                            apt.status === 'completed' ? 'bg-gray-50/40 opacity-75' : 'bg-white dark:bg-gray-900 hover:ring-sky-300'
                          )}
                          onClick={() => handleOpenDetail(apt)}
                        >
                          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex flex-col items-center justify-center sm:w-24 px-4 py-2 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-100 dark:border-sky-800">
                              <span className="text-sm font-bold text-sky-700 dark:text-sky-300">{formatTime12h(apt.startTime)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-gray-900 dark:text-white truncate">{apt.pet.name}</h3>
                                <Badge variant="outline" className={cn("text-[10px] h-5", statusBadgeStyles[apt.status])}>
                                  {statusLabels[apt.status]}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" /> {apt.service.name}</span>
                                <span className="flex items-center gap-1"><User className="h-3 w-3" /> {apt.user.name}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 sm:ml-auto">
                              {apt.status === 'confirmed' && !isFuture && (
                                <Button 
                                  variant="ghost" size="sm" 
                                  className="text-emerald-600 hover:bg-emerald-50 font-bold"
                                  onClick={(e) => { e.stopPropagation(); handleOpenDetail(apt); setIsNoteModalOpen(true); }}
                                >
                                  Atender <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                              )}
                              {isFuture && <span className="text-[10px] text-gray-400 font-medium">Programada</span>}
                              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-sky-500 transition-colors" />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="w-[95vw] sm:max-w-[90vw] md:max-w-5xl lg:max-w-6xl max-h-[92vh] overflow-y-auto rounded-[2rem] p-0 border-none shadow-2xl">
            {(selectedAppointment || selectedGlobalPet) && (() => {
              const activePet = selectedAppointment?.pet || selectedGlobalPet;
              const activeUser = selectedAppointment?.user || selectedGlobalPet?.user;
              
              return (
              <div className="flex flex-col">
                {/* Patient Premium Header - More Compact */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
                  <div className="relative z-10 flex items-center gap-6">
                    <div 
                      className="h-20 w-20 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 p-1 flex-shrink-0 shadow-lg cursor-zoom-in transition-transform hover:scale-105 active:scale-95"
                      onClick={() => activePet.photo && setPreviewImage(activePet.photo)}
                    >
                      {activePet.photo ? (
                        <img 
                          src={activePet.photo} 
                          alt={activePet.name} 
                          className="h-full w-full object-cover rounded-lg" 
                        />
                      ) : (
                        <div className="h-full w-full rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600 text-3xl font-black">
                          {activePet.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black tracking-tight truncate">{activePet.name}</h2>
                        <Badge className="bg-emerald-400/30 hover:bg-emerald-400/40 border-emerald-400/50 text-white text-[10px] uppercase font-bold px-2 py-0">
                          {activePet.species}
                        </Badge>
                      </div>
                      <p className="text-emerald-50/80 font-medium text-base mt-0.5">
                        {activePet.breed || 'Mestizo'} • {calculateAge(activePet.birthdate)}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="ml-auto text-white hover:bg-white/10 rounded-full"
                      onClick={() => setIsDetailOpen(false)}
                    >
                      <Plus className="h-5 w-5 rotate-45" />
                    </Button>
                  </div>
                  <div className="absolute top-0 right-0 h-32 w-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-30" />
                </div>

                <div className="p-6 space-y-6">
                  {/* Vitals Grid - More Streamlined */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center flex-shrink-0">
                        <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">EDAD</p>
                        <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{calculateAge(activePet.birthdate)}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-sky-100 dark:bg-sky-950/30 flex items-center justify-center flex-shrink-0">
                        <Activity className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">PESO</p>
                        <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{activePet.weight ? `${activePet.weight} kg` : 'N/A'}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-500 hover:text-sky-600 hover:bg-sky-50" onClick={() => setIsWeightModalOpen(true)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">SEXO</p>
                        <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{activePet.gender === 'male' ? 'Macho' : 'Hembra'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Owner & Notes - Balanced */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <User className="h-3 w-3 text-sky-500" /> PROPIETARIO
                      </h4>
                      <div className="space-y-0.5">
                        <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">{activeUser?.name || 'No asignado'}</p>
                        <p className="text-xs text-gray-500 font-medium">{activeUser?.email || ''}</p>
                        <p className="text-xs text-gray-500 font-medium">{activeUser?.phone || 'Sin teléfono'}</p>
                      </div>
                    </div>

                    <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <MessageCircle className="h-3 w-3 text-emerald-400" /> MOTIVO / NOTA
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic leading-relaxed font-medium">
                        {selectedAppointment ? (selectedAppointment.notes || 'El cliente no dejó notas adicionales en esta cita.') : 'Vista general de paciente (sin cita vinculada).'}
                      </p>
                    </div>
                  </div>

                  {/* Bottom History Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Historial Clínico */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-gray-900 dark:text-white text-xs tracking-widest uppercase flex items-center gap-2">
                          <History className="h-4 w-4 text-emerald-500" /> Historial Clínico
                        </h4>
                        {selectedAppointment && selectedAppointment.status === 'confirmed' && !isFutureAppointment(selectedAppointment) && (
                          <Button size="sm" onClick={() => setIsNoteModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 h-8 rounded-full px-4 text-[10px] font-black tracking-widest">
                            + NUEVA NOTA
                          </Button>
                        )}
                      </div>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {loadingNotes ? (
                          <>
                            <Skeleton className="h-24 rounded-2xl" />
                            <Skeleton className="h-24 rounded-2xl" />
                          </>
                        ) : notes.length > 0 ? (
                          notes.map((note) => (
                            <motion.div 
                              key={note.id} 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-2 group hover:bg-white dark:hover:bg-gray-800 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-none font-bold text-[9px]">
                                  {new Date(note.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </Badge>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Consulta</span>
                              </div>
                              <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:line-clamp-none transition-all">{note.note}</p>
                              {note.diagnosis && (
                                <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
                                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Dx: {note.diagnosis}</p>
                                </div>
                              )}
                            </motion.div>
                          ))
                        ) : (
                          <div className="py-12 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                            <ClipboardList className="h-8 w-8 text-gray-300 mb-2" />
                            <p className="text-xs text-gray-400 font-medium">No hay registros previos</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Registro de Vacunas */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-gray-900 dark:text-white text-xs tracking-widest uppercase flex items-center gap-2">
                          <Syringe className="h-4 w-4 text-emerald-500" /> Registro de Vacunas
                        </h4>
                        {selectedAppointment && selectedAppointment.status === 'confirmed' && !isFutureAppointment(selectedAppointment) && (
                          <Button size="sm" onClick={handleOpenVaccModal} className="bg-emerald-600 hover:bg-emerald-700 h-8 rounded-full px-4 text-[10px] font-black tracking-widest">
                            + APLICAR VACUNA
                          </Button>
                        )}
                      </div>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {loadingNotes ? (
                          <>
                            <Skeleton className="h-24 rounded-2xl" />
                            <Skeleton className="h-24 rounded-2xl" />
                          </>
                        ) : vaccinations.length > 0 ? (
                          vaccinations.map((vacc, idx) => (
                            <motion.div 
                              key={`vacc-${idx}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-2 group hover:bg-white dark:hover:bg-gray-800 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-none font-bold text-[9px]">
                                  {vacc.date ? new Date(vacc.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                </Badge>
                                {vacc.nextDue && (
                                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest">
                                    Próxima: {new Date(vacc.nextDue + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Syringe className="h-3.5 w-3.5 text-emerald-500" />
                                <p className="text-xs font-bold text-gray-900 dark:text-white">{vacc.name}</p>
                              </div>
                              {vacc.vet && (
                                <p className="text-[9px] font-medium text-gray-400">Aplicada por: {vacc.vet}</p>
                              )}
                              {vacc.notes && (
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">Nota: {vacc.notes}</p>
                              )}
                            </motion.div>
                          ))
                        ) : (
                          <div className="py-12 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                            <Syringe className="h-8 w-8 text-gray-300 mb-2" />
                            <p className="text-xs text-gray-400 font-medium">Sin vacunas registradas</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-gray-50 dark:border-gray-800">
                    {selectedAppointment?.status === 'confirmed' && selectedAppointment.date === new Date().toLocaleDateString('en-CA') && (
                      <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs font-bold" onClick={() => updateStatus(selectedAppointment.id, 'no_show')}>
                        Marcar como Ausente
                      </Button>
                    )}
                    <Button onClick={() => setIsDetailOpen(false)} className="ml-auto h-9 px-6 rounded-full font-bold text-xs bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-black">Cerrar</Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
        </Dialog>

        {/* Note Entry Modal */}
        <Dialog open={isNoteModalOpen} onOpenChange={setIsNoteModalOpen}>
          <DialogContent className="sm:max-w-xl rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-black text-gray-900 dark:text-white uppercase tracking-tight">
                <Stethoscope className="h-6 w-6 text-emerald-500" /> Nota Médica
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Diagnóstico Principal</Label>
                    <span className={cn("text-[10px] font-bold", noteForm.diagnosis.length > 100 ? "text-red-500" : "text-gray-400")}>{noteForm.diagnosis.length}/100</span>
                </div>
                <Input 
                  placeholder="Ej: Otitis externa bilateral"
                  maxLength={100}
                  value={noteForm.diagnosis}
                  onChange={e => setNoteForm({...noteForm, diagnosis: e.target.value})}
                  className="h-12 rounded-xl bg-gray-50/50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Observaciones Clínicas</Label>
                    <span className={cn("text-[10px] font-bold", noteForm.note.length > 500 ? "text-red-500" : "text-gray-400")}>{noteForm.note.length}/500</span>
                </div>
                <Textarea 
                  placeholder="Detalles observados durante la revisión física..."
                  rows={4}
                  maxLength={500}
                  value={noteForm.note}
                  onChange={e => setNoteForm({...noteForm, note: e.target.value})}
                  className="rounded-2xl bg-gray-50/50 p-4"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tratamiento</Label>
                    <span className="text-[10px] font-bold text-gray-400">{noteForm.treatment.length}/150</span>
                  </div>
                  <Textarea 
                    placeholder="Medicamentos, dosis..."
                    rows={2}
                    maxLength={150}
                    value={noteForm.treatment}
                    onChange={e => setNoteForm({...noteForm, treatment: e.target.value})}
                    className="rounded-2xl bg-gray-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Seguimiento</Label>
                    <span className="text-[10px] font-bold text-gray-400">{noteForm.followUp.length}/150</span>
                  </div>
                  <Textarea 
                    placeholder="Próxima revisión..."
                    rows={2}
                    maxLength={150}
                    value={noteForm.followUp}
                    onChange={e => setNoteForm({...noteForm, followUp: e.target.value})}
                    className="rounded-2xl bg-gray-50/50"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button variant="ghost" onClick={() => setIsNoteModalOpen(false)} className="rounded-full font-bold">Cancelar</Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 px-10 h-12 rounded-full font-black tracking-widest shadow-lg shadow-emerald-500/20"
                onClick={submitNote}
                disabled={submittingNote || !noteForm.note.trim()}
              >
                {submittingNote ? 'GUARDANDO...' : 'FINALIZAR CONSULTA'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Weight Modal */}
        <Dialog open={isWeightModalOpen} onOpenChange={setIsWeightModalOpen}>
          <DialogContent className="sm:max-w-sm rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-black text-gray-900 dark:text-white uppercase tracking-tight">
                <Weight className="h-5 w-5 text-sky-500" /> Registrar Peso
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Peso Actual (kg)</Label>
                <Input 
                  type="number"
                  step="0.1"
                  placeholder="Ej: 5.5"
                  value={newWeight}
                  onChange={e => setNewWeight(e.target.value)}
                  className="h-12 rounded-xl bg-gray-50/50 text-xl font-bold"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsWeightModalOpen(false)} className="rounded-full font-bold">Cancelar</Button>
              <Button 
                className="bg-sky-600 hover:bg-sky-700 px-8 rounded-full font-bold"
                onClick={updateWeight}
                disabled={submittingWeight || !newWeight}
              >
                {submittingWeight ? 'Guardando...' : 'Guardar Peso'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Register Vaccination Modal */}
        <Dialog open={isVaccModalOpen} onOpenChange={setIsVaccModalOpen}>
          <DialogContent className="sm:max-w-md rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-black text-gray-900 dark:text-white uppercase tracking-tight">
                <Syringe className="h-5 w-5 text-emerald-500" /> Aplicar Vacuna
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre de la Vacuna *</Label>
                <Input 
                  placeholder="Ej: Triple Felina, Rabia, Parvovirus..."
                  value={vaccForm.name}
                  onChange={e => setVaccForm({ ...vaccForm, name: e.target.value })}
                  className="h-12 rounded-xl bg-gray-50/50"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Fecha Aplicación *</Label>
                  <Input 
                    type="date"
                    value={vaccForm.date}
                    onChange={e => setVaccForm({ ...vaccForm, date: e.target.value })}
                    className="h-12 rounded-xl bg-gray-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Próxima Dosis</Label>
                  <Input 
                    type="date"
                    value={vaccForm.nextDue}
                    onChange={e => setVaccForm({ ...vaccForm, nextDue: e.target.value })}
                    className="h-12 rounded-xl bg-gray-50/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Veterinario</Label>
                <Input 
                  placeholder="Nombre del veterinario..."
                  value={vaccForm.vet}
                  onChange={e => setVaccForm({ ...vaccForm, vet: e.target.value })}
                  className="h-12 rounded-xl bg-gray-50/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Notas / Lote</Label>
                <Input 
                  placeholder="Ej: Lote 4598-B, sin reacciones adversas..."
                  value={vaccForm.notes}
                  onChange={e => setVaccForm({ ...vaccForm, notes: e.target.value })}
                  className="h-12 rounded-xl bg-gray-50/50"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsVaccModalOpen(false)} className="rounded-full font-bold">Cancelar</Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 px-8 rounded-full font-bold"
                onClick={submitVaccination}
                disabled={submittingVacc || !vaccForm.name.trim()}
              >
                {submittingVacc ? 'Registrando...' : 'Registrar Vacuna'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!previewImage} onOpenChange={(o) => !o && setPreviewImage(null)}>
          <DialogContent className="sm:max-w-3xl p-0 border-none bg-transparent shadow-none flex items-center justify-center">
            {previewImage && (
              <motion.img 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                src={previewImage} 
                alt="Vista previa" 
                className="max-h-[85vh] max-w-full rounded-3xl object-contain shadow-2xl"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DoctorLayout>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
