import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router'
import { LoadingState } from '@/components/ui'
import { useAuth } from '@/lib/use-auth'

export function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingState />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user?.role === 'admin' ? children : <Navigate to="/" replace />
}
