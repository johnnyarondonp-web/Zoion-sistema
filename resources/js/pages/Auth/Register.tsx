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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';

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
    <>
      <Navbar />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Branding with pulsing paw */}
          <div className="mb-8 flex flex-col items-center">
            <motion.div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 shadow-lg shadow-teal-200 dark:shadow-teal-900/40"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <PawPrint className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground text-center">Crear una cuenta</h1>
            <p className="mt-1 text-sm text-muted-foreground text-center">Únete a Zoion para cuidar de tus mascotas</p>
          </div>

          {/* Form container with teal glow */}
          <div className="relative">
            {/* Glow effect behind card */}
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-teal-400/20 via-emerald-400/10 to-teal-400/20 blur-lg opacity-0 hover:opacity-100 transition-opacity duration-700" />
            <Card className="relative border-border/60 shadow-xl dark:shadow-2xl dark:shadow-black/20">
              <CardHeader className="space-y-1 pb-4 text-center">
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
    </>
  );
}