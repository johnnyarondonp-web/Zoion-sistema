import { usePage } from '@inertiajs/react'

interface AuthUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'client'
  phone?: string
}

interface PageProps {
  auth: {
    user: AuthUser | null
  }
  [key: string]: unknown
}

export function useAuth() {
  const { auth } = usePage<PageProps>().props
  return {
    user: auth?.user ?? null,
    isAdmin: auth?.user?.role === 'admin',
    isClient: auth?.user?.role === 'client',
    isAuthenticated: !!auth?.user,
  }
}