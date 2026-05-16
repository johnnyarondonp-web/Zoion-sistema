import { useState } from 'react';
import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Mail, Loader2, LogOut, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';

export default function VerifyEmail() {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');

    const handleResend = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus('');

        router.post('/email/verification-notification', {}, {
            onSuccess: () => {
                setStatus('Hemos enviado un nuevo enlace de verificación a tu correo.');
                setIsLoading(false);
            },
            onFinish: () => setIsLoading(false),
        });
    };

    const handleLogout = () => {
        router.post('/logout');
    };

    return (
        <>
            <Navbar />
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12">
                <motion.div
                    className="w-full max-w-md"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="mb-8 flex flex-col items-center">
                        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                            <Mail className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground text-center">Verifica tu correo</h1>
                        <p className="mt-2 text-sm text-muted-foreground text-center px-6">
                            Gracias por registrarte. Por favor verifica tu cuenta haciendo clic en el enlace que enviamos a tu email.
                        </p>
                    </div>

                    <Card className="border-border/60 shadow-xl overflow-hidden">
                        {status && (
                            <div className="bg-emerald-600 px-4 py-2 text-center text-xs font-medium text-white">
                                {status}
                            </div>
                        )}
                        <CardHeader className="text-center">
                            <CardTitle>¿No recibiste el correo?</CardTitle>
                            <CardDescription>Podemos enviarte otro enlace de verificación</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={handleResend}>
                                <Button
                                    type="submit"
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                    Reenviar correo de verificación
                                </Button>
                            </form>

                            <Button
                                variant="outline"
                                onClick={handleLogout}
                                className="w-full gap-2 border-border/60"
                            >
                                <LogOut className="h-4 w-4" />
                                Cerrar sesión
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </>
    );
}
