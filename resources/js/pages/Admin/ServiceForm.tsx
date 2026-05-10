import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface ServiceFormProps {
  mode: 'create' | 'edit';
  serviceId?: string;
}

interface FormData {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
  category: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  durationMinutes?: string;
  price?: string;
}

const categoryOptions = [
  { value: '', label: 'Sin categoría' },
  { value: 'consulta', label: '🩺 Consulta' },
  { value: 'cirugia', label: ' Cirugía' },
  { value: 'estetica', label: '✂️ Estética' },
  { value: 'diagnostico', label: '🔬 Diagnóstico' },
  { value: 'prevencion', label: '🛡️ Prevención' },
];

// Helper para CSRF token (Laravel)
const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

export default function ServiceForm({ mode, serviceId }: ServiceFormProps) {
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: '',
    description: '',
    durationMinutes: '',
    price: '',
    category: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (mode === 'edit' && serviceId) {
      fetchService(serviceId);
    }
  }, [mode, serviceId]);

  const fetchService = async (id: string) => {
    try {
      const res = await fetch(`/api/services/${id}`, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      const data = await res.json();
      if (data.success) {
        const s = data.data;
        setForm({
          name: s.name,
          description: s.description || '',
          durationMinutes: String(s.durationMinutes),
          price: String(s.price),
          category: s.category || '',
          isActive: s.isActive,
        });
      } else {
        toast.error('Servicio no encontrado');
        router.visit('/admin/services');
      }
    } catch {
      toast.error('Error de conexión');
      router.visit('/admin/services');
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!form.durationMinutes || isNaN(Number(form.durationMinutes)) || Number(form.durationMinutes) <= 0) {
      newErrors.durationMinutes = 'La duración debe ser un número positivo';
    }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) {
      newErrors.price = 'El precio debe ser un número no negativo';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        durationMinutes: Number(form.durationMinutes),
        price: Number(parseFloat(form.price).toFixed(2)),
        category: form.category || null,
        isActive: form.isActive,
      };

      const url = mode === 'create' ? '/api/services' : `/api/services/${serviceId}`;
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
        toast.success(mode === 'create' ? 'Servicio creado exitosamente' : 'Servicio actualizado exitosamente');
        router.visit('/admin/services');
      } else {
        toast.error(data.error || 'Error al guardar servicio');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.visit('/admin/services')}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {mode === 'create' ? 'Nuevo Servicio' : 'Editar Servicio'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {mode === 'create' ? 'Registra un nuevo servicio en la clínica' : 'Modifica los datos del servicio'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-gray-200 dark:border-gray-700 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Información del Servicio
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
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  if (errors.name) setErrors((err) => ({ ...err, name: undefined }));
                }}
                placeholder="Ej: Consulta general"
                className={errors.name ? 'border-red-300 focus-visible:ring-red-300' : ''}
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Descripción
              </Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe el servicio..."
                rows={3}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Categoría
              </Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Selecciona la categoría para organizar los servicios
              </p>
            </div>

            {/* Duration & Price */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Duración (minutos) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={form.durationMinutes}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, durationMinutes: e.target.value }));
                    if (errors.durationMinutes) setErrors((err) => ({ ...err, durationMinutes: undefined }));
                  }}
                  placeholder="30"
                  className={errors.durationMinutes ? 'border-red-300 focus-visible:ring-red-300' : ''}
                />
                {errors.durationMinutes && <p className="text-sm text-red-600">{errors.durationMinutes}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Precio ($) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, price: e.target.value }));
                    if (errors.price) setErrors((err) => ({ ...err, price: undefined }));
                  }}
                  placeholder="0.00"
                  className={errors.price ? 'border-red-300 focus-visible:ring-red-300' : ''}
                />
                {errors.price && <p className="text-sm text-red-600">{errors.price}</p>}
              </div>
            </div>

            {/* Active Switch */}
            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
              />
              <Label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Servicio activo
              </Label>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {submitting ? 'Guardando...' : mode === 'create' ? 'Crear Servicio' : 'Guardar Cambios'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.visit('/admin/services')}
                disabled={submitting}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}