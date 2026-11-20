import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, authApi, TOKEN_KEY } from '@/lib/api'
import { AuthContext } from '@/lib/auth-context'
import type { AuthContextValue } from '@/lib/auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return

    authApi
      .currentUser()
      .then(setUser)
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 401) {
          localStorage.removeItem(TOKEN_KEY)
          return
        }
        setError(cause instanceof Error ? cause.message : 'Unable to verify your session.')
      })
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      login: async (email, password) => {
        setError(null)
        const result = await authApi.login(email, password)
        localStorage.setItem(TOKEN_KEY, result.token)
        setUser(result.user)
      },
      register: async (name, email, password) => {
        setError(null)
        const result = await authApi.register(name, email, password, password)
        localStorage.setItem(TOKEN_KEY, result.token)
        setUser(result.user)
      },
      logout: async () => {
        let failure: unknown
        try {
          if (localStorage.getItem(TOKEN_KEY)) await authApi.logout()
        } catch (cause) {
          failure = cause
        } finally {
          localStorage.removeItem(TOKEN_KEY)
          setUser(null)
        }
        if (failure) throw failure
      },
      clearError: () => setError(null),
    }),
    [error, loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
