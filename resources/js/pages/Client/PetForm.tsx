import { useEffect, useState, useRef, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { differenceInMonths, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Camera, Loader2, PawPrint, Upload, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import ClientLayout from '@/components/layout/ClientLayout';

// ─── Types ───────────────────────────────────────────────────────────────────
interface PetFormProps {
  mode: 'create' | 'edit';
  petId?: string;
}

interface FormState {
  name: string;
  species: string;
  breed: string;
  gender: string;
  birthdate: string;
  weight: string;
  photo: string | null;
  notes: string;
  mixBreed: string;
}

const speciesOptions = [
  { value: 'perro',  label: 'Perro'  },
  { value: 'gato',   label: 'Gato'   },
  { value: 'conejo', label: 'Conejo' },
  { value: 'ave',    label: 'Ave'    },
  { value: 'reptil', label: 'Reptil' },
];

const BREED_OPTIONS: Record<string, string[]> = {
  perro: [
    'Mestizo','Akita','American Staffordshire','Basenji','Beagle','Bichón Frisé',
    'Border Collie','Boxer','Bulldog Francés','Chihuahua','Chow Chow','Cocker Spaniel',
    'Dachshund','Dálmata','Doberman','Golden Retriever','Gran Danés','Husky Siberiano',
    'Labrador Retriever','Malamute de Alaska','Maltés','Pastor Alemán','Pit Bull',
    'Pointer','Pomerania','Poodle Estándar','Poodle Miniatura','Poodle Toy','Rottweiler',
    'Samoyedo','San Bernardo','Schnauzer Estándar','Schnauzer Miniatura','Setter Irlandés',
    'Shar Pei','Shiba Inu','Shih Tzu','Vizsla','Weimaraner','Yorkshire Terrier',
  ],
  gato: [
    'Mestizo','Abisinio','Angora Turco','Azul Ruso','Bengalí','Birmano',
    'British Shorthair','Cornish Rex','Devon Rex','Maine Coon','Manx','Noruego del Bosque',
    'Persa','Ragdoll','Scottish Fold','Siberiano','Siamés','Somalí','Sphynx','Tonkinés',
  ],
  conejo: [
    'Mestizo','American Fuzzy Lop','Angora Inglés','Californiano','Dutch','Flemish Giant',
    'Himalayo','Holland Lop','Lionhead','Mini Lop','Mini Rex','Nueva Zelanda','Plateado',
    'Rex','Tan',
  ],
  ave: [
    'Agapornis (Inseparable)','Cacatúa','Canario','Cotorra','Diamante de Gould','Eclectus',
    'Guacamayo','Jilguero','Loro Africano (Gris del Congo)','Loro Amazónico','Loro Yaco',
    'Ninfa (Cockatiel)','Paloma','Perico Australiano','Periquito',
  ],
  reptil: [
    'Anolis','Boa Constrictor','Camaleón','Dragón Barbudo','Gecko de Cola de Rábano',
    'Gecko Leopardo','Iguana Verde','Monitor de Savannah','Pitón Ball','Pitón Reticulada',
    'Serpiente del Maíz','Skink de Lengua Azul','Tortuga Acuática','Tortuga de Tierra',
    'Tortuga Sulcata',
  ],
};

const WEIGHT_BY_BREED: Record<string, Record<string, { min: number; max: number }>> = {
  perro: {
    'Mestizo':               { min: 0.10, max: 60.00 },
    'Labrador Retriever':    { min: 0.40, max: 36.00 },
    'Golden Retriever':      { min: 0.40, max: 34.00 },
    'Pastor Alemán':         { min: 0.40, max: 40.00 },
    'Bulldog Francés':       { min: 0.15, max: 14.00 },
    'Poodle Toy':            { min: 0.08, max:  3.00 },
    'Poodle Miniatura':      { min: 0.10, max:  7.00 },
    'Poodle Estándar':       { min: 0.30, max: 32.00 },
    'Chihuahua':             { min: 0.07, max:  3.00 },
    'Yorkshire Terrier':     { min: 0.07, max:  3.20 },
    'Beagle':                { min: 0.20, max: 11.00 },
    'Rottweiler':            { min: 0.40, max: 60.00 },
    'Doberman':              { min: 0.40, max: 45.00 },
    'Boxer':                 { min: 0.40, max: 32.00 },
    'Dálmata':               { min: 0.30, max: 32.00 },
    'Husky Siberiano':       { min: 0.35, max: 27.00 },
    'Border Collie':         { min: 0.25, max: 20.00 },
    'Shih Tzu':              { min: 0.10, max:  7.20 },
    'Maltés':                { min: 0.10, max:  4.00 },
    'Dachshund':             { min: 0.15, max: 15.00 },
    'Cocker Spaniel':         { min: 0.20, max: 15.00 },
    'Schnauzer Miniatura':   { min: 0.15, max:  8.00 },
    'Schnauzer Estándar':    { min: 0.25, max: 20.00 },
    'Gran Danés':            { min: 0.60, max: 90.00  },
    'San Bernardo':          { min: 0.60, max: 82.00 },
    'Pit Bull':              { min: 0.25, max: 27.00 },
    'American Staffordshire':{ min: 0.30, max: 32.00 },
    'Shar Pei':               { min: 0.30, max: 29.00 },
    'Chow Chow':             { min: 0.30, max: 32.00 },
    'Akita':                 { min: 0.40, max: 59.00 },
    'Shiba Inu':             { min: 0.20, max: 11.00 },
    'Bichón Frisé':          { min: 0.10, max:  8.00 },
    'Pomerania':             { min: 0.08, max:  3.50 },
    'Samoyedo':              { min: 0.30, max: 30.00 },
    'Malamute de Alaska':    { min: 0.40, max: 39.00 },
    'Weimaraner':            { min: 0.40, max: 39.00 },
    'Setter Irlandés':       { min: 0.30, max: 32.00 },
    'Pointer':               { min: 0.30, max: 34.00 },
    'Vizsla':                { min: 0.30, max: 29.00 },
    'Basenji':               { min: 0.20, max: 11.00 },
  },
  gato: {
    'Mestizo':               { min: 0.08, max:  6.00 },
    'Persa':                 { min: 0.08, max:  5.50 },
    'Siamés':                { min: 0.07, max:  4.50 },
    'Maine Coon':            { min: 0.10, max:  9.00 },
    'Ragdoll':               { min: 0.09, max:  9.00 },
    'Bengalí':               { min: 0.08, max:  7.00 },
    'Abisinio':              { min: 0.07, max:  5.00 },
    'Sphynx':                { min: 0.08, max:  5.50 },
    'British Shorthair':     { min: 0.09, max:  8.00 },
    'Scottish Fold':         { min: 0.08, max:  6.00 },
    'Birmano':               { min: 0.08, max:  5.50 },
    'Angora Turco':           { min: 0.08, max:  5.00 },
    'Noruego del Bosque':    { min: 0.10, max:  8.00 },
    'Siberiano':             { min: 0.10, max:  9.00 },
    'Azul Ruso':             { min: 0.08, max:  5.50 },
    'Devon Rex':             { min: 0.07, max:  4.50 },
    'Cornish Rex':           { min: 0.07, max:  4.50 },
    'Manx':                  { min: 0.08, max:  5.50 },
    'Tonkinés':               { min: 0.08, max:  5.50 },
    'Somalí':                { min: 0.08, max:  5.00 },
  },
  conejo: {
    'Mestizo':               { min: 0.030, max:  5.00 },
    'Holland Lop':           { min: 0.030, max:  1.80 },
    'Mini Rex':              { min: 0.030, max:  2.00 },
    'Lionhead':              { min: 0.030, max:  1.70 },
    'Angora Inglés':         { min: 0.040, max:  3.50  },
    'Dutch':                 { min: 0.030, max:  2.50 },
    'Flemish Giant':         { min: 0.080, max: 10.00 },
    'Californiano':          { min: 0.050, max:  4.50 },
    'Nueva Zelanda':          { min: 0.050, max:  5.50 },
    'Rex':                   { min: 0.040, max:  4.50 },
    'Mini Lop':              { min: 0.040, max:  3.00 },
    'American Fuzzy Lop':    { min: 0.030,  max:  1.80 },
    'Tan':                   { min: 0.040, max:  2.50 },
    'Himalayo':              { min: 0.030, max:  2.00 },
    'Plateado':              { min: 0.040, max:  3.00 },
  },
  ave: {
    'Agapornis (Inseparable)':           { min: 0.003, max: 0.060 },
    'Cacatúa':                           { min: 0.015, max: 0.800 },
    'Canario':                           { min: 0.001, max: 0.020 },
    'Cotorra':                           { min: 0.005, max: 0.150 },
    'Diamante de Gould':                 { min: 0.001, max: 0.020 },
    'Eclectus':                           { min: 0.015, max: 0.500 },
    'Guacamayo':                         { min: 0.020, max: 1.500 },
    'Jilguero':                          { min: 0.001, max: 0.019 },
    'Loro Africano (Gris del Congo)':    { min: 0.015, max: 0.600 },
    'Loro Amazónico':                    { min: 0.015, max: 0.600 },
    'Loro Yaco':                         { min: 0.015, max: 0.600 },
    'Ninfa (Cockatiel)':                 { min: 0.004, max: 0.115 },
    'Paloma':                            { min: 0.010, max: 0.500 },
    'Perico Australiano':                { min: 0.002,  max: 0.040 },
    'Periquito':                         { min: 0.002, max: 0.040 },
  },
  reptil: {
    'Anolis':                    { min: 0.001, max:  0.010 },
    'Boa Constrictor':           { min: 0.060, max: 15.000 },
    'Camaleón':                  { min: 0.001, max:  0.180 },
    'Dragón Barbudo':            { min: 0.002, max:  0.500 },
    'Gecko de Cola de Rábano':   { min:  0.002, max:  0.030 },
    'Gecko Leopardo':            { min: 0.003, max:  0.080 },
    'Iguana Verde':              { min: 0.010, max:  8.000 },
    'Monitor de Savannah':       { min: 0.020,  max:  2.500 },
    'Pitón Ball':                { min: 0.050, max:  2.000 },
    'Pitón Reticulada':          { min: 0.150, max: 90.000 },
    'Serpiente del Maíz':        { min: 0.006, max:   0.900 },
    'Skink de Lengua Azul':      { min: 0.010, max:  0.500 },
    'Tortuga Acuática':          { min: 0.005, max:  2.500 },
    'Tortuga de Tierra':         { min: 0.010, max:  3.000  },
    'Tortuga Sulcata':           { min: 0.030, max: 50.000 },
  },
};

const SPECIES_AGE_LIMITS: Record<string, { minYears: number; maxYears: number }> = {
  perro:  { minYears: 0, maxYears: 20  },
  gato:   { minYears: 0, maxYears: 25  },
  conejo: { minYears: 0, maxYears: 12  },
  ave:    { minYears: 0, maxYears: 80  },
  reptil: { minYears: 0, maxYears: 50  },
};

const WEIGHT_LIMITS: Record<string, { min: number; max: number }> = {
  perro:  { min: 0.5,  max: 120 },
  gato:   { min: 0.5,  max: 12  },
  conejo: { min: 0.3,  max: 8   },
  ave:    { min: 0.01, max: 2   },
  reptil: { min: 0.05, max: 150 },
};

const NAME_REGEX = /^[A-Za-záéíóúÁÉÍÓÚüÜñÑ]+( [A-Za-záéíóúÁÉÍÓÚüÜñÑ]+)?$/;
const MIX_REGEX = /^[A-Za-záéíóúÁÉÍÓÚüÜñÑ\s-()/.]*$/;

// ─── Helpers ────────────────────────────────────────────────────────────────
const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

function formatName(value: string): string {
  let formatted = value.replace(/\s+/g, ' ').trim();
  formatted = formatted
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return formatted;
}

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

function getDynamicWeightLimits(species: string, breed: string, birthdate: string): { min: number; max: number } {
  if (!birthdate) {
    const limits = WEIGHT_LIMITS[species];
    return limits ? limits : { min: 0.1, max: 200 };
  }

  const breedLimits = WEIGHT_BY_BREED[species]?.[breed];
  if (breedLimits) {
    const ageMonths = differenceInMonths(new Date(), parseISO(birthdate));
    let multiplier: number;
    if (ageMonths <= 3) multiplier = 0.25;
    else if (ageMonths <= 6) multiplier = 0.50;
    else if (ageMonths <= 12) multiplier = 0.75;
    else multiplier = 1;

    return {
      min: parseFloat(breedLimits.min.toFixed(3)),
      max: parseFloat((breedLimits.max * multiplier).toFixed(3)),
    };
  }

  const limits = WEIGHT_LIMITS[species];
  return limits ? limits : { min: 0.1, max: 200 };
}

export default function PetForm({ mode, petId }: PetFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(mode === 'edit');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'mixBreed', string>>>({});
  const [form, setForm] = useState<FormState>({
    name: '',
    species: '',
    breed: '',
    gender: '',
    birthdate: '',
    weight: '',
    photo: null,
    notes: '',
    mixBreed: '',
  });

  const hasMestizo = form.species === 'perro' || form.species === 'gato' || form.species === 'conejo';
  const isMestizo = form.breed === 'Mestizo';
  const breedOptions = form.species ? BREED_OPTIONS[form.species] || [] : [];
  const dateLimits = getDateLimits(form.species);
  
  // ✅ PROBLEMA 1 SOLUCIONADO: weightLimits se recalcula en cada render cuando 
  // cambian form.species, form.breed o form.birthdate, por lo que el UI de rango 
  // se actualiza automáticamente en tiempo real.
  const weightLimits = getDynamicWeightLimits(form.species, form.breed, form.birthdate);
  // In edit mode allow weight input as long as a value already came from the server;
  // in create mode require birthdate first.
  const weightLocked = mode === 'create' ? !form.birthdate : (!form.birthdate && form.weight === '');

  useEffect(() => {
    if (mode === 'edit' && petId) {
      fetchPet(petId);
    } else {
      setFetching(false);
    }
  }, [mode, petId]);

  const fetchPet = async (id: string) => {
    try {
      const res = await fetch(`/api/pets/${id}`, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      const data = await res.json();
      if (data.success) {
        const pet = data.data;
        let mixBreed = '';
        let breed = pet.breed || '';
        if (breed.startsWith('Mestizo (') && breed.endsWith(')')) {
          mixBreed = breed.slice(9, -1);
          breed = 'Mestizo';
        }
        setForm({
          name: pet.name || '',
          species: pet.species || '',
          breed: breed,
          gender: pet.gender || '',
          birthdate: pet.birthdate || '',
          weight: pet.weight != null ? String(pet.weight) : '',
          photo: pet.photo || null,
          notes: pet.notes || '',
          mixBreed: mixBreed,
        });
      } else {
        toast.error('Mascota no encontrada');
        router.visit('/client/pets');
      }
    } catch {
      toast.error('Error al cargar la mascota');
      router.visit('/client/pets');
    } finally {
      setFetching(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Solo se aceptan imágenes JPG o PNG');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('La imagen no puede superar 4 MB');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': getCsrfToken() },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setForm((prev) => ({ ...prev, photo: data.data.url }));
        toast.success('Foto subida exitosamente');
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setForm((prev) => ({ ...prev, photo: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, [uploadFile]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState | 'mixBreed', string>> = {};
    if (!form.name.trim()) {
      newErrors.name = 'Solo letras y un espacio entre palabras (máx. 25 caracteres)';
    } else if (!NAME_REGEX.test(form.name)) {
      newErrors.name = 'Solo letras y un espacio entre palabras (máx. 25 caracteres)';
    }

    if (!form.species) newErrors.species = 'La especie es obligatoria';
    if (!form.gender) newErrors.gender = 'El género es obligatorio';

    if (form.birthdate) {
      const { min, max } = getDateLimits(form.species);
      if (form.birthdate < min || form.birthdate > max) {
        newErrors.birthdate = 'La fecha no es válida para esta especie';
      }
    }

    if (form.weight) {
      const w = parseFloat(form.weight);
      if (isNaN(w) || w < weightLimits.min || w > weightLimits.max) {
        newErrors.weight = `El peso debe estar entre ${weightLimits.min} y ${weightLimits.max} kg para esta especie`;
      }
    }

    if (isMestizo && hasMestizo && form.mixBreed && !MIX_REGEX.test(form.mixBreed)) {
      newErrors.mixBreed = 'Solo letras, espacios, guiones y paréntesis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      let breed = form.breed;
      if (isMestizo && hasMestizo && form.mixBreed.trim()) {
        breed = `Mestizo (${form.mixBreed.trim()})`;
      }

      const payload = {
        name: form.name.trim(),
        species: form.species,
        breed: breed || null,
        gender: form.gender || null,
        birthdate: form.birthdate || null,
        weight: form.weight ? parseFloat(form.weight) : null,
        photo: form.photo,
        notes: form.notes.trim() || null,
      };

      const url = mode === 'create' ? '/api/pets' : `/api/pets/${petId}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(mode === 'create' ? 'Mascota registrada exitosamente' : 'Mascota actualizada exitosamente');
        router.visit('/client/pets');
      } else {
        toast.error(data.error || 'Error al guardar la mascota');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (field === 'species') {
      setForm((prev) => ({ ...prev, breed: '', mixBreed: '', gender: '' }));
      setErrors((prev) => ({ ...prev, breed: undefined, mixBreed: undefined, gender: undefined }));
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.visit('/client/pets')}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {mode === 'create' ? 'Registrar Mascota' : 'Editar Mascota'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {mode === 'create' ? 'Agrega una nueva mascota a tu perfil' : 'Actualiza la información de tu mascota'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-gray-100">
            <PawPrint className="h-5 w-5 text-emerald-600" />
            Información de la Mascota
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Nombre de tu mascota"
                maxLength={25}
                value={form.name}
                onChange={(e) => {
                  const clean = e.target.value.replace(/[^A-Za-záéíóúÁÉÍÓÚüÜñÑ ]/g, '');
                  updateField('name', formatName(clean));
                }}
                className={errors.name ? 'border-red-400 focus:ring-red-200' : ''}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">Máx. 25 caracteres</p>
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Species & Breed */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="species" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Especie <span className="text-red-500">*</span>
                </Label>
                <Select value={form.species} onValueChange={(v) => updateField('species', v)}>
                  <SelectTrigger className={errors.species ? 'border-red-400' : ''}>
                    <SelectValue placeholder="Seleccionar especie" />
                  </SelectTrigger>
                  <SelectContent>
                    {speciesOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.species && <p className="text-xs text-red-500">{errors.species}</p>}
              </div>

              {form.species && (
                <div className="space-y-2">
                  <Label htmlFor="breed" className="text-sm font-medium text-gray-700 dark:text-gray-300">Raza</Label>
                  <Select value={form.breed} onValueChange={(v) => updateField('breed', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar raza" />
                    </SelectTrigger>
                    <SelectContent>
                      {breedOptions.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Género — aparece después de elegir especie */}
            {form.species && (
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Género <span className="text-red-500">*</span>
                </Label>
                <Select value={form.gender} onValueChange={(v) => updateField('gender', v)}>
                  <SelectTrigger className={errors.gender ? 'border-red-400' : ''}>
                    <SelectValue placeholder="Seleccionar género" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="macho">Macho</SelectItem>
                    <SelectItem value="hembra">Hembra</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
              </div>
            )}

            {/* Mix field for Mestizo */}
            {isMestizo && hasMestizo && (
              <div className="space-y-1">
                <Label htmlFor="mixBreed" className="text-sm font-medium text-gray-700 dark:text-gray-300">Mezcla (opcional)</Label>
                <Input
                  id="mixBreed"
                  placeholder="Ej. Husky - Golden Retriever"
                  maxLength={60}
                  value={form.mixBreed}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (MIX_REGEX.test(val)) {
                      updateField('mixBreed', val);
                    }
                  }}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Escribe la mezcla estimada, ej. Labrador - Boxer
                </p>
                {errors.mixBreed && <p className="text-xs text-red-500">{errors.mixBreed}</p>}
              </div>
            )}

            {/* Birthdate & Weight */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="birthdate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de nacimiento</Label>
                <Input
                  id="birthdate"
                  type="date"
                  min={dateLimits.min}
                  max={dateLimits.max}
                  value={form.birthdate}
                  onChange={(e) => updateField('birthdate', e.target.value)}
                />
                {errors.birthdate && <p className="text-xs text-red-500">{errors.birthdate}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight" className="text-sm font-medium text-gray-700 dark:text-gray-300">Peso (kg)</Label>
                {/* ✅ PROBLEMA 1 & 2 SOLUCIONADOS: 
                   - weightLimits se recalcula automáticamente al cambiar especie/raza/fecha.
                   - onChange bloquea valores > max o < 0 en tiempo real.
                   - onBlur corrige valores < min al salir del campo. */}
                <Input
                  id="weight"
                  type="text"
                  inputMode="decimal"
                  min={weightLimits.min}
                  max={weightLimits.max}
                  placeholder={weightLocked ? 'Primero elige la fecha de nacimiento' : '0.0'}
                  value={form.weight}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || val === '.') {
                      updateField('weight', val);
                      return;
                    }
                    // Solo permitir formato numérico válido con máximo 1 decimal
                    if (!/^\d*\.?\d?$/.test(val)) return;
                    // No permitir más de un cero al inicio (bloquea 000000)
                    if (/^0\d/.test(val)) return;
                    const num = parseFloat(val);
                    if (!isNaN(num) && num > weightLimits.max) return;
                    updateField('weight', val);
                  }}
                  onBlur={(e) => {
                    const num = parseFloat(e.target.value);
                    if (!isNaN(num) && num < weightLimits.min) {
                      updateField('weight', String(weightLimits.min));
                    }
                  }}
                  disabled={weightLocked}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Rango: {weightLimits.min} – {weightLimits.max} kg
                </p>
                {errors.weight && <p className="text-xs text-red-500">{errors.weight}</p>}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Ej. Alérgico a la penicilina, come solo alimento hipoalergénico, miedo a los truenos... Cualquier info útil para el veterinario."
                maxLength={500}
                rows={3}
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                {form.notes.length} / 500 caracteres
              </p>
            </div>

            {/* Photo Upload with Drag & Drop */}
            <div className="flex flex-col items-center gap-3">
              <div
                ref={dropRef}
                className={`relative h-72 w-full max-w-sm rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 ${
                  dragOver
                    ? 'ring-4 ring-emerald-400 dark:ring-emerald-600 border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                    : ''
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {form.photo ? (
                  <img
                    src={form.photo}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className={`flex flex-col h-full w-full items-center justify-center border-2 border-dashed rounded-2xl transition-colors ${
                    dragOver
                      ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30'
                  } group-hover:border-emerald-400 dark:group-hover:border-emerald-600`}>
                    {uploading ? (
                      <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="h-8 w-8 text-emerald-400 dark:text-emerald-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mb-2" />
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Arrastra una imagen aquí
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          o haz clic para seleccionar
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                          Solo JPG y PNG · Máx. 4 MB
                        </p>
                      </>
                    )}
                  </div>
                )}
                {!uploading && form.photo && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {form.photo ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {form.photo && (
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, photo: null }))}
                    className="text-sm text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 font-medium"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.visit('/client/pets')}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === 'create' ? 'Registrar Mascota' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

PetForm.layout = (page: React.ReactNode) => <ClientLayout>{page}</ClientLayout>;