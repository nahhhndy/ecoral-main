'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@/types'
import { authApi } from '@/lib/api'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } }
})

interface AuthContext {
  user: User | null
  isLoading: boolean
  login: (token: string, refreshToken: string, userData?: User) => Promise<User>
  logout: () => void
}

const AuthCtx = createContext<AuthContext>({
  user: null,
  isLoading: true,
  login: async () => { throw new Error('AuthContext not initialized') },
  logout: () => {},
})

export function useAuth() { return useContext(AuthCtx) }

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      authApi.me().then(setUser).catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setUser(null)
      }).finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])
  
  const login = async (token: string, refreshToken: string, userData?: User): Promise<User> => {
    queryClient.clear()
    localStorage.setItem('access_token', token)
    localStorage.setItem('refresh_token', refreshToken)
    if (userData) {
      setUser(userData)
      setIsLoading(false)
      return userData
    }
    try {
      const fetchedUser = await authApi.me()
      setUser(fetchedUser)
      setIsLoading(false)
      return fetchedUser
    } catch (e) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
      setIsLoading(false)
      queryClient.clear()
      throw e
    }
  }
  
  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
    queryClient.clear()
  }
  
  return <AuthCtx.Provider value={{ user, isLoading, login, logout }}>{children}</AuthCtx.Provider>
}

import { ToastProvider, useToast } from '@/components/ui/ToastProvider'

export { useToast }

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
