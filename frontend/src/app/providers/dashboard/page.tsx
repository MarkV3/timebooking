"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui"
import { Button } from "@/components/ui"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AvailabilityManager } from "./components/AvailabilityManager"
import { NewTimeSlotManager } from "./components/NewTimeSlotManager"
import { apiService } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { parseDateTime, formatTimeSlot, formatDisplayDate } from "@/lib/utils"
import { ServiceProvider } from "@/lib/api"

export default function ProviderDashboard() {
  const [activeTab, setActiveTab] = useState("availability")
  const [bookings, setBookings] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [provider, setProvider] = useState<ServiceProvider | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    if (user?.id) {
      const fetchProvider = async () => {
        try {
          const providerData = await apiService.getProviderByUserId(user.id);
          setProvider(providerData);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load provider data');
        }
      };
      fetchProvider();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'bookings') {
      loadBookings()
    } else if (activeTab === 'services') {
      loadServices()
    }
  }, [activeTab])

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

  const loadServices = async () => {
    try {
      setLoading(true)
      const data = await apiService.getMyServices()
      setServices(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateTime: string) => {
    const date = parseDateTime(dateTime)
    return `${formatDisplayDate(date, 'weekday')} ${formatTimeSlot(date)}`
  }

  const formatAppointmentDateTime = (startTime: string, endTime: string) => {
    const start = parseDateTime(startTime)
    const end = parseDateTime(endTime)
    const datePart = formatDisplayDate(start, 'weekday')
    const timePart = `${formatTimeSlot(start)} - ${formatTimeSlot(end)}`
    return `${datePart} ${timePart}`
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

  return (
    <ProtectedRoute allowedUserTypes={['service_provider']}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-background/80 backdrop-blur">
          <div className="container mx-auto px-4 py-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Provider Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {user?.full_name}</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 rounded-lg">
                <TabsTrigger value="time-slots">Time Slots</TabsTrigger>
                <TabsTrigger value="availability">Calendar</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
              </TabsList>

              <TabsContent value="time-slots">
                {provider && <NewTimeSlotManager providerId={provider.id} />}
              </TabsContent>

              <TabsContent value="availability">
                <AvailabilityManager />
              </TabsContent>

              <TabsContent value="services">
                <Card>
                  <CardHeader>
                    <CardTitle>Services Management</CardTitle>
                    <CardDescription>
                      Manage your services, pricing, and descriptions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Your Services</h3>
                        <Button size="sm" onClick={loadServices}>Refresh</Button>
                      </div>

                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="mt-2 text-muted-foreground">Loading services...</p>
                        </div>
                      ) : services.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Services Yet</h3>
                          <p className="text-muted-foreground mb-4">Create your first service to start accepting bookings</p>
                          <Button onClick={() => alert('Service creation coming soon')}>Create Service</Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {services.map((service: any) => (
                            <Card key={service.id}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-semibold">{service.name}</h4>
                                    <p className="text-sm text-muted-foreground">{service.description}</p>
                                    <p className="text-sm text-muted-foreground">{service.duration} minutes</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-primary">{formatPrice(service.price)}</p>
                                    <div className="flex gap-2 mt-2">
                                      <Button variant="outline" size="sm" onClick={() => alert('Edit service coming soon')}>Edit</Button>
                                      <Button variant="destructive" size="sm" onClick={() => alert('Delete service coming soon')}>Delete</Button>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bookings">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Bookings</CardTitle>
                    <CardDescription>
                      Manage your upcoming and past appointments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-muted-foreground">Loading bookings...</p>
                      </div>
                    ) : bookings.length === 0 ? (
                      <div className="text-center py-12">
                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Bookings Yet</h3>
                        <p className="text-muted-foreground">Your appointments will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {bookings.map((booking: any) => (
                          <Card key={booking.id} className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{booking.service_name}</h4>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                    {booking.status}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Customer: {booking.customer_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  📅 {formatAppointmentDateTime(booking.appointment_start_time, booking.appointment_end_time)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Booked on: {new Date(booking.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-primary">{formatPrice(booking.total_price)}</p>
                                <div className="flex gap-2 mt-2">
                                  {booking.status === 'confirmed' && (
                                    <>
                                      <Button variant="outline" size="sm">Reschedule</Button>
                                      <Button variant="destructive" size="sm">Cancel</Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Provider Profile</CardTitle>
                    <CardDescription>
                      Update your business information and settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <h3 className="text-lg font-semibold text-muted-foreground mb-2">Profile Management</h3>
                      <p className="text-muted-foreground mb-4">This section is coming soon</p>
                      <Button variant="outline">Update Profile</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 