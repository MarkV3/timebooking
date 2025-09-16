"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"
import { Button } from "@/components/ui"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AvailabilityManager } from "./components/AvailabilityManager"
import { NewTimeSlotManager } from "./components/NewTimeSlotManager"
import { apiService, type ServiceProvider } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { parseDateTime, formatTimeSlot, formatDisplayDate } from "@/lib/utils"

interface BookingMetric {
  upcoming: number
  completed: number
  revenueThisMonth: number
}

export default function ProviderDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")
  const [bookings, setBookings] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [provider, setProvider] = useState<ServiceProvider | null>(null)
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsLoaded, setBookingsLoaded] = useState(false)
  const [servicesLoading, setServicesLoading] = useState(false)
  const [servicesLoaded, setServicesLoaded] = useState(false)
  const [error, setError] = useState("")
  const [scheduleRevision, setScheduleRevision] = useState(0)

  useEffect(() => {
    if (!user?.id) return

    const loadProvider = async () => {
      try {
        const providerData = await apiService.getProviderByUserId(user.id)
        setProvider(providerData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load provider data")
      }
    }

    loadProvider()
  }, [user])

  useEffect(() => {
    if (!user?.user_type) return

    if (activeTab === "overview" || activeTab === "bookings") {
      void loadBookings()
    }
    if (activeTab === "overview" || activeTab === "services") {
      void loadServices()
    }
  }, [activeTab, user?.user_type])

  const loadBookings = async (force = false) => {
    if (bookingsLoading || (!force && bookingsLoaded)) return

    try {
      setBookingsLoading(true)
      const data = await apiService.getMyBookings()
      setBookings(data)
      setBookingsLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings")
    } finally {
      setBookingsLoading(false)
    }
  }

  const loadServices = async (force = false) => {
    if (servicesLoading || (!force && servicesLoaded)) return

    try {
      setServicesLoading(true)
      const data = await apiService.getMyServices()
      setServices(data)
      setServicesLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load services")
    } finally {
      setServicesLoading(false)
    }
  }

  const metrics = useMemo<BookingMetric>(() => {
    if (!bookings.length) {
      return {
        upcoming: 0,
        completed: 0,
        revenueThisMonth: 0,
      }
    }

    const now = new Date()
    const upcoming = bookings.filter((booking: any) => {
      try {
        const start = parseDateTime(booking.appointment_start_time)
        return start >= now && booking.status !== "cancelled"
      } catch (error) {
        return false
      }
    }).length

    const completed = bookings.filter((booking: any) => booking.status === "completed").length

    const revenueThisMonth = bookings.reduce((total: number, booking: any) => {
      try {
        if (booking.status === "cancelled") return total
        const start = parseDateTime(booking.appointment_start_time)
        const sameMonth =
          start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear()
        if (!sameMonth) return total
        const price = typeof booking.total_price === "number" ? booking.total_price : Number(booking.total_price)
        return total + (Number.isFinite(price) ? price : 0)
      } catch (error) {
        return total
      }
    }, 0)

    return {
      upcoming,
      completed,
      revenueThisMonth,
    }
  }, [bookings])

  const upcomingBookings = useMemo(() => {
    if (!bookings.length) return []

    const now = new Date()

    return bookings
      .map((booking: any) => {
        try {
          const start = parseDateTime(booking.appointment_start_time)
          const end = parseDateTime(booking.appointment_end_time)
          return { ...booking, __start: start, __end: end }
        } catch (error) {
          return null
        }
      })
      .filter((booking): booking is any & { __start: Date; __end: Date } => Boolean(booking) && booking.__start >= now)
      .sort((a, b) => a.__start.getTime() - b.__start.getTime())
  }, [bookings])

  const formatAppointmentDateTime = (startTime: string, endTime: string) => {
    try {
      const start = parseDateTime(startTime)
      const end = parseDateTime(endTime)
      const datePart = formatDisplayDate(start, "weekday")
      const timePart = `${formatTimeSlot(start)} – ${formatTimeSlot(end)}`
      return `${datePart} ${timePart}`
    } catch (error) {
      return startTime
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-100 text-emerald-700"
      case "cancelled":
        return "bg-rose-100 text-rose-700"
      case "completed":
        return "bg-blue-100 text-blue-700"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <ProtectedRoute allowedUserTypes={["service_provider"]}>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/80">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-2xl font-semibold text-foreground">Provider dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user?.full_name}</p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex w-full flex-wrap gap-2 rounded-xl bg-muted/60 p-1">
              <TabsTrigger value="overview" className="flex-1 px-4 py-2 text-sm">Overview</TabsTrigger>
              <TabsTrigger value="availability" className="flex-1 px-4 py-2 text-sm">Calendar</TabsTrigger>
              <TabsTrigger value="time-slots" className="flex-1 px-4 py-2 text-sm">Availability rules</TabsTrigger>
              <TabsTrigger value="services" className="flex-1 px-4 py-2 text-sm">Services</TabsTrigger>
              <TabsTrigger value="bookings" className="flex-1 px-4 py-2 text-sm">Bookings</TabsTrigger>
              <TabsTrigger value="profile" className="flex-1 px-4 py-2 text-sm">Profile</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Upcoming bookings</CardDescription>
                    <CardTitle className="text-3xl font-semibold">{metrics.upcoming}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Keep an eye on your next appointments.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Active services</CardDescription>
                    <CardTitle className="text-3xl font-semibold">{services.length}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Organise the services you offer to customers.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Revenue this month</CardDescription>
                    <CardTitle className="text-3xl font-semibold">{formatPrice(metrics.revenueThisMonth)}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Based on confirmed and completed bookings.
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <Card className="self-start">
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">Upcoming schedule</CardTitle>
                      <CardDescription>Next few confirmed bookings</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("bookings")}
                      disabled={bookingsLoading}
                    >
                      View all
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {bookingsLoading && !bookingsLoaded ? (
                      <div className="text-center text-sm text-muted-foreground py-6">
                        Loading bookings…
                      </div>
                    ) : upcomingBookings.length === 0 ? (
                      <div className="rounded-md border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
                        Once you have bookings scheduled they will appear here.
                      </div>
                    ) : (
                      upcomingBookings.slice(0, 4).map((booking: any) => (
                        <div
                          key={booking.id}
                          className="flex items-start justify-between rounded-lg border border-border bg-card px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{booking.service_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatAppointmentDateTime(booking.appointment_start_time, booking.appointment_end_time)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{booking.customer_name}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusStyles(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="self-start">
                  <CardHeader>
                    <CardTitle className="text-lg">Quick actions</CardTitle>
                    <CardDescription>Jump into common tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full" onClick={() => setActiveTab("availability")}>
                      Review calendar
                    </Button>
                    <Button className="w-full" variant="outline" onClick={() => setActiveTab("time-slots")}>
                      Update working hours
                    </Button>
                    <Button className="w-full" variant="outline" onClick={() => setActiveTab("services")}>
                      Manage services
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="availability">
              <AvailabilityManager refreshToken={scheduleRevision} />
            </TabsContent>

            <TabsContent value="time-slots">
              {provider && (
                <NewTimeSlotManager
                  providerId={provider.id}
                  onScheduleChange={() => setScheduleRevision((prev) => prev + 1)}
                />
              )}
              {!provider && (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    We are preparing your provider profile. Try again in a moment.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="services">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>Services</CardTitle>
                    <CardDescription>Create, price, and update what you offer</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => void loadServices(true)} disabled={servicesLoading}>
                      Refresh
                    </Button>
                    <Button size="sm" onClick={() => alert("Service creation coming soon")}>Add service</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {servicesLoading && !servicesLoaded ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">Loading services…</div>
                  ) : services.length === 0 ? (
                    <div className="rounded-md border border-dashed border-muted-foreground/40 p-8 text-center">
                      <h3 className="text-base font-medium text-foreground">No services yet</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Add your first service to start accepting bookings.
                      </p>
                      <Button className="mt-4" onClick={() => alert("Service creation coming soon")}>Create service</Button>
                    </div>
                  ) : (
                    services.map((service: any) => (
                      <Card key={service.id} className="border border-border bg-card">
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <h4 className="text-base font-semibold text-foreground">{service.name}</h4>
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                            <p className="text-xs text-muted-foreground">Duration: {service.duration} minutes</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-lg font-semibold text-foreground">{formatPrice(service.price)}</span>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => alert("Edit service coming soon")}>Edit</Button>
                              <Button variant="destructive" size="sm" onClick={() => alert("Delete service coming soon")}>Delete</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bookings">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>Bookings</CardTitle>
                    <CardDescription>Manage upcoming and past appointments</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void loadBookings(true)} disabled={bookingsLoading}>
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bookingsLoading && !bookingsLoaded ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">Loading bookings…</div>
                  ) : bookings.length === 0 ? (
                    <div className="rounded-md border border-dashed border-muted-foreground/40 p-8 text-center text-sm text-muted-foreground">
                      No bookings yet. Your appointments will appear here once clients book a slot.
                    </div>
                  ) : (
                    bookings.map((booking: any) => (
                      <Card key={booking.id} className="border border-border bg-card">
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-semibold text-foreground">{booking.service_name}</h4>
                              <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusStyles(booking.status)}`}>
                                {booking.status}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{booking.customer_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatAppointmentDateTime(booking.appointment_start_time, booking.appointment_end_time)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Booked on {new Date(booking.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-lg font-semibold text-foreground">{formatPrice(booking.total_price)}</span>
                            {booking.status === "confirmed" && (
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">Reschedule</Button>
                                <Button variant="destructive" size="sm">Cancel</Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Update your business information and settings</CardDescription>
                </CardHeader>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Profile management tools are coming soon.
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
