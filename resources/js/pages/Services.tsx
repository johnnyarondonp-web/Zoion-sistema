import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, PawPrint, Clock, DollarSign, Tag, ArrowRight, X,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: string;
  durationMinutes: number;
  category: string;
  isActive: boolean;
}

const categoryColors: Record<string, string> = {
  consulta:      'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  cirugia:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  cirugía:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  vacunacion:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  vacunación:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  urgencia:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  estetica:      'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  estética:      'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  odontologia:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  odontología:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  laboratorio:   'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};

function getCategoryColor(cat: string) {
  return categoryColors[cat.toLowerCase()] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function Services() {
  const [services, setServices]     = useState<Service[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');

  // Leer categoría desde la URL si viene filtrada (ej: /services?categoria=vacunación)
  const { url } = usePage();
  useEffect(() => {
    const params = new URLSearchParams(url.split('?')[1] ?? '');
    const cat = params.get('categoria') ?? '';
    setActiveCategory(cat);
  }, [url]);

  useEffect(() => {
    fetch('/api/services/public')
      .then(r => r.json())
      .then(data => {
        if (data.success) setServices(data.data.filter((s: Service) => s.isActive));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(services.map(s => s.category))].sort();

  const filtered = services.filter(s => {
    const matchCat  = !activeCategory || s.category.toLowerCase() === activeCategory.toLowerCase();
    const matchText = !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()) ||
                      (s.description ?? '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText;
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/40">
              <PawPrint className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
            Nuestros <span className="text-emerald-600">Servicios</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Explora los servicios veterinarios disponibles. Inicia sesión para reservar una cita.
          </p>
        </div>

        {/* Search + category filters */}
        <div className="space-y-3">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar servicio..."
              className="pl-9 bg-white dark:bg-gray-900"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category pills */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setActiveCategory('')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  !activeCategory
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:text-emerald-600'
                }`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory.toLowerCase() === cat.toLowerCase() ? '' : cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border capitalize ${
                    activeCategory.toLowerCase() === cat.toLowerCase()
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:text-emerald-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Services grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">No se encontraron servicios con esos filtros.</p>
            <button onClick={() => { setSearch(''); setActiveCategory(''); }} className="mt-3 text-sm text-emerald-600 hover:underline">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map(service => (
              <motion.div
                key={service.id}
                variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
              >
                <Card className="h-full border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 bg-white dark:bg-gray-900">
                  <CardContent className="p-5 flex flex-col gap-3 h-full">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">{service.name}</h3>
                      <Badge className={`text-[10px] shrink-0 capitalize ${getCategoryColor(service.category)}`}>
                        {service.category}
                      </Badge>
                    </div>
                    {service.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed flex-1">{service.description}</p>
                    )}
                    <div className="flex items-center gap-3 pt-1 border-t border-gray-100 dark:border-gray-800 mt-auto">
                      <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        <DollarSign className="h-3.5 w-3.5" />
                        {parseFloat(service.price).toFixed(2)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatDuration(service.durationMinutes)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => router.visit('/login')}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1 mt-1"
                    >
                      Reservar cita <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Count */}
        {!loading && filtered.length > 0 && (
          <p className="text-center text-xs text-gray-400 dark:text-gray-600">
            {filtered.length} servicio{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </main>
    </div>
  );
}
