"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { apiService, type Booking } from '@/lib/api'
import { authService } from '@/lib/auth'
import { parseDateTime, formatTimeSlot, formatDisplayDate } from '@/lib/utils'

export default function ProviderDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login')
      return
    }
    
    if (!authService.isServiceProvider()) {
      router.push('/services')
      return
    }

    loadBookings()
  }, [router])

  const loadBookings = async () => {
    try {
      setLoading(true)
      const data = await apiService.getMyBookings()
      setBookings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    authService.logout()
    router.push('/')
  }

  const formatDateTime = (dateTime: string) => {
    const date = parseDateTime(dateTime)
    return `${formatDisplayDate(date, 'weekday')} ${formatTimeSlot(date)}`
  }

  const formatAppointmentDateTime = (startTime: string, endTime: string) => {
    const start = parseDateTime(startTime)
    const end = parseDateTime(endTime)
    const datePart = formatDisplayDate(start, 'full')
    const timePart = `${formatTimeSlot(start)} - ${formatTimeSlot(end)}`
    return {
      date: datePart,
      time: timePart
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      case 'completed': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  const user = authService.getUser()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <Link href="/" className="text-2xl font-bold text-primary">
              TimeBooking
            </Link>
            <p className="text-sm text-muted-foreground">Provider Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.full_name}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Provider Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your bookings and services
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {bookings.filter(b => b.status === 'confirmed').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatPrice(bookings.reduce((sum, b) => sum + b.total_price, 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>
              Your latest appointments and bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No bookings yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Customers will be able to book your services once they find you through search.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings
                  .sort((a, b) => parseDateTime(b.appointment_start_time).getTime() - parseDateTime(a.appointment_start_time).getTime())
                  .map((booking) => {
                    const appointmentDateTime = formatAppointmentDateTime(booking.appointment_start_time, booking.appointment_end_time)
                    return (
                    <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{booking.service_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Customer: {booking.customer_name}
                            </p>
                          </div>
                          <div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-700">📅 Appointment:</span>
                                <span className="text-gray-900">{appointmentDateTime.date}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-700">🕒 Time:</span>
                                <span className="text-gray-900">{appointmentDateTime.time}</span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              Booked: {parseDateTime(booking.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {booking.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Notes: {booking.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            {formatPrice(booking.total_price)}
                          </p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks for service providers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" variant="outline">
                Manage Services
              </Button>
              <Button className="w-full" variant="outline">
                Update Availability
              </Button>
              <Button className="w-full" variant="outline">
                View Profile
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
              <CardDescription>
                How to get more bookings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Keep your services up to date</li>
                <li>• Respond to customer inquiries quickly</li>
                <li>• Maintain good ratings and reviews</li>
                <li>• Update your availability regularly</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 