"use client"

import { useGoogleLogin } from '@react-oauth/google'
import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

export function GoogleLoginButton() {
  const { googleLogin } = useAuth()
  const [error, setError] = useState('')

  const login = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        await googleLogin(codeResponse.code)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Google login failed')
      }
    },
    onError: () => {
      setError('Google login failed')
    },
    flow: 'auth-code',
  })

  return (
    <div>
      <Button onClick={() => login()} className="w-full">
        Continue with Google
      </Button>
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md mt-4">
          {error}
        </div>
      )}
    </div>
  )
}
