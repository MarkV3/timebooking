"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface LoadingContextType {
  isGlobalLoading: boolean
  setGlobalLoading: (loading: boolean) => void
  incrementLoading: () => void
  decrementLoading: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loadingCount, setLoadingCount] = useState(0)
  
  const isGlobalLoading = loadingCount > 0

  const setGlobalLoading = (loading: boolean) => {
    setLoadingCount(loading ? 1 : 0)
  }

  const incrementLoading = () => {
    setLoadingCount(prev => prev + 1)
  }

  const decrementLoading = () => {
    setLoadingCount(prev => Math.max(0, prev - 1))
  }

  return (
    <LoadingContext.Provider value={{
      isGlobalLoading,
      setGlobalLoading,
      incrementLoading,
      decrementLoading
    }}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useGlobalLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useGlobalLoading must be used within a LoadingProvider')
  }
  return context
} 