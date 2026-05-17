import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'pending_appointment' | 'upcoming_appointment' | 'new_appointment' | 'appointment_confirmed' | 'appointment' | 'reminder' | 'welcome' | 'system' | 'new_message';
  read: boolean;
  timestamp: string;
  data?: any;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: (limit?: number) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async (limit?: number) => {
    try {
      const url = limit ? `/api/notifications?limit=${limit}` : '/api/notifications';
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      
      if (!res.ok) throw new Error('Failed to fetch');
      
      const data = await res.json();
      if (data.success) {
        set({
          notifications: data.data.notifications || [],
          unreadCount: data.data.unreadCount || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  },

  markAsRead: async (id: string) => {
    // Actualización optimista: actualizar el estado local sincrónicamente
    set((state) => {
      const updatedNotifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const wasUnread = state.notifications.find((n) => n.id === id)?.read === false;
      return {
        notifications: updatedNotifications,
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });

    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });

      if (!res.ok) throw new Error('Failed to mark as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revertir el estado si la llamada al backend falló
      set((state) => {
        const updatedNotifications = state.notifications.map((n) =>
          n.id === id ? { ...n, read: false } : n
        );
        const wasRead = state.notifications.find((n) => n.id === id)?.read === true;
        return {
          notifications: updatedNotifications,
          unreadCount: wasRead ? state.unreadCount + 1 : state.unreadCount,
        };
      });
    }
  },

  markAllAsRead: async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });

      if (!res.ok) throw new Error('Failed to mark all as read');

      const data = await res.json();
      if (data.success) {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },
}));