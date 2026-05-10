import { useEffect } from 'react'
import { router } from '@inertiajs/react'
import { useAuth } from '@/hooks/use-auth'

interface RouteGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function RouteGuard({ children, requireAdmin = false }: RouteGuardProps) {
  const { isAuthenticated, isAdmin } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      router.visit('/login')
      return
    }
    if (requireAdmin && !isAdmin) {
      router.visit('/home')
    }
  }, [isAuthenticated, isAdmin, requireAdmin])

  if (!isAuthenticated) return null
  if (requireAdmin && !isAdmin) return null

  return <>{children}</>
}