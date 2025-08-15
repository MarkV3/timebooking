"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui"
import { Card, CardContent } from "@/components/ui"
import { Badge } from "@/components/ui"
import { useAuth } from "@/contexts/AuthContext"
import { apiService } from "@/lib/api"
import { useGoogleLogin } from "@react-oauth/google"

interface CalendarStatus {
  enabled: boolean
  connected: boolean
}

export function CalendarSettings() {
  const { user } = useAuth()
  const [status, setStatus] = useState<CalendarStatus>({ enabled: false, connected: false })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchCalendarStatus()
  }, [])

  const fetchCalendarStatus = async () => {
    try {
      setLoading(true)
      const response = await apiService.getCalendarStatus()
      setStatus(response)
    } catch (error) {
      console.error('Failed to fetch calendar status:', error)
    } finally {
      setLoading(false)
    }
  }

  const connect = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        await apiService.connectCalendar(codeResponse.code, window.location.origin + '/login/callback')
        await fetchCalendarStatus()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Google login failed')
      }
    },
    onError: () => {
      setError('Google login failed')
    },
    flow: 'auth-code',
  })

  const handleDisconnect = async () => {
    try {
      setActionLoading(true)
      await apiService.disconnectCalendar()
      await fetchCalendarStatus()
    } catch (error) {
      console.error('Failed to disconnect calendar:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleSync = async () => {
    try {
      setActionLoading(true)
      await apiService.toggleCalendarSync(!status.enabled)
      await fetchCalendarStatus()
    } catch (error) {
      console.error('Failed to toggle calendar sync:', error)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading calendar settings...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="flex items-center gap-2">
            <span className="font-medium">Google Calendar</span>
            {status.connected ? (
              <Badge variant="secondary">Connected</Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!status.connected ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => connect()}
              loading={actionLoading}
            >
              {actionLoading ? 'Connecting...' : 'Connect'}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setOpen(v => !v)}>
              {open ? 'Hide' : 'Manage'}
            </Button>
          )}
        </div>
      </div>
      {open && (
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/40 shadow-sm transition">
            <div>
              <p className="text-sm font-medium">Auto-sync</p>
              <p className="text-xs text-muted-foreground">Automatically add new bookings to your calendar</p>
            </div>
            <Button
              size="sm"
              variant={status.enabled ? 'outline' : 'primary'}
              onClick={handleToggleSync}
              loading={actionLoading}
            >
              {status.enabled ? 'Disable' : 'Enable'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/40 shadow-sm transition">
            <div>
              <p className="text-sm font-medium">Disconnect</p>
              <p className="text-xs text-muted-foreground">Stop syncing with Google Calendar</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleDisconnect} loading={actionLoading}>
              Disconnect
            </Button>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Your calendar data is used only for creating appointment events. We don't access or store your other calendar information.
          </p>
        </CardContent>
      )}
    </Card>
  )
}
