"use client"

import React from 'react'
import { useGlobalLoading } from '@/contexts/LoadingContext'

export function GlobalLoadingIndicator() {
  const { isGlobalLoading } = useGlobalLoading()

  if (!isGlobalLoading) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-2xl flex flex-col items-center space-y-4">
        {/* Loading Spinner */}
        <div className="relative">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-600 rounded-full animate-spin border-t-primary"></div>
        </div>
        
        {/* Loading Text */}
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Loading...
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Please wait while we process your request
          </p>
        </div>
      </div>
    </div>
  )
} 