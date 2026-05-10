import { useEffect, useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import ClientLayout from '@/components/layout/ClientLayout';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, X } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  photo: string | null;
  isActive: boolean;
}

const speciesEmojis: Record<string, string> = {
  perro: '🐕',
  gato: '🐈',
  ave: '🐦',
  reptil: '🦎',
  conejo: '🐰',
  hámster: '🐹',
  hamster: '🐹',
  pez: '🐠',
  serpiente: '🐍',
  otro: '🐾',
};

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

const speciesAccentColors: Record<string, string> = {
  perro: 'from-amber-400 to-amber-500',
  gato: 'from-purple-400 to-purple-500',
  ave: 'from-sky-400 to-sky-500',
  reptil: 'from-lime-400 to-lime-500',
  conejo: 'from-pink-400 to-pink-500',
  hámster: 'from-orange-400 to-orange-500',
  hamster: 'from-orange-400 to-orange-500',
  pez: 'from-cyan-400 to-cyan-500',
  serpiente: 'from-emerald-400 to-emerald-500',
  otro: 'from-gray-400 to-gray-500',
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
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');

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

    if (speciesFilter && speciesFilter !== 'all') {
      result = result.filter((pet) => pet.species.toLowerCase() === speciesFilter);
    }

    return result;
  }, [pets, search, speciesFilter]);

  // Get unique species from pets for the filter
  const availableSpecies = useMemo(() => {
    const speciesSet = new Set(pets.map((p) => p.species.toLowerCase()));
    return Array.from(speciesSet).sort();
  }, [pets]);

  const clearFilters = () => {
    setSearch('');
    setSpeciesFilter('all');
  };

  const hasActiveFilters = search.trim() !== '' || speciesFilter !== 'all';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <Skeleton className="h-16 w-16 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis Mascotas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestiona los perfiles de tus mascotas</p>
        </div>
        <Button
          onClick={() => router.visit('/client/pets/new')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Mascota
        </Button>
      </div>

      {/* Filters */}
      {pets.length > 0 && (
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtros</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-500 dark:text-gray-400 h-7">
                  Limpiar filtros
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="relative sm:col-span-2 lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o raza..."
                  className="pl-9 h-9 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-emerald-400 focus:ring-emerald-400/20"
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

              {/* Species Filter */}
              <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
                <SelectTrigger className="h-9 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Especie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las especies</SelectItem>
                  {availableSpecies.map((sp) => (
                    <SelectItem key={sp} value={sp}>
                      {speciesEmojis[sp] || '🐾'} {speciesLabels[sp] || sp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Results count */}
              <div className="flex items-center h-9 px-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredPets.length} {filteredPets.length === 1 ? 'mascota' : 'mascotas'}
                  {hasActiveFilters && (
                    <span> de {pets.length}</span>
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
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
                <span className="text-5xl">🐾</span>
              </div>
            </motion.div>
            {/* Decorative small circles */}
            <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-amber-200 dark:bg-amber-800/40 flex items-center justify-center text-xs">
              🐕
            </div>
            <div className="absolute -bottom-1 -left-3 h-6 w-6 rounded-full bg-purple-200 dark:bg-purple-800/40 flex items-center justify-center text-xs">
              🐈
            </div>
            <div className="absolute top-1/2 -right-5 h-5 w-5 rounded-full bg-sky-200 dark:bg-sky-800/40 flex items-center justify-center text-[10px]">
              🐦
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
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredPets.map((pet) => {
            const sp = pet.species.toLowerCase();
            const emoji = speciesEmojis[sp] || speciesEmojis.otro;
            const color = speciesColors[sp] || speciesColors.otro;
            const label = speciesLabels[sp] || pet.species;
            const accent = speciesAccentColors[sp] || speciesAccentColors.otro;

            return (
              <motion.div key={pet.id} variants={cardVariants} layout>
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className="cursor-pointer border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg transition-all duration-300 overflow-hidden group"
                    onClick={() => router.visit(`/client/pets/${pet.id}`)}
                  >
                    {/* Top gradient accent line */}
                    <div className={`h-1 bg-gradient-to-r ${accent}`} />
                    <CardContent className="p-4 pt-3">
                      <div className="flex items-center gap-4">
                        {/* Photo or Emoji Icon */}
                        {pet.photo ? (
                          <div className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-gray-100 dark:ring-gray-700 group-hover:ring-emerald-200 dark:group-hover:ring-emerald-700 transition-all duration-300">
                            <img
                              src={pet.photo}
                              alt={pet.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className={`flex h-16 w-16 items-center justify-center rounded-xl flex-shrink-0 border ${color} transition-all duration-300 group-hover:scale-105`}>
                            <span className="text-2xl">{emoji}</span>
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">{pet.name}</h3>
                            <Badge
                              variant={pet.isActive ? 'default' : 'secondary'}
                              className={
                                pet.isActive
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 text-xs'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 text-xs'
                              }
                            >
                              {pet.isActive ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            <span className="inline-flex items-center gap-1">
                              <span className="text-xs">{emoji}</span>
                              {label}
                            </span>
                            {pet.breed ? ` · ${pet.breed}` : ''}
                          </p>
                        </div>
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