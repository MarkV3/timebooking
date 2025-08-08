"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedUserTypes?: ('customer' | 'service_provider')[]
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  allowedUserTypes,
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push(redirectTo)
      return
    }

    // Check user type permissions
    if (allowedUserTypes && user) {
      if (!allowedUserTypes.includes(user.user_type)) {
        // Redirect based on user type
        if (user.user_type === 'service_provider') {
          router.push('/providers/dashboard')
        } else {
          router.push('/services')
        }
        return
      }
    }
  }, [loading, isAuthenticated, user, allowedUserTypes, router, redirectTo])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show nothing if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  // Show nothing if user type not allowed (will redirect)
  if (allowedUserTypes && user && !allowedUserTypes.includes(user.user_type)) {
    return null
  }

  return <>{children}</>
} 