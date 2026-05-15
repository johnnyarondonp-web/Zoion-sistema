import { useEffect } from 'react';
import { useNotificationStore } from '@/store/notification-store';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  CheckCheck, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  MessageCircle, 
  Info,
  Trash2,
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

export default function NotificationsPage() {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(50); // Fetch last 50
  }, [fetchNotifications]);

  const handleNotificationClick = (n: any) => {
    if (!n.read) markAsRead(n.id);
    
    const appointmentId = n.data?.appointment_id;
    if (appointmentId) {
      router.visit(`/admin/appointments/${appointmentId}`);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bell className="h-6 w-6 text-emerald-600" />
            Notificaciones
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona tus alertas y avisos del sistema (últimas 50)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => markAllAsRead()}
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como leídas
            </Button>
          )}
        </div>
      </div>

      <Card className="border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Historial de Notificaciones
              {notifications.length > 0 && (
                <Badge variant="secondary" className="bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  {notifications.length}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-280px)] min-h-[400px]">
            {notifications.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <AnimatePresence mode="popLayout">
                  {notifications.map((n, idx) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`group flex items-start gap-4 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer ${!n.read ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${!n.read ? 'bg-white shadow-sm dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-800/50'}`}>
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`text-sm font-semibold ${!n.read ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                            {n.title}
                          </h3>
                          {!n.read && (
                            <Badge className="bg-emerald-500 hover:bg-emerald-500 text-[10px] h-4 px-1.5 border-none">NUEVO</Badge>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed ${!n.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'}`}>
                          {n.message}
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                            <Clock className="h-3 w-3" />
                            {getRelativeTime(n.timestamp)}
                          </span>
                          {!n.read && (
                            <button 
                              className="text-[11px] font-medium text-emerald-600 hover:underline"
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
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Bandeja vacía</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mt-1">
                  No tienes notificaciones en este momento. Las alertas nuevas aparecerán aquí.
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      
      <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900/40">
        <Info className="h-5 w-5 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-400">
          Nota: El sistema mantiene automáticamente las últimas 50 notificaciones para optimizar el rendimiento. Las notificaciones más antiguas se eliminan de forma permanente.
        </p>
      </div>
    </div>
  );
}

NotificationsPage.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
