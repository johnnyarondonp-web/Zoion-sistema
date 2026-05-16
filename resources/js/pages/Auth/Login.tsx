import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
  PawPrint,
  Mail,
  Lock,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';

/* ─── Main login page component ─── */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const rememberCookie = cookies.find(c => c.startsWith('remember_session='));
    if (rememberCookie) setRemember(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (remember) {
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      document.cookie = `remember_session=true; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    } else {
      document.cookie = 'remember_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }

    router.post(
      '/login',
      { email, password, remember },
      {
        onError: (errors) => {
          setError(errors.email ?? errors.password ?? 'Correo o contraseña incorrectos');
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
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <PawPrint className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground text-center">Bienvenido de vuelta</h1>
            <p className="mt-1 text-sm text-muted-foreground text-center">Inicia sesión en tu cuenta de Zoion</p>
          </div>

          {/* Form container with emerald glow */}
          <div className="relative">
            {/* Glow effect behind card */}
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-emerald-400/20 via-teal-400/10 to-emerald-400/20 blur-lg opacity-0 hover:opacity-100 transition-opacity duration-700" />
            <Card className="relative border-border/60 shadow-xl dark:shadow-2xl dark:shadow-black/20">
              <CardHeader className="space-y-1 pb-4 text-center">
                <CardTitle className="text-xl">Iniciar Sesión</CardTitle>
                <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
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
                    <Label htmlFor="email">Correo electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu@correo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(52,211,153,0.15)]"
                        required
                        autoComplete="email"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Contraseña</Label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(52,211,153,0.15)]"
                        required
                        autoComplete="current-password"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="remember" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                      Recordarme
                    </label>
                  </div>

                  <Button
                    type="submit"
                    className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all duration-200 hover:shadow-lg hover:shadow-emerald-200/40 dark:hover:shadow-emerald-900/30 active:scale-[0.98]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Iniciando sesión...
                      </>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  ¿No tienes una cuenta?{' '}
                  <button
                    onClick={() => router.visit('/register')}
                    className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline-offset-4 hover:underline transition-colors"
                  >
                    Regístrate aquí
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