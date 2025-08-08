"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authService, type User } from '@/lib/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  googleLogin: (token: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user && !!authService.getToken()

  // Initialize auth state
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      const token = authService.getToken()
      const storedUser = authService.getUser()

      if (token && storedUser) {
        // Verify token is still valid by fetching current user
        try {
          const currentUser = await authService.getCurrentUser()
          setUser(currentUser)
          // Update stored user data if it changed
          localStorage.setItem('auth_user', JSON.stringify(currentUser))
        } catch (error) {
          // Token is invalid, clear auth data
          console.warn('Token validation failed:', error)
          authService.logout()
          setUser(null)
        }
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      await authService.login({ email, password })
      const user = authService.getUser()
      setUser(user)
      
      // Redirect based on user type
      if (user?.user_type === 'service_provider') {
        router.push('/providers/dashboard')
      } else {
        router.push('/services')
      }
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  const googleLogin = async (token: string) => {
    try {
      setLoading(true)
      await authService.googleLogin(token)
      const user = authService.getUser()
      setUser(user)
      
      // Redirect based on user type
      if (user?.user_type === 'service_provider') {
        router.push('/providers/dashboard')
      } else {
        router.push('/services')
      }
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
    router.push('/')
  }

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
      localStorage.setItem('auth_user', JSON.stringify(currentUser))
    } catch (error) {
      console.error('Failed to refresh user:', error)
      logout()
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    login,
    googleLogin,
    logout,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 