"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { apiService, type Booking } from '@/lib/api'
import { authService } from '@/lib/auth'
import { BookingChart } from '@/components/dashboard/BookingChart'
import { ServicePieChart } from '@/components/dashboard/ServicePieChart'
import { ScheduleCalendar } from '@/components/dashboard/ScheduleCalendar'
import { formatPrice } from '@/lib/utils'

export default function ProviderDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (!authService.isAuthenticated() || !authService.isServiceProvider()) {
      router.push('/login')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  const user = authService.getUser()
  const totalRevenue = bookings.reduce((sum, b) => b.status === 'completed' ? sum + b.total_price : sum, 0)
  const upcomingBookings = bookings.filter(b => new Date(b.appointment_start_time) > new Date())

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-card lg:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-[60px] items-center border-b px-6">
              <a href="/" className="flex items-center gap-2 font-semibold">
                <span className="">TimeBooking</span>
              </a>
            </div>
            <div className="flex-1 overflow-auto py-2">
              <nav className="grid items-start px-4 text-sm font-medium">
                <a href="#" className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all hover:text-primary">
                  Dashboard
                </a>
                <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                  Bookings
                </a>
                <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                  Services
                </a>
                <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                  Profile
                </a>
              </nav>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-card px-6">
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Welcome, {user?.full_name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
            </div>
          </header>
          <main className="flex-1 p-6">
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                {error}
              </div>
            )}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Revenue</CardTitle>
                  <CardDescription>Revenue from completed bookings.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{formatPrice(totalRevenue)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Bookings</CardTitle>
                  <CardDescription>Confirmed appointments.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{upcomingBookings.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Total Bookings</CardTitle>
                  <CardDescription>All-time booking count.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{bookings.length}</div>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <BookingChart bookings={bookings} />
              </div>
              <div>
                <ServicePieChart bookings={bookings} />
              </div>
            </div>
            <div className="mt-6">
              <ScheduleCalendar bookings={bookings} />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
} 