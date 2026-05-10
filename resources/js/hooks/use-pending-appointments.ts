import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';

export function usePendingAppointments() {
  const { isAuthenticated, isAdmin } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Solo fetchear si está autenticado y NO es admin
    if (!isAuthenticated || isAdmin) {
      setLoading(false);
      return;
    }

    const getCsrfToken = () => 
      document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    const fetchPending = async () => {
      try {
        const res = await fetch('/api/appointments?limit=100', {
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': getCsrfToken(),
          },
        });
        const data = await res.json();
        if (data.success) {
          const pending = (data.data.appointments || []).filter(
            (apt: { status: string }) => apt.status === 'pending'
          ).length;
          setPendingCount(pending);
        }
      } catch {
        // Silent fail - no romper la UI
      } finally {
        setLoading(false);
      }
    };

    // Fetch inmediato + intervalo cada 30s
    fetchPending();
    const interval = setInterval(fetchPending, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isAdmin]);

  return { pendingCount, loading };
}