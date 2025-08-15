"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { useAuth } from "@/contexts/AuthContext"
import { apiService } from "@/lib/api"
import { Booking, ServiceProvider } from "@/types"
import { CalendarSettings } from "@/components/calendar/CalendarSettings"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function UnifiedDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])
  const [serviceProvider, setServiceProvider] = useState<ServiceProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [becomingProvider, setBecomingProvider] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      // Fetch user's bookings
      const bookings = await apiService.getMyBookings()
      setRecentBookings(bookings.slice(0, 3)) // Show only recent 3

      // Check if user is also a service provider
      if (user?.user_type === 'service_provider') {
        try {
          const provider = await apiService.getCurrentProvider()
          setServiceProvider(provider)
        } catch (error) {
          console.log('User is not a service provider:', error)
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBecomeProvider = () => {
    router.push('/become-provider')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.full_name}</h1>
        <p className="text-muted-foreground">
          Manage your bookings and {serviceProvider ? 'your business' : 'discover new opportunities'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Your Bookings</CardTitle>
                <CardDescription>Recent appointments and services</CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/bookings">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentBookings.length > 0 ? (
                <div className="space-y-4">
                  {recentBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/40 shadow-sm transition">
                      <div>
                        <h4 className="font-medium">{booking.service?.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.time_slot?.start_time).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Status: <span className="capitalize">{booking.status}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${booking.total_price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No bookings yet</p>
                  <Button asChild>
                    <Link href="/services">Browse Services</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>What would you like to do today?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button asChild className="h-20 flex-col gap-2">
                  <Link href="/services">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Browse Services
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-20 flex-col gap-2">
                  <Link href="/bookings">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
                    </svg>
                    My Calendar
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Provider Section */}
        <div className="space-y-6">
          {serviceProvider ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Your Business</CardTitle>
                  <CardDescription>{serviceProvider.business_name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button asChild className="w-full">
                      <Link href="/providers/dashboard">Provider Dashboard</Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/providers/services">Manage Services</Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/providers/calendar">Manage Schedule</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Become a Service Provider</CardTitle>
                <CardDescription>
                  Start earning by offering your services to customers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">Set your own rates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">Flexible scheduling</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">Built-in payment processing</span>
                  </div>
                </div>
                <Button 
                  onClick={handleBecomeProvider} 
                  className="w-full"
                  disabled={becomingProvider}
                >
                  {becomingProvider ? 'Processing...' : 'Get Started'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Calendar Integration */}
          <CalendarSettings />

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Bookings</span>
                  <span className="font-medium">{recentBookings.length}</span>
                </div>
                {serviceProvider && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Services Offered</span>
                    <span className="font-medium">{serviceProvider.services?.length || 0}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
