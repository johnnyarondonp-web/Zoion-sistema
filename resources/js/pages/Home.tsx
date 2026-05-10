import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Navbar } from '@/components/layout/navbar';
import {
  PawPrint, Heart, CalendarCheck, ClipboardList, ArrowRight, Quote,
  Clock, Star, Phone, Mail, MapPin, UserPlus, ListChecks, CalendarClock,
  ArrowUp, Send, Smartphone,
} from 'lucide-react';
import { SiFacebook, SiX, SiInstagram } from 'react-icons/si';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const features = [
  {
    icon: <Heart className="h-7 w-7" />,
    title: 'Gestiona tus mascotas',
    description: 'Registra y administra los perfiles de todas tus mascotas en un solo lugar. Mantén su información siempre actualizada.',
    color: 'text-rose-500',
    bg: 'bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/40 dark:to-rose-900/30',
  },
  {
    icon: <CalendarCheck className="h-7 w-7" />,
    title: 'Agenda citas fácilmente',
    description: 'Reserva citas en segundos. Consulta horarios disponibles y elige el momento perfecto para tu mascota.',
    color: 'text-emerald-500',
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30',
  },
  {
    icon: <ClipboardList className="h-7 w-7" />,
    title: 'Historial completo',
    description: 'Lleva un registro detallado de todas las consultas, tratamientos y vacunas de tus compañeros peludos.',
    color: 'text-amber-500',
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/30',
  },
];

const stats = [
  { value: 500, suffix: '+', label: 'Mascotas Atendidas', icon: <PawPrint className="h-6 w-6" /> },
  { value: 1000, suffix: '+', label: 'Citas Realizadas', icon: <CalendarCheck className="h-6 w-6" /> },
  { value: 5, suffix: '+', label: 'Años de Experiencia', icon: <Clock className="h-6 w-6" /> },
  { value: 98, suffix: '%', label: 'Clientes Satisfechos', icon: <Star className="h-6 w-6" /> },
];

const testimonials = [
  {
    quote: 'Zoion ha cambiado la forma en que cuido a mi perro Max. Ahora tengo todo su historial médico organizado y agenda citas es súper fácil.',
    name: 'Laura Mendoza',
    petName: 'Max',
    petType: 'Golden Retriever',
    rating: 5,
  },
  {
    quote: 'Me encanta poder ver los horarios disponibles y reservar desde mi teléfono. La Dra. Castillo es increíble con mi gata Luna.',
    name: 'Roberto Delgado',
    petName: 'Luna',
    petType: 'Gato Persa',
    rating: 5,
  },
  {
    quote: 'Desde que uso Zoion, ya no se me olvidan las vacunas de mis mascotas. Las notificaciones y el historial son muy útiles.',
    name: 'Carmen Ruiz',
    petName: 'Rocky y Milo',
    petType: 'Bulldog y Beagle',
    rating: 5,
  },
];

const howItWorks = [
  {
    step: 1,
    title: 'Registra a tu mascota',
    description: 'Crea un perfil para tu mascota con su nombre, especie y raza. Es rápido y gratuito.',
    icon: <UserPlus className="h-6 w-6" />,
  },
  {
    step: 2,
    title: 'Elige un servicio',
    description: 'Selecciona el servicio veterinario que necesitas entre nuestra amplia variedad de opciones.',
    icon: <ListChecks className="h-6 w-6" />,
  },
  {
    step: 3,
    title: 'Agenda tu cita',
    description: 'Reserva el horario disponible que mejor te convenga y recibe confirmación instantánea.',
    icon: <CalendarClock className="h-6 w-6" />,
  },
];

const faqs = [
  { question: '¿Cómo registro a mi mascota?', answer: 'Solo necesitas crear una cuenta y completar el perfil de tu mascota con su nombre, especie y raza. Es rápido y gratuito.' },
  { question: '¿Puedo cancelar o reprogramar una cita?', answer: 'Sí, puedes cancelar hasta 24 horas antes de la cita y reprogramar cuando lo necesites, sin costo adicional.' },
  { question: '¿Qué métodos de pago aceptan?', answer: 'Aceptamos efectivo, tarjetas de crédito/débito, transferencia bancaria y pago móvil. El pago se realiza en la clínica el día de la cita.' },
  { question: '¿Es seguro el historial de mi mascota?', answer: 'Toda la información está protegida con encriptación y solo tú y el equipo veterinario tienen acceso.' },
  { question: '¿Ofrecen servicios de emergencia?', answer: 'Sí, contamos con servicio de emergencias 24/7. Llama a nuestra línea de emergencias para atención inmediata.' },
];

