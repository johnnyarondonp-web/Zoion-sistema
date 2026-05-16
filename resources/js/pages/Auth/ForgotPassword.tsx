import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';

export default function ForgotPassword() {
    const { props } = usePage();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        router.post('/forgot-password', { email }, {
            onSuccess: () => {
                setMessage('Hemos enviado el enlace de recuperación a tu correo.');
                setIsLoading(false);
            },
            onError: (errors) => {
                setError(errors.email || 'Ocurrió un error al procesar tu solicitud.');
                setIsLoading(false);
            }
        });
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
                    <div className="mb-8 flex flex-col items-center">
                        <h1 className="text-2xl font-bold text-foreground text-center">Recuperar contraseña</h1>
                        <p className="mt-1 text-sm text-muted-foreground text-center">
                            Te enviaremos un enlace para restablecer tu cuenta
                        </p>
                    </div>

                    <Card className="border-border/60 shadow-xl">
                        <CardHeader className="space-y-1 pb-4 text-center">
                            <CardTitle className="text-xl">Restablecer</CardTitle>
                            <CardDescription>Ingresa tu correo electrónico</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                {message && (
                                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        {message}
                                    </div>
                                )}
                                {error && (
                                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                                        {error}
                                    </div>
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
                                            className="pl-10"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enviando enlace...
                                        </>
                                    ) : (
                                        'Enviar enlace de recuperación'
                                    )}
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => router.visit('/login')}
                                    className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Volver al inicio de sesión
                                </button>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </>
    );
}
