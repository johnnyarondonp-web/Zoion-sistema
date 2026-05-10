import { useEffect, useState, useCallback, useRef } from 'react';
import { Bell, Calendar, Info, Sparkles, ShieldCheck, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore, type Notification } from '@/store/notification-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';

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
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'appointment': return <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    case 'reminder':    return <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    case 'welcome':     return <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
    case 'system':      return <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    default:            return <Info className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
  }
}

function getNotificationBg(type: Notification['type'], read: boolean) {
  if (read) return 'bg-transparent';
  switch (type) {
    case 'appointment': return 'bg-emerald-50/60 dark:bg-emerald-950/20';
    case 'reminder':    return 'bg-amber-50/60 dark:bg-amber-950/20';
    case 'welcome':     return 'bg-teal-50/60 dark:bg-teal-950/20';
    case 'system':      return 'bg-blue-50/60 dark:bg-blue-950/20';
    default:            return 'bg-gray-50/60 dark:bg-gray-800/20';
  }
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 rounded-lg p-3 cursor-pointer transition-colors hover:bg-gray-100/80 dark:hover:bg-gray-800/60 ${getNotificationBg(notification.type, notification.read)}`}
      onClick={() => { if (!notification.read) onMarkRead(notification.id); }}
    >
      <div className="mt-0.5 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          {getNotificationIcon(notification.type)}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-tight ${notification.read ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          )}
        </div>
        <p className={`mt-0.5 text-xs leading-relaxed ${notification.read ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
          {notification.message}
        </p>
        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
          {getRelativeTime(notification.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const prevUnreadCount = useRef(unreadCount);
  const [shouldBounce, setShouldBounce] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (unreadCount > prevUnreadCount.current && prevUnreadCount.current >= 0) {
      const t1 = setTimeout(() => setShouldBounce(true), 0);
      const t2 = setTimeout(() => setShouldBounce(false), 1000);
      prevUnreadCount.current = unreadCount;
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  const handleMarkAllRead = useCallback(() => markAllAsRead(), [markAllAsRead]);

  const displayNotifications = notifications.slice(0, 5);
  const hasMore = notifications.length > 5;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notificaciones">
          <motion.div
            animate={shouldBounce ? { y: [0, -6, 0, -3, 0], rotate: [0, -10, 0, 10, 0] } : {}}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <Bell className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </motion.div>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 mr-2">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificaciones</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
            >
              <CheckCheck className="h-3 w-3" />
              Marcar todo como leído
            </button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-96">
          {displayNotifications.length > 0 ? (
            <div className="flex flex-col p-2">
              <AnimatePresence mode="popLayout">
                {displayNotifications.map((n) => (
                  <NotificationItem key={n.id} notification={n} onMarkRead={markAsRead} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                <Bell className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sin notificaciones</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">No tienes notificaciones nuevas</p>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {hasMore && (
          <>
            <Separator />
            <div className="px-4 py-2.5">
              <button
                className="w-full text-center text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                onClick={() => setOpen(false)}
              >
                Ver todas las notificaciones
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}