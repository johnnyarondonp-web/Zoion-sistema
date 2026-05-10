import { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
  MapPin, Phone, Mail, Clock, PawPrint, Heart, Stethoscope,
  Award, Users, Shield, Lightbulb, Send, Loader2, CheckCircle2,
  Sparkles, Target, HandHeart,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/layout/navbar';
import { toast } from 'sonner';

// ✅ ANIMACIONES OPTIMIZADAS (200ms - 300ms con Ease-Out)
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const clinicInfo = {
  address: 'Av Caracas, Portuguesa, Venezuela',
  phone: '+58 426 410 1968',
  email: 'contacto@zoionvet.com',
  hours: [
    { day: 'Lunes - Viernes', time: '9:00 AM - 7:00 PM' },
    { day: 'Sábado', time: '9:00 AM - 3:00 PM' },
    { day: 'Domingo', time: 'Cerrado' },
  ],
};

// ✅ EQUIPO ACTUALIZADO
const team = [
  {
    name: 'Dr. Johnny Rondón',
    role: 'Veterinaria General',
    specialty: 'Medicina interna y diagnóstico',
    bio: 'Con más de 10 años de experiencia, el Dr. Rondón se especializa en medicina interna felina y canina, brindando un diagnóstico preciso y trato humano.',
    gradient: 'from-emerald-400 to-teal-500',
    initials: 'JR',
  },
  {
    name: 'Dra. Isneida Castillo',
    role: 'Cirujano Veterinario',
    specialty: 'Cirugía y traumatología',
    bio: 'Especialista en cirugía de tejidos blandos y ortopedia. Certificada y apasionada por la recuperación funcional de nuestros pacientes.',
    gradient: 'from-sky-400 to-blue-500',
    initials: 'IC',
  },
  {
    name: 'Dra. Genesis Quero',
    role: 'Dermatología Veterinaria',
    specialty: 'Piel y alergias',
    bio: 'Experta en dermatología veterinaria con enfoque en alergias y enfermedades cutáneas. Utiliza las últimas tecnologías para el cuidado de la piel.',
    gradient: 'from-rose-400 to-pink-500',
    initials: 'GQ',
  },
  {
    name: 'Dr. Jesús Molina',
    role: 'Medicina Preventiva',
    specialty: 'Vacunación y bienestar',
    bio: 'Especialista en medicina preventiva y programas de vacunación. Dedicado a la educación de los dueños para un cuidado proactivo.',
    gradient: 'from-amber-400 to-orange-500',
    initials: 'JM',
  },
];

const values = [
  {
    icon: Heart,
    title: 'Compasión',
    description: 'Tratamos a cada mascota como si fuera nuestra, con cariño y respeto.',
    color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  },
  {
    icon: Shield,
    title: 'Integridad',
    description: 'Siempre honestos y transparentes en cada diagnóstico y tratamiento.',
    color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    icon: Lightbulb,
    title: 'Innovación',
    description: 'Tecnología de vanguardia para el mejor cuidado de tu mascota.',
    color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    icon: Target,
    title: 'Excelencia',
    description: 'Estándares de calidad que nos impulsan a superar expectativas.',
    color: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  },
  {
    icon: HandHeart,
    title: 'Empatía',
    description: 'Entendemos el vínculo especial entre tú y tu mascota.',
    color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  },
  {
    icon: Users,
    title: 'Trabajo en Equipo',
    description: 'Colaboramos para brindarte la mejor atención integral.',
    color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  },
];

const statsData = [
  { value: 5000, suffix: '+', label: 'Mascotas atendidas', emoji: '🐾' },
  { value: 15, suffix: '+', label: 'Años de experiencia', emoji: '⭐' },
  { value: 98, suffix: '%', label: 'Clientes satisfechos', emoji: '💚' },
  { value: 4, suffix: '', label: 'Veterinarios expertos', emoji: '👨‍⚕️' },
];

// Animated counter component
function AnimatedCounter({ value, suffix, duration = 1200 }: { value: number; suffix: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * value));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <div ref={ref} className="tabular-nums">
      {count.toLocaleString()}{suffix}
    </div>
  );
}

