import { useState } from 'react';
import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
  PawPrint,
  Mail,
  Lock,
  User,
  Phone,
  Loader2,
  CreditCard,
  Clock,
  UserPlus,
  Quote,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

/* ─── Floating geometric shapes (reversed pattern for register) ─── */
function FloatingShapes() {
  const shapes = [
    { type: 'circle', top: '12%', left: '15%', size: 55, opacity: 0.05 },
    { type: 'paw', top: '28%', left: '70%', size: 38, opacity: 0.07 },
    { type: 'circle', top: '50%', left: '30%', size: 70, opacity: 0.04 },
    { type: 'paw', top: '65%', left: '85%', size: 30, opacity: 0.06 },
    { type: 'circle', top: '82%', left: '50%', size: 45, opacity: 0.06 },
    { type: 'paw', top: '40%', left: '60%', size: 26, opacity: 0.04 },
    { type: 'circle', top: '90%', left: '18%', size: 35, opacity: 0.05 },
    { type: 'paw', top: '8%', left: '45%', size: 22, opacity: 0.03 },
  ];

  return (
    <>
      {shapes.map((s, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            top: s.top,
            left: s.left,
            opacity: s.opacity,
          }}
          initial={{ scale: 0, rotate: 0 }}
          animate={{
            scale: 1,
            rotate: s.type === 'circle' ? [0, -360] : [0, -20, 20, 0],
            y: [0, s.type === 'circle' ? 8 : -12, 0],
            x: s.type === 'circle' ? [0, -5, 0] : undefined,
          }}
          transition={{
            scale: { delay: i * 0.12, duration: 0.5 },
            rotate: {
              duration: s.type === 'circle' ? 25 : 10,
              repeat: Infinity,
              ease: 'linear',
            },
            y: { delay: i * 0.3, duration: 4.5 + i * 0.4, repeat: Infinity, ease: 'easeInOut' },
            x: s.type === 'circle'
              ? { delay: i * 0.2, duration: 6 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }
              : undefined,
          }}
        >
          {s.type === 'circle' ? (
            <div
              style={{ width: s.size, height: s.size }}
              className="rounded-full border-2 border-white"
            />
          ) : (
            <PawPrint style={{ width: s.size, height: s.size }} className="text-white" />
          )}
        </motion.div>
      ))}
    </>
  );
}

/* ─── Dot grid particle animation (reversed wave pattern) ─── */
function DotGrid() {
  const cols = 8;
  const rows = 12;
  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push({ r, c, key: `${r}-${c}` });
    }
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="relative w-full h-full" style={{ padding: '10%' }}>
        {dots.map((d, i) => (
          <motion.div
            key={d.key}
            className="absolute rounded-full bg-white"
            style={{
              width: 2,
              height: 2,
              left: `${(d.c / (cols - 1)) * 100}%`,
              top: `${(d.r / (rows - 1)) * 100}%`,
            }}
            animate={{
              opacity: [0.03, 0.1, 0.03],
              scale: [1, 1.8, 1],
            }}
            transition={{
              duration: 3.5,
              delay: (d.c * 0.15) + (d.r * 0.1),
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Shimmer animation overlay ─── */
function ShimmerOverlay() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute inset-0 translate-x-full"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
        }}
        animate={{ x: ['-200%', '0%'] }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: 'linear',
          repeatDelay: 2.5,
        }}
      />
    </div>
  );
}

