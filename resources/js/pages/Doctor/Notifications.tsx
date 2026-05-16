import { useEffect } from 'react';
import { useNotificationStore } from '@/store/notification-store';
import DoctorLayout from '@/components/layout/DoctorLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  CheckCheck, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  MessageCircle, 
  Info,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { router } from '@inertiajs/react';

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'ahora mismo';
  if (diffMinutes < 60) return `hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'appointment': return <Calendar className="h-5 w-5 text-emerald-600" />;
    case 'reminder':    return <ShieldCheck className="h-5 w-5 text-amber-600" />;
    case 'welcome':     return <Sparkles className="h-5 w-5 text-teal-600" />;
    case 'new_message': return <MessageCircle className="h-5 w-5 text-violet-600" />;
    case 'system':      return <Info className="h-5 w-5 text-blue-600" />;
    default:            return <Bell className="h-5 w-5 text-gray-600" />;
  }
}

export default function DoctorNotificationsPage() {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(50); // Fetch last 50
  }, [fetchNotifications]);

  const handleNotificationClick = (n: any) => {
    if (!n.read) markAsRead(n.id);
    
    const appointmentId = n.data?.appointment_id;
    if (appointmentId) {
      // Los doctores ven los detalles en su agenda
      router.visit(`/doctor/agenda/${appointmentId}`);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-3 tracking-tight">
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
              <Bell className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            Notificaciones
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Tus avisos y alertas de citas (últimas 50)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => markAllAsRead()}
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-xl font-bold h-10 px-4"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              MARCAR TODAS LEÍDAS
            </Button>
          )}
        </div>
      </div>

      <Card className="border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 py-5 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-3">
              HISTORIAL RECIENTE
              {notifications.length > 0 && (
                <Badge className="bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-none font-bold">
                  {notifications.length}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-320px)] min-h-[450px]">
            {notifications.length > 0 ? (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                <AnimatePresence mode="popLayout">
                  {notifications.map((n, idx) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`group flex items-start gap-4 p-5 transition-all hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer ${!n.read ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 ${!n.read ? 'bg-white shadow-md dark:bg-gray-800 ring-1 ring-emerald-100 dark:ring-emerald-900/30' : 'bg-gray-100 dark:bg-gray-800/50'}`}>
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`text-base font-black tracking-tight ${!n.read ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                            {n.title}
                          </h3>
                          {!n.read && (
                            <Badge className="bg-emerald-500 hover:bg-emerald-500 text-[9px] font-black h-4 px-2 border-none tracking-widest">NUEVO</Badge>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed font-medium ${!n.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'}`}>
                          {n.message}
                        </p>
                        <div className="flex items-center gap-3 pt-1.5">
                          <span className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                            <Clock className="h-3 w-3" />
                            {getRelativeTime(n.timestamp)}
                          </span>
                          {!n.read && (
                            <button 
                              className="text-[11px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(n.id);
                              }}
                            >
                              Marcar como leída
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="h-20 w-20 rounded-[2rem] bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-6">
                  <Bell className="h-10 w-10 text-gray-200 dark:text-gray-700" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Bandeja de entrada vacía</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mt-2 font-medium">
                  No tienes notificaciones pendientes. Te avisaremos cuando tengas nuevas citas asignadas.
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      
      <div className="flex items-center gap-3 p-5 bg-amber-50/50 dark:bg-amber-950/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
        <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
          Para garantizar la rapidez del sistema, solo conservamos tus últimas 50 notificaciones. Las alertas más antiguas se eliminan automáticamente.
        </p>
      </div>
    </div>
  );
}

DoctorNotificationsPage.layout = (page: React.ReactNode) => <DoctorLayout>{page}</DoctorLayout>;