interface AnimatedCounterProps {
  value: number;
  suffix: string;
  duration?: number;
}

function AnimatedCounter({ value, suffix, duration = 2 }: AnimatedCounterProps) {
  const initialValue = Math.round(value * 0.7);
  const [count, setCount] = useState(initialValue);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!isInView) return;
    let current = initialValue;
    const end = value;
    const totalSteps = 60;
    const step = Math.max(1, Math.ceil((end - current) / totalSteps));
    const incrementTime = (duration * 1000) / totalSteps;

    const timer = setInterval(() => {
      current += step;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [isInView, value, duration, initialValue]);

  return (
    <span ref={ref} className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-5xl tabular-nums">
      {count}{suffix}
    </span>
  );
}

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section ref={heroRef} className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 dark:from-gray-900 dark:via-gray-950 dark:to-emerald-950/20" />
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <motion.div style={{ y: y1 }} className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 h-[500px] w-[500px] rounded-full bg-emerald-100/60 dark:bg-emerald-900/20 blur-3xl" />
            <motion.div style={{ y: y2 }} className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 h-[400px] w-[400px] rounded-full bg-teal-100/50 dark:bg-teal-900/20 blur-3xl" />
            <motion.div style={{ y: y3 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-cyan-100/30 dark:bg-cyan-900/10 blur-3xl" />
          </div>

          <div className="absolute inset-0 -z-5 overflow-hidden pointer-events-none">
            <motion.svg style={{ y: y2 }} className="absolute top-[10%] left-[8%] h-16 w-16 text-emerald-300/15 dark:text-emerald-700/10 rotate-[-20deg]" viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="65" rx="20" ry="25" /><ellipse cx="25" cy="35" rx="10" ry="12" /><ellipse cx="50" cy="25" rx="10" ry="12" /><ellipse cx="75" cy="35" rx="10" ry="12" /></motion.svg>
            <motion.svg style={{ y: y1 }} className="absolute top-[25%] right-[12%] h-12 w-12 text-teal-300/10 dark:text-teal-700/10 rotate-[30deg]" viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="65" rx="20" ry="25" /><ellipse cx="25" cy="35" rx="10" ry="12" /><ellipse cx="50" cy="25" rx="10" ry="12" /><ellipse cx="75" cy="35" rx="10" ry="12" /></motion.svg>
            <motion.svg style={{ y: y3 }} className="absolute bottom-[20%] left-[15%] h-10 w-10 text-emerald-400/10 dark:text-emerald-600/10 rotate-[15deg]" viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="65" rx="20" ry="25" /><ellipse cx="25" cy="35" rx="10" ry="12" /><ellipse cx="50" cy="25" rx="10" ry="12" /><ellipse cx="75" cy="35" rx="10" ry="12" /></motion.svg>
            <motion.svg style={{ y: y2 }} className="absolute top-[50%] right-[5%] h-14 w-14 text-teal-200/10 dark:text-teal-800/10 rotate-[-45deg]" viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="65" rx="20" ry="25" /><ellipse cx="25" cy="35" rx="10" ry="12" /><ellipse cx="50" cy="25" rx="10" ry="12" /><ellipse cx="75" cy="35" rx="10" ry="12" /></motion.svg>
            <motion.svg style={{ y: y1 }} className="absolute bottom-[10%] right-[25%] h-8 w-8 text-emerald-300/10 dark:text-emerald-700/5 rotate-[60deg]" viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="65" rx="20" ry="25" /><ellipse cx="25" cy="35" rx="10" ry="12" /><ellipse cx="50" cy="25" rx="10" ry="12" /><ellipse cx="75" cy="35" rx="10" ry="12" /></motion.svg>
          </div>

          <motion.div style={{ opacity }} className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
            <div className="flex flex-col items-center text-center">
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl shadow-emerald-200/60 dark:shadow-emerald-900/40">
                <PawPrint className="h-10 w-10 text-white" />
              </motion.div>

              <motion.h1 initial="hidden" animate="visible" variants={fadeInUp} className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl lg:text-6xl">
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Zoion</span>
              </motion.h1>

              <motion.p initial="hidden" animate="visible" variants={fadeInUp} className="mt-4 text-xl font-medium text-teal-700 dark:text-teal-300 sm:text-2xl">Tu veterinaria de confianza</motion.p>

              <motion.p initial="hidden" animate="visible" variants={fadeInUp} className="mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">Gestiona la salud de tus mascotas de forma sencilla. Agenda citas, consulta historiales y mantén todo organizado en una plataforma diseñada para ti.</motion.p>

              <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button size="lg" onClick={() => router.visit('/login')} className="rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white px-8 py-3 text-base font-semibold shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 transition-all hover:shadow-xl hover:shadow-emerald-200/60 dark:hover:shadow-emerald-900/40 hover:scale-[1.02]">
                  Iniciar Sesión <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => router.visit('/register')} className="rounded-full border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-8 py-3 text-base font-semibold hover:scale-[1.02] transition-transform">
                  Registrarse
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Stats Section */}
        <section className="border-t bg-white dark:bg-gray-900/50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, i) => (
                <motion.div key={stat.label} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeInUp} transition={{ delay: i * 0.1 }} className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">{stat.icon}</div>
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-gray-50/50 dark:bg-gray-800/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl">Todo lo que necesitas para cuidarlos</h2>
              <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">Herramientas pensadas para el bienestar de tus mascotas</p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <motion.div key={feature.title} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeInUp} transition={{ delay: i * 0.1 }} className="group relative rounded-xl p-[2px] bg-transparent transition-all duration-300 hover:bg-gradient-to-r hover:from-emerald-300/0 hover:via-emerald-400/60 hover:to-teal-400/0">
                  <Card className="h-full border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-900 group-hover:bg-white dark:group-hover:bg-gray-900">
                    <CardContent className="flex flex-col items-start gap-5 p-7">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${feature.bg} ${feature.color} transition-transform duration-300 group-hover:scale-110`}>{feature.icon}</div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{feature.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{feature.description}</p>
                      </div>
                      <button type="button" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors group/link">Conoce más <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5" /></button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="border-t bg-white dark:bg-gray-900/50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl">¿Cómo funciona?</h2>
              <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">Tres simples pasos para comenzar</p>
            </motion.div>
            <div className="relative grid gap-10 lg:grid-cols-3 lg:gap-8">
              <div className="hidden lg:block absolute top-16 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-0.5 bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200 dark:from-emerald-800 dark:via-emerald-700 dark:to-emerald-800" aria-hidden="true" />
              {howItWorks.map((item, i) => (
                <motion.div key={item.step} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeInUp} transition={{ delay: i * 0.1 }} className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 ring-4 ring-white dark:ring-gray-800 shadow-lg">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white text-lg font-bold shadow-md">{item.step}</div>
                        <div className="text-emerald-600 dark:text-emerald-400 mt-1">{item.icon}</div>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-500 dark:text-gray-400">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="border-t bg-gray-50/50 dark:bg-gray-800/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl">Lo que dicen nuestros clientes</h2>
              <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">Historias reales de familias felices con sus mascotas</p>
            </motion.div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial, i) => (
                <motion.div key={testimonial.name} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeInUp} transition={{ delay: i * 0.1 }}>
                  <Card className="h-full border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500" />
                    <CardContent className="flex flex-col gap-4 p-6">
                      <Quote className="h-8 w-8 text-emerald-300 dark:text-emerald-700" />
                      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 flex-1">&ldquo;{testimonial.quote}&rdquo;</p>
                      <div className="flex items-center gap-1">{Array.from({ length: testimonial.rating }).map((_, j) => (<Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />))}</div>
                      <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-sm font-bold text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-200 dark:ring-emerald-800">{testimonial.name.split(' ').map((p) => p[0]).join('')}</div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{testimonial.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Dueño/a de {testimonial.petName} &bull; {testimonial.petType}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="border-t bg-white dark:bg-gray-900/50">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl">Preguntas frecuentes</h2>
              <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">Todo lo que necesitas saber sobre Zoion</p>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left text-base font-medium text-gray-900 dark:text-gray-100 hover:no-underline hover:text-emerald-600 dark:hover:text-emerald-400">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-800 dark:to-emerald-900 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <svg className="absolute -top-8 -left-8 h-32 w-32 text-emerald-500/20 rotate-[-15deg]" viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="65" rx="20" ry="25" /><ellipse cx="25" cy="35" rx="10" ry="12" /><ellipse cx="50" cy="25" rx="10" ry="12" /><ellipse cx="75" cy="35" rx="10" ry="12" /></svg>
            <svg className="absolute -bottom-6 -right-6 h-24 w-24 text-emerald-500/15 rotate-[30deg]" viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="65" rx="20" ry="25" /><ellipse cx="25" cy="35" rx="10" ry="12" /><ellipse cx="50" cy="25" rx="10" ry="12" /><ellipse cx="75" cy="35" rx="10" ry="12" /></svg>
          </div>
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">¿Listo para comenzar?</h2>
              <p className="mt-3 max-w-xl text-emerald-100">Crea tu cuenta en segundos y empieza a gestionar la salud de tus mascotas con la mejor herramienta.</p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button size="lg" onClick={() => router.visit('/register')} className="rounded-full bg-white text-emerald-700 hover:bg-emerald-50 px-8 py-3 text-base font-semibold shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]">Crear Cuenta Gratis <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Button size="lg" onClick={() => router.visit('/login')} className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 text-base font-semibold shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]">Ya tengo cuenta</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-white dark:bg-gray-900 mt-auto relative">
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
            <motion.button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.95 }} className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 hover:bg-emerald-700 transition-colors" aria-label="Volver arriba"><ArrowUp className="h-4 w-4" /></motion.button>
          </div>
          <div className="mx-auto max-w-7xl px-4 pt-14 pb-12 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/50 dark:border-emerald-800/30 p-6 sm:p-8 mb-12">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center justify-center sm:justify-start gap-2"><Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />Mantente informado</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Recibe consejos de salud para tu mascota y ofertas especiales directamente en tu correo.</p>
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                  <input type="email" placeholder="tu@email.com" className="flex-1 sm:w-56 h-10 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400" />
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-4 gap-1.5 shadow-sm"><Send className="h-3.5 w-3.5" /><span className="hidden sm:inline">Suscribir</span></Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm"><PawPrint className="h-5 w-5" /></div>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Zoion</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tu veterinaria de confianza. Cuidamos la salud de tus mascotas con tecnología y cariño.</p>
                <div className="flex items-center gap-2 mt-1">
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-all duration-200 hover:scale-110" aria-label="Facebook">
                    <SiFacebook className="h-4 w-4" />
                  </button>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-sky-100 hover:text-sky-500 dark:hover:bg-sky-900/30 dark:hover:text-sky-400 transition-all duration-200 hover:scale-110" aria-label="X (Twitter)">
                    <SiX className="h-4 w-4" />
                  </button>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-pink-100 hover:text-pink-600 dark:hover:bg-pink-900/30 dark:hover:text-pink-400 transition-all duration-200 hover:scale-110" aria-label="Instagram">
                    <SiInstagram className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Servicios</h3>
                <ul className="space-y-2.5">
                  {['Consultas', 'Cirugía', 'Vacunación', 'Urgencias'].map((service) => (
                    <li key={service}>
                      <span className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">{service}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Empresa</h3>
                <ul className="space-y-2.5">
                  {['Nosotros', 'Equipo', 'Contacto', 'FAQ'].map((link) => (
                    <li key={link}>
                      <span
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                        onClick={() => {
                          if (link === 'Nosotros') router.visit('/about');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && link === 'Nosotros') router.visit('/about');
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {link}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Contacto</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5">
                    <Phone className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">+58 426 410 1968</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Mail className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">contacto@zoion.vet</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Av Caracas, Portuguesa, Venezuela</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-10 border-t border-gray-200 dark:border-gray-800 pt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-xs text-gray-400 dark:text-gray-500">&copy; {new Date().getFullYear()} Zoion. Todos los derechos reservados.</p>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">Política de Privacidad</span>
                <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">Términos de Servicio</span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}