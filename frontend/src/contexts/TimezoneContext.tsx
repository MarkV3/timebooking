"use client"

import React, { createContext, useContext, ReactNode } from 'react'
import { getTimezoneOffset } from '@/lib/utils'

interface TimezoneContextType {
  userTimezone: string
  timezoneOffset: string
  displayTimezone: boolean
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined)

interface TimezoneProviderProps {
  children: ReactNode
}

export function TimezoneProvider({ children }: TimezoneProviderProps) {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const timezoneOffset = getTimezoneOffset()
  const displayTimezone = true // Can be made configurable

  const value: TimezoneContextType = {
    userTimezone,
    timezoneOffset,
    displayTimezone
  }

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  )
}

export function useTimezone() {
  const context = useContext(TimezoneContext)
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider')
  }
  return context
}

// Display timezone info component
export function TimezoneDisplay() {
  const { userTimezone, timezoneOffset, displayTimezone } = useTimezone()
  
  if (!displayTimezone) return null
  
  return (
    <div className="text-xs text-muted-foreground">
      Times shown in {userTimezone} ({timezoneOffset})
    </div>
  )
} 