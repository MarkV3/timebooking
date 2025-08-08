"use client"

import { useEffect } from 'react'
import { useGlobalLoading } from '@/contexts/LoadingContext'
import { setGlobalLoadingCallbacks } from '@/lib/api'

export function LoadingInitializer() {
  const { incrementLoading, decrementLoading } = useGlobalLoading()

  useEffect(() => {
    // Connect the API service to the global loading context
    setGlobalLoadingCallbacks({
      increment: incrementLoading,
      decrement: decrementLoading
    })
  }, [incrementLoading, decrementLoading])

  return null
} 