/* ─── Decorative left panel (register variant — reversed gradient) ─── */
function DecorativePanel() {
  const features = [
    { icon: UserPlus, label: 'Registro gratuito' },
    { icon: CreditCard, label: 'Sin tarjeta de crédito' },
    { icon: Clock, label: 'Agenda en minutos' },
  ];

  return (
    <div className="hidden lg:flex relative w-1/2 bg-gradient-to-br from-teal-700 to-emerald-600 dark:from-teal-900 dark:to-emerald-800 overflow-hidden flex-col justify-between p-12 text-white">
      <FloatingShapes />
      <DotGrid />
      <ShimmerOverlay />

      {/* Radial glow behind main content */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Top: Branding with pulsing paw */}
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <PawPrint className="h-7 w-7 text-white" />
          </motion.div>
          <span className="text-3xl font-extrabold tracking-tight">Zoion</span>
        </div>
        <p className="text-emerald-100 text-lg mt-1">Tu veterinaria de confianza</p>
      </motion.div>

      {/* Middle: Feature bullets */}
      <motion.ul
        className="relative z-10 space-y-5"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <f.icon className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-medium text-emerald-50">{f.label}</span>
          </li>
        ))}
      </motion.ul>

      {/* Bottom: Testimonial */}
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Quote className="h-8 w-8 text-emerald-300/40 mb-2" />
        <p className="text-sm leading-relaxed text-emerald-100 italic">
          "Registrarme fue súper rápido. En menos de 5 minutos ya había agendado la primera
          cita para mi mascota. ¡Totalmente recomendado!"
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
            ML
          </div>
          <div>
            <p className="text-sm font-semibold text-white">María López</p>
            <p className="text-xs text-emerald-200">Cliente, Guadalajara</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Main register page component ─── */
export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    router.post(
      '/register',
      {
        name,
        email,
        phone: phone || undefined,
        password,
        password_confirmation: confirmPassword,
      },
      {
        onError: (errors) => {
          setError(
            errors.email ??
            errors.name ??
            errors.password ??
            errors.phone ??
            'Error al crear la cuenta',
          );
          setIsLoading(false);
        },
        onFinish: () => setIsLoading(false),
      },
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Left decorative panel */}
      <DecorativePanel />

      {/* Right form panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-4 py-12 sm:px-8 bg-background">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {/* Mobile branding with pulsing paw */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <motion.div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 shadow-lg shadow-teal-200 dark:shadow-teal-900/40"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <PawPrint className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground">Crear una cuenta</h1>
            <p className="mt-1 text-sm text-muted-foreground">Únete a Zoion para cuidar de tus mascotas</p>
          </div>

          {/* Desktop heading */}
          <div className="mb-8 hidden lg:block">
            <h1 className="text-3xl font-bold text-foreground">Crear una cuenta</h1>
            <p className="mt-2 text-muted-foreground">Únete a Zoion para cuidar de tus mascotas</p>
          </div>

          {/* Form container with teal glow */}
          <div className="relative">
            {/* Glow effect behind card */}
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-teal-400/20 via-emerald-400/10 to-teal-400/20 blur-lg opacity-0 hover:opacity-100 transition-opacity duration-700" />
            <Card className="relative border-border/60 shadow-xl dark:shadow-2xl dark:shadow-black/20">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl">Registro</CardTitle>
                <CardDescription>Completa tus datos para crear tu cuenta</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
                    >
                      {error}
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Tu nombre"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(45,212,191,0.15)]"
                        required
                        autoComplete="name"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Correo electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="tu@correo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(45,212,191,0.15)]"
                        required
                        autoComplete="email"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Teléfono <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+52 55 1234 5678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(45,212,191,0.15)]"
                        autoComplete="tel"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(45,212,191,0.15)]"
                        required
                        autoComplete="new-password"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Repite tu contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(45,212,191,0.15)]"
                        required
                        autoComplete="new-password"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="mt-2 w-full bg-teal-600 hover:bg-teal-700 text-white font-medium transition-all duration-200 hover:shadow-lg hover:shadow-teal-200/40 dark:hover:shadow-teal-900/30 active:scale-[0.98]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando cuenta...
                      </>
                    ) : (
                      'Crear Cuenta'
                    )}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground">O registra con</span>
                  </div>
                </div>

                {/* OAuth buttons (decorative, disabled) */}
                <div className="grid grid-cols-2 gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full gap-2 opacity-60 cursor-not-allowed transition-all duration-200 focus:ring-2 focus:ring-teal-400/20"
                        disabled
                        type="button"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                        Google
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Próximamente</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full gap-2 opacity-60 cursor-not-allowed transition-all duration-200 focus:ring-2 focus:ring-teal-400/20"
                        disabled
                        type="button"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        GitHub
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Próximamente</TooltipContent>
                  </Tooltip>
                </div>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  ¿Ya tienes una cuenta?{' '}
                  <button
                    onClick={() => router.visit('/login')}
                    className="font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 underline-offset-4 hover:underline transition-colors"
                  >
                    Inicia sesión
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}