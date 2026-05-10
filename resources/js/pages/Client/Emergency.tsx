import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Siren,
  Phone,
  MapPin,
  Clock,
  Heart,
  AlertTriangle,
  Droplets,
  Bone,
  Wind,
  Bug,
  ShieldAlert,
  Eye,
  Thermometer,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import ClientLayout from '@/components/layout/ClientLayout';

interface EmergencyClinic {
  name: string;
  phone: string;
  address: string;
  hours: string;
  isPrimary: boolean;
}

interface EmergencyItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  color: string;
  bgColor: string;
}

const emergencyClinics: EmergencyClinic[] = [
  {
    name: 'Clínica Veterinaria Zoion',
    phone: '+58 255-412-3890',
    address: 'Av. Caracas, Portuguesa',
    hours: '24 horas, 7 días',
    isPrimary: true,
  },
  {
    name: 'Hospital Veterinario Central',
    phone: '+58 255-631-7744',
    address: 'Av. José Antonio Páez, Guanare, Portuguesa',
    hours: 'Urgencias: 20:00 - 08:00',
    isPrimary: false,
  },
  {
    name: 'Centro Veterinario de Emergencia',
    phone: '+58 255-724-5501',
    address: 'Calle 23 con Av. Libertador, Acarigua, Portuguesa',
    hours: '24 horas, fines de semana',
    isPrimary: false,
  },
];

const petEmergencies: EmergencyItem[] = [
  {
    icon: <Wind className="h-5 w-5" />,
    title: 'Dificultad respiratoria',
    description: 'Respiración rápida, jadeo excesivo, encías azuladas o tos persistente.',
    action: 'Mantén la calma, abre las vías respiratorias y acude inmediatamente.',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
  },
  {
    icon: <Droplets className="h-5 w-5" />,
    title: 'Hemorragia o sangrado',
    description: 'Sangrado que no se detiene con presión directa después de 5 minutos.',
    action: 'Aplica presión firme con gasa limpia y traslada al veterinario.',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
  },
  {
    icon: <AlertTriangle className="h-5 w-5" />,
    title: 'Intoxicación o envenenamiento',
    description: 'Vómitos, temblores, letargo, babeo excesivo o convulsiones tras ingerir algo tóxico.',
    action: 'No induzcas el vómito. Lleva el envase del tóxico al veterinario.',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    icon: <Bone className="h-5 w-5" />,
    title: 'Fracturas o traumatismos',
    description: 'Cojera severa, deformidad visible, incapacidad de moverse o dolor intenso.',
    action: 'Inmoviliza la zona afectada y transporta con cuidado al veterinario.',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
  },
  {
    icon: <Thermometer className="h-5 w-5" />,
    title: 'Golpe de calor',
    description: 'Temperatura corporal elevada, jadeo extremo, encías rojas, colapso.',
    action: 'Enfría gradualmente con agua tibia (no fría) y acude al veterinario.',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-900/20',
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: 'Problemas oculares graves',
    description: 'Ojo protruyente, sangrado ocular, ojo cerrado con secreción abundante.',
    action: 'No toques el ojo. Cubre con gasa húmeda estéril y acude al veterinario.',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    icon: <Bug className="h-5 w-5" />,
    title: 'Picaduras o mordeduras',
    description: 'Hinchazón repentina, dificultad para respirar, reacción alérgica.',
    action: 'Retira el aguijón si es visible, aplica frío y consulta al veterinario.',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  {
    icon: <ShieldAlert className="h-5 w-5" />,
    title: 'Convulsiones',
    description: 'Movimientos incontrolables, rigidez, pérdida de conciencia.',
    action: 'Aleja objetos peligrosos, no metas las manos en la boca, ve al veterinario.',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export default function Emergency() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-24" />
                  <Separator />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto space-y-6"
    >
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30">
          <Siren className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Emergencias Veterinarias
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Contactos y guía de emergencia para tu mascota
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-red-200 dark:border-red-900/50 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/50 dark:bg-red-900/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-6 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0">
                <Phone className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-red-700 dark:text-red-400">
                  ¿Es una emergencia?
                </h2>
                <p className="text-sm text-red-600/80 dark:text-red-400/70 mt-1">
                  Si tu mascota está en peligro, llama inmediatamente a la clínica de urgencias.
                  No esperes a que los síntomas empeoren.
                </p>
              </div>
              <a href="tel:+34900123456">
                <Button
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30 gap-2"
                >
                  <Phone className="h-5 w-5" />
                  Llamar Ahora
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-emerald-600" />
          Clínicas de Urgencia
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {emergencyClinics.map((clinic) => (
            <Card
              key={clinic.name}
              className={`border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow ${
                clinic.isPrimary ? 'ring-2 ring-emerald-200 dark:ring-emerald-800' : ''
              }`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">
                    {clinic.name}
                  </h3>
                  {clinic.isPrimary && (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                      Principal
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{clinic.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{clinic.hours}</span>
                  </div>
                </div>
                <Separator />
                <a href={`tel:${clinic.phone.replace(/\s/g, '')}`} className="block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 gap-2"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {clinic.phone}
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-red-500" />
          Emergencias Comunes
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {petEmergencies.map((emergency) => (
            <motion.div key={emergency.title} variants={itemVariants}>
              <Card className="border-gray-200 dark:border-gray-700 h-full hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${emergency.bgColor} ${emergency.color} flex-shrink-0`}>
                      {emergency.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {emergency.title}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {emergency.description}
                  </p>
                  <div className={`rounded-lg ${emergency.bgColor} p-2.5`}>
                    <p className={`text-xs font-medium ${emergency.color} flex items-start gap-1.5`}>
                      <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {emergency.action}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Consejos Generales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              'Mantén la calma — tu mascota percibe tu ansiedad.',
              'Ten siempre a mano el teléfono de tu veterinario y de urgencias.',
              'No administres medicamentos humanos sin consulta veterinaria.',
              'Transporta a tu mascota con cuidado, usando una manta como camilla si es necesario.',
              'Mantén un botiquín de primeros auxilios para mascotas en casa.',
              'Conoce la ubicación del hospital veterinario más cercano.',
            ].map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-sm text-amber-900/80 dark:text-amber-300/70">{tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
Emergency.layout = (page: React.ReactNode) => <ClientLayout>{page}</ClientLayout>;