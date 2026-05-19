import { useEffect, useState, useMemo } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import ClientLayout from '@/components/layout/ClientLayout';

import { Plus, Search, Filter, X, PawPrint, Dog, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  photo: string | null;
  isActive: boolean;
}


const speciesColors: Record<string, string> = {
  perro: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40',
  gato: 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200/60 dark:border-purple-800/40',
  ave: 'bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400 border-sky-200/60 dark:border-sky-800/40',
  reptil: 'bg-lime-50 text-lime-600 dark:bg-lime-950/30 dark:text-lime-400 border-lime-200/60 dark:border-lime-800/40',
  conejo: 'bg-pink-50 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400 border-pink-200/60 dark:border-pink-800/40',
  hámster: 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200/60 dark:border-orange-800/40',
  hamster: 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200/60 dark:border-orange-800/40',
  pez: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400 border-cyan-200/60 dark:border-cyan-800/40',
  serpiente: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40',
  otro: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200/60 dark:border-gray-700/40',
};

const speciesLabels: Record<string, string> = {
  perro: 'Perro',
  gato: 'Gato',
  ave: 'Ave',
  reptil: 'Reptil',
  conejo: 'Conejo',
  hámster: 'Hámster',
  hamster: 'Hámster',
  pez: 'Pez',
  serpiente: 'Serpiente',
  otro: 'Otro',
};

const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    transition: { 
      duration: 0.35, 
      ease: [0.25, 0.46, 0.45, 0.94] as const 
    } 
  },
};

export default function Pets() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const user = usePage().props.auth.user as { name: string; email: string };
  const todayDate = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const capitalizedDate = todayDate.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    try {
      const res = await fetch('/api/pets');
      const data = await res.json();
      if (data.success) {
        setPets(data.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering
  const filteredPets = useMemo(() => {
    let result = pets;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (pet) =>
          pet.name.toLowerCase().includes(q) ||
          (pet.breed && pet.breed.toLowerCase().includes(q))
      );
    }
    return result;
  }, [pets, search]);

  const clearFilters = () => {
    setSearch('');
  };

  const hasActiveFilters = search.trim() !== '';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-gray-200 dark:border-gray-700">
              <Skeleton className="aspect-square w-full rounded-t-xl" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Dog className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          Mis Mascotas
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestiona los perfiles de tus mascotas</p>
      </div>

      {/* Hero Welcome (Premium Banner) */}
      <Card className="bg-emerald-600 dark:bg-emerald-800 text-white border-none shadow-md overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <PawPrint className="w-24 h-24 text-white transform rotate-12 translate-x-4 -translate-y-4" />
        </div>
        <CardContent className="p-4 sm:p-5 relative z-10 flex flex-col justify-center min-h-[90px]">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              ¡Bienvenido, {user.name.split(' ')[0]}!
            </h1>
          </div>
          <p className="text-sm font-medium text-emerald-50 opacity-90">
            {capitalizedDate}
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => router.visit('/client/pets/new')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Mascota
        </Button>
      </div>

      {/* Filters (Compact) */}
      {pets.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 bg-gray-50/50 dark:bg-gray-800/20 p-2 rounded-xl border border-gray-100 dark:border-gray-800 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar mascota..."
              className="pl-8 h-9 text-xs bg-white dark:bg-gray-900 border-none shadow-sm focus:ring-1 focus:ring-emerald-400/30"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center px-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {filteredPets.length} {filteredPets.length === 1 ? 'mascota' : 'mascotas'}
            </span>
          </div>
        </div>
      )}

      {/* Empty State - No pets at all */}
      {pets.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          {/* Illustration-like SVG */}
          <div className="relative mb-8">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/50 dark:border-emerald-800/30 shadow-xl shadow-emerald-100/50 dark:shadow-emerald-950/30">
                <PawPrint className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
              </div>
            </motion.div>
            {/* Decorative small circles */}
            <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-amber-200 dark:bg-amber-800/40 flex items-center justify-center text-xs">
              <PawPrint className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="absolute -bottom-1 -left-3 h-6 w-6 rounded-full bg-purple-200 dark:bg-purple-800/40 flex items-center justify-center text-xs">
              <PawPrint className="h-3 w-3 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="absolute top-1/2 -right-5 h-5 w-5 rounded-full bg-sky-200 dark:bg-sky-800/40 flex items-center justify-center text-[10px]">
              <PawPrint className="h-2 w-2 text-sky-600 dark:text-sky-400" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No tienes mascotas registradas</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
            Registra a tu primera mascota para poder agendar citas y llevar un historial completo de su salud.
          </p>
          <Button
            onClick={() => router.visit('/client/pets/new')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Registrar Mascota
          </Button>
        </motion.div>
      )}

      {/* Filtered Empty State */}
      {pets.length > 0 && filteredPets.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800 mb-4">
            <Search className="h-10 w-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin resultados</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mb-4">
            No se encontraron mascotas que coincidan con los filtros aplicados
          </p>
          <Button
            variant="outline"
            onClick={clearFilters}
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            Limpiar filtros
          </Button>
        </motion.div>
      )}

      {/* Pet Grid */}
      {filteredPets.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          {filteredPets.map((pet) => {
            const sp = pet.species.toLowerCase();
            const label = speciesLabels[sp] || pet.species;

            return (
              <motion.div key={pet.id} variants={cardVariants} layout>
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <Card
                    className="cursor-pointer border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg transition-all duration-300 overflow-hidden group h-full flex flex-col"
                    onClick={() => router.visit(`/client/pets/${pet.id}`)}
                  >
                    {/* Foto ocupa todo el ancho arriba */}
                    <div className="aspect-square w-full overflow-hidden rounded-t-xl bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                      {pet.photo 
                        ? (
                          <img 
                            src={pet.photo} 
                            alt={pet.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        )
                        : (
                          <div className="h-full w-full flex items-center justify-center">
                            <PawPrint className="h-10 w-10 text-gray-400" />
                          </div>
                        )
                      }
                    </div>

                    {/* Info abajo */}
                    <CardContent className="p-3 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                            {pet.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {label}{pet.breed ? ` · ${pet.breed}` : ''}
                          </p>
                        </div>
                        <Badge
                          variant={pet.isActive ? 'default' : 'secondary'}
                          className={
                            pet.isActive
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 text-[10px] px-1.5 h-5 flex-shrink-0 border-none'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 text-[10px] px-1.5 h-5 flex-shrink-0 border-none'
                          }
                        >
                          {pet.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

Pets.layout = (page: React.ReactNode) => <ClientLayout>{page}</ClientLayout>;