export default function About() {
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error('Por favor completa todos los campos');
      return;
    }
    setSendingMessage(true);
    setTimeout(() => {
      toast.success('¡Mensaje enviado! Nos pondremos en contacto pronto.');
      setContactForm({ name: '', email: '', message: '' });
      setSendingMessage(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Navbar />
      
      <main className="flex-1 mx-auto max-w-5xl space-y-12 pb-8 px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header - Animación optimizada a 0.25s */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="text-center"
        >
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30">
              <PawPrint className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl">
            Sobre <span className="text-emerald-600">Zoion</span>
          </h1>
          <p className="mt-3 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Somos una clínica veterinaria comprometida con la salud y bienestar de tus mascotas.
            Nuestro equipo de profesionales está listo para brindarles la mejor atención.
          </p>
        </motion.div>

        {/* Mission */}
        <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
          <Card className="border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
            <CardContent className="p-8 text-center">
              <Heart className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Nuestra Misión
              </h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                En Zoion, creemos que cada mascota merece atención médica de calidad con un trato
                amoroso. Nuestra misión es proporcionar servicios veterinarios integrales, accesibles
                y con la tecnología más avanzada, para que tú y tus compañeros peludos vivan felices
                y saludables.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Animated Stats */}
        <motion.div custom={1} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statsData.map((stat) => (
              <Card key={stat.label} className="overflow-hidden group relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-5 text-center">
                  <div className="text-2xl mb-2">{stat.emoji}</div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} duration={1500} />
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Our Values */}
        <div>
          <motion.div custom={2} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6 text-emerald-500" />
              Nuestros Valores
            </h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Los principios que guían nuestra práctica diaria
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((val, i) => {
              const Icon = val.icon;
              return (
                <motion.div key={val.title} custom={i + 3} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
                  <Card className="h-full hover:shadow-lg transition-all duration-300 group">
                    <CardContent className="p-6">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${val.color} mb-4 group-hover:scale-110 transition-transform duration-200`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{val.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{val.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Team Section */}
        <div>
          <motion.div custom={9} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl flex items-center justify-center gap-2">
              👨‍⚕️ Nuestro Equipo
            </h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Profesionales dedicados al bienestar de tus mascotas
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2">
            {team.map((member, i) => (
              <motion.div key={member.name} custom={i + 10} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 overflow-hidden group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${member.gradient} shadow-md text-white font-bold text-lg group-hover:scale-105 transition-transform duration-200`}>
                        {member.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{member.name}</h4>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{member.role}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Stethoscope className="h-3 w-3 text-gray-400" />
                          <p className="text-xs text-gray-500 dark:text-gray-400">{member.specialty}</p>
                        </div>
                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{member.bio}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Contact & Hours */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Contact Info */}
          <motion.div custom={14} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <Card className="h-full">
              <CardContent className="p-6 space-y-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Contacto y Ubicación
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                      <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Dirección</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{clinicInfo.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                      <Phone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Teléfono</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{clinicInfo.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                      <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Correo electrónico</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{clinicInfo.email}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Hours */}
          <motion.div custom={15} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <Card className="h-full">
              <CardContent className="p-6 space-y-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Horario de Atención
                </h3>

                <div className="space-y-3">
                  {clinicInfo.hours.map((item) => (
                    <div key={item.day} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.day}</span>
                      <span className={`text-sm font-medium ${item.time === 'Cerrado' ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    🚨 Emergencias: Disponibles 24/7. Llama al {clinicInfo.phone}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Contact Form */}
        <motion.div custom={16} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
          <Card className="border-emerald-100 dark:border-emerald-800/30">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="flex justify-center mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                    <Mail className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Contáctanos</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  ¿Tienes preguntas? Envíanos un mensaje y te responderemos pronto
                </p>
              </div>

              <form onSubmit={handleContactSubmit} className="max-w-lg mx-auto space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nombre
                    </Label>
                    <input
                      id="contact-name"
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      className="flex h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Correo
                    </Label>
                    <input
                      id="contact-email"
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      className="flex h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-message" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mensaje
                  </Label>
                  <textarea
                    id="contact-message"
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    rows={4}
                    className="flex w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 resize-none"
                    placeholder="Escribe tu mensaje..."
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={sendingMessage}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                  >
                    {sendingMessage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar Mensaje
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

   
      </main>
    </div>
  );
}