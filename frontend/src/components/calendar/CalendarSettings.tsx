"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { apiService } from "@/lib/api"

interface CalendarStatus {
  enabled: boolean
  connected: boolean
}

export function CalendarSettings() {
  const [status, setStatus] = useState<CalendarStatus>({ enabled: false, connected: false })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

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

  const handleConnect = async () => {
    try {
      setActionLoading(true)
      const response = await apiService.getCalendarAuthUrl()
      window.location.href = response.authorization_url
    } catch (error) {
      console.error('Failed to initiate calendar connection:', error)
    } finally {
      setActionLoading(false)
    }
  }

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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Sync your bookings with Google Calendar automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-medium">Connection Status</h4>
            <p className="text-sm text-muted-foreground">
              {status.connected ? 'Connected to Google Calendar' : 'Not connected'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${status.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {status.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {!status.connected ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-blue-900 font-medium mb-2">Benefits of Calendar Integration:</h4>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Automatic appointment creation in your Google Calendar</li>
                <li>• Reminders and notifications from Google</li>
                <li>• Easy scheduling conflict detection</li>
                <li>• Access appointments from any device</li>
              </ul>
            </div>
            
            <Button 
              onClick={handleConnect}
              disabled={actionLoading}
              className="w-full"
            >
              {actionLoading ? 'Connecting...' : 'Connect Google Calendar'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <h4 className="font-medium text-green-900">Auto-sync Enabled</h4>
                <p className="text-sm text-green-700">
                  {status.enabled 
                    ? 'New bookings will be added to your calendar automatically'
                    : 'Auto-sync is currently disabled'
                  }
                </p>
              </div>
              <Button
                variant={status.enabled ? "secondary" : "default"}
                size="sm"
                onClick={handleToggleSync}
                disabled={actionLoading}
              >
                {actionLoading ? 'Updating...' : (status.enabled ? 'Disable' : 'Enable')}
              </Button>
            </div>
            
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={handleDisconnect}
                disabled={actionLoading}
                className="flex-1"
              >
                {actionLoading ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>Your calendar data is used only for creating appointment events. We don't access or store your other calendar information.</p>
        </div>
      </CardContent>
    </Card>
  )
}
