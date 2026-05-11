'use client';
import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Pencil,
  Stethoscope,
  Syringe,
  Scissors,
  ShieldCheck,
  Activity,
  ScanLine,
  HeartPulse,
  DollarSign,
  Star,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import ClientLayout from '@/components/layout/ClientLayout';

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  category: string | null;
  isActive: boolean;
}

const categoryConfig: Record<string, { label: string; emoji: string; badgeClass: string; gradient: string }> = {
  consulta: { label: 'Consulta', emoji: '🩺', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', gradient: 'from-emerald-500 to-teal-500' },
  cirugia: { label: 'Cirugía', emoji: '🔪', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', gradient: 'from-red-500 to-rose-500' },
  estetica: { label: 'Estética', emoji: '✂️', badgeClass: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400', gradient: 'from-pink-500 to-fuchsia-500' },
  diagnostico: { label: 'Diagnóstico', emoji: '🔬', badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', gradient: 'from-sky-500 to-blue-500' },
  prevencion: { label: 'Prevención', emoji: '🛡️', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', gradient: 'from-amber-500 to-orange-500' },
};

const popularKeywords = ['consulta', 'vacuna', 'desparasitación', 'estética'];

function getServiceIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('consulta') || lower.includes('revisión')) return Stethoscope;
  if (lower.includes('vacuna') || lower.includes('vacunación')) return Syringe;
  if (lower.includes('estética') || lower.includes('grooming') || lower.includes('peluquería')) return Scissors;
  if (lower.includes('desparasit') || lower.includes('desparasitación')) return ShieldCheck;
  if (lower.includes('cirugía') || lower.includes('cirugia') || lower.includes('operación')) return Activity;
  if (lower.includes('radiograf') || lower.includes('rayos x') || lower.includes('diagnóstic')) return ScanLine;
  if (lower.includes('cardiolog') || lower.includes('corazón')) return HeartPulse;
  return Stethoscope;
}

function getCategoryBadge(cat: string | null) {
  if (!cat) return { label: 'Sin categoría', emoji: '📋', badgeClass: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', gradient: 'from-gray-400 to-gray-500' };
  return categoryConfig[cat] || { label: cat, emoji: '📋', badgeClass: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', gradient: 'from-gray-400 to-gray-500' };
}

function isPopularService(name: string): boolean {
  const lower = name.toLowerCase();
  return popularKeywords.some(kw => lower.includes(kw));
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.04, duration: 0.35, ease: 'easeOut' as const },
  }),
};

const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services?all=true', {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      const data = await res.json();
      if (data.success) {
        setServices(data.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (service: Service) => {
    setTogglingId(service.id);
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      const data = await res.json();
      if (data.success) {
        setServices((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, isActive: !s.isActive } : s))
        );
        toast.success(
          service.isActive
            ? `"${service.name}" desactivado`
            : `"${service.name}" activado`
        );
      } else {
        toast.error(data.error || 'Error al cambiar estado');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setTogglingId(null);
    }
  };

  const categories = Array.from(new Set(services.map(s => s.category || 'sin-categoria')));

  const filteredServices = activeCategory === 'all'
    ? services
    : activeCategory === 'sin-categoria'
      ? services.filter(s => !s.category)
      : services.filter(s => s.category === activeCategory);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Servicios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestiona los servicios de la clínica</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'cards' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'table' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Tabla
            </button>
          </div>
          <Button
            onClick={() => router.visit('/admin/services/new')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Servicio
          </Button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      {services.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeCategory === 'all'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            Todas ({services.length})
          </button>
          {categories.map(cat => {
            const catInfo = getCategoryBadge(cat === 'sin-categoria' ? null : cat);
            const count = cat === 'sin-categoria'
              ? services.filter(s => !s.category).length
              : services.filter(s => s.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  activeCategory === cat
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                <span>{catInfo.emoji}</span>
                {catInfo.label}
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Card View */}
      {viewMode === 'cards' && filteredServices.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service, index) => {
            const catInfo = getCategoryBadge(service.category);
            const ServiceIcon = getServiceIcon(service.name);
            const popular = isPopularService(service.name);
            return (
              <motion.div
                key={service.id}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Card className="border-gray-200 dark:border-gray-700 overflow-hidden relative group hover:shadow-lg transition-shadow duration-300">
                  {/* Top gradient line */}
                  <div className={`h-1 bg-gradient-to-r ${catInfo.gradient}`} />
                  {!service.isActive && (
                    <div className="absolute inset-0 bg-gray-50/60 dark:bg-gray-900/40 z-10" />
                  )}

                  {/* Popular badge */}
                  {popular && service.isActive && (
                    <div className="absolute top-3 right-3 z-20">
                      <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] gap-0.5 shadow-sm border-0">
                        <Star className="h-3 w-3 fill-current" />
                        Popular
                      </Badge>
                    </div>
                  )}

                  <CardContent className="p-5">
                    {/* Icon + Name */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${catInfo.gradient} text-white shadow-sm flex-shrink-0`}>
                        <ServiceIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{service.name}</h3>
                        <Badge className={`${catInfo.badgeClass} text-[10px] gap-0.5 mt-1`}>
                          {catInfo.emoji} {catInfo.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Description */}
                    {service.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                        {service.description}
                      </p>
                    )}

                    {/* Price + Duration */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold shadow-sm">
                        <DollarSign className="h-3.5 w-3.5" />
                        {Number(service.price).toFixed(2)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        {service.durationMinutes} min
                      </div>
                    </div>

                    {/* Status + Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/50">
                      {/* Active/Inactive Toggle */}
                      <button
                        onClick={() => handleToggleActive(service)}
                        disabled={togglingId === service.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 ${
                          service.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                        } ${togglingId === service.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            service.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.visit(`/admin/services/${service.id}/edit`)}
                          className="text-gray-500 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 h-8 px-2"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && filteredServices.length > 0 && (
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Servicio</th>
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Categoría</th>
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Duración</th>
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Precio</th>
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Estado</th>
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((service, index) => {
                    const catInfo = getCategoryBadge(service.category);
                    const ServiceIcon = getServiceIcon(service.name);
                    const popular = isPopularService(service.name);
                    return (
                      <motion.tr
                        key={service.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.25 }}
                        className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors ${
                          !service.isActive ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${catInfo.gradient} text-white flex-shrink-0`}>
                              <ServiceIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{service.name}</span>
                                {popular && service.isActive && (
                                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${catInfo.badgeClass} text-[10px] gap-0.5`}>
                            {catInfo.emoji} {catInfo.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{service.durationMinutes} min</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold">
                            <DollarSign className="h-3 w-3" />
                            {Number(service.price).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(service)}
                            disabled={togglingId === service.id}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 ${
                              service.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <span
                              className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200"
                              style={{ transform: service.isActive ? 'translateX(18px)' : 'translateX(2px)' }}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.visit(`/admin/services/${service.id}/edit`)}
                              className="text-gray-600 dark:text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 dark:bg-emerald-900/30 h-8 px-2"
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Editar
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {filteredServices.length === 0 && (
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 mb-4">
              <Stethoscope className="h-10 w-10 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No hay servicios</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-4">
              Crea el primer servicio para comenzar a gestionar las citas de la clínica.
            </p>
            <Button
              onClick={() => router.visit('/admin/services/new')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Servicio
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
Services.layout = (page: React.ReactNode) => <ClientLayout>{page}</ClientLayout>;