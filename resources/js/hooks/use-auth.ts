import { usePage } from '@inertiajs/react'

interface AuthUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'client' | 'doctor'
  phone?: string
  specialty?: string
}

interface PageProps {
  auth: {
    user: AuthUser | null;
    unreadMessages: number;
  }
  [key: string]: unknown
}

export function useAuth() {
  const { auth } = usePage<PageProps>().props
  return {
    user: auth?.user ?? null,
    isAdmin: auth?.user?.role === 'admin',
    isClient: auth?.user?.role === 'client',
    isDoctor: auth?.user?.role === 'doctor',
    isAuthenticated: !!auth?.user,
    unreadMessages: auth?.unreadMessages ?? 0,
  }
}