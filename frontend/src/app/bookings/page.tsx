"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { Card, CardContent } from "@/components/ui"
import { Button } from "@/components/ui"
import Link from "next/link"
import { apiService, type Booking } from "@/lib/api"
import { parseDateTime, formatDisplayDate, formatTimeSlot } from "@/lib/utils"
import { BookingCancellationModal } from "@/components/ui/BookingCancellationModal"
import { Calendar, Clock } from "lucide-react"

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const data = await apiService.getMyBookings()
        setBookings(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bookings")
      } finally {
        setLoading(false)
      }
    }

    loadBookings()
  }, [])

  const formatAppointmentDateTime = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) {
      return { date: 'Invalid date', time: 'Invalid time' }
    }
    try {
      const start = parseDateTime(startTime)
      const end = parseDateTime(endTime)
      return {
        date: formatDisplayDate(start, 'full'),
        time: `${formatTimeSlot(start)} - ${formatTimeSlot(end)}`
      }
    } catch (error) {
      console.error('Error formatting appointment date/time:', error)
      return { date: 'Invalid date', time: 'Invalid time' }
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price)
  }

  const getStatusClasses = (status: string) => {
    switch (status) {
      case "confirmed": return "text-green-700 bg-green-100 border-green-200"
      case "cancelled": return "text-red-700 bg-red-100 border-red-200"
      case "completed": return "text-blue-700 bg-blue-100 border-blue-200"
      default: return "text-gray-700 bg-gray-100 border-gray-200"
    }
  }

  const isUpcoming = (startTime: string) => {
    try {
      return startTime ? parseDateTime(startTime) > new Date() : false
    } catch (error) {
      console.error('Error checking if appointment is upcoming:', error)
      return false
    }
  }

  const openCancelModal = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsModalOpen(true)
  }

  const handleConfirmCancel = async (reason: string) => {
    if (!selectedBooking) return
    try {
      setError("")
      const updated = await apiService.cancelBooking(selectedBooking.id, reason)
      setBookings(prev => prev.map(b => (b.id === updated.id ? updated : b)))
      setIsModalOpen(false)
      setSelectedBooking(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking")
    }
  }

  return (
    <ProtectedRoute allowedUserTypes={["customer"]}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-heading tracking-tight">My Bookings</h1>
            <p className="text-lg text-muted-foreground mt-2">View and manage your appointments.</p>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading your bookings...</p>
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-lg shadow-sm">
              <h3 className="text-2xl font-heading mb-2">No Bookings Yet</h3>
              <p className="text-muted-foreground mb-6">Ready to book your next appointment?</p>
              <Link href="/services">
                <Button>Browse Services</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {bookings
                .sort((a, b) => parseDateTime(b.created_at).getTime() - parseDateTime(a.created_at).getTime())
                .map((booking) => {
                  const appointmentDateTime = formatAppointmentDateTime(booking.appointment_start_time, booking.appointment_end_time)
                  const upcoming = isUpcoming(booking.appointment_start_time)

                  return (
                    <Card key={booking.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                          {/* Service and Provider Info */}
                          <div className="md:col-span-1 space-y-1">
                            <h3 className="text-xl font-semibold">{booking.service_name}</h3>
                            <p className="text-sm text-muted-foreground">with {booking.provider_name}</p>
                          </div>

                          {/* Appointment Details */}
                          <div className="md:col-span-1 space-y-2 text-sm">
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>{appointmentDateTime.date}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>{appointmentDateTime.time}</span>
                            </div>
                          </div>

                          {/* Price, Status and Actions */}
                          <div className="md:col-span-1 flex flex-col items-start md:items-end gap-3">
                            <div className="text-2xl font-bold text-primary">{formatPrice(booking.total_price)}</div>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusClasses(booking.status)}`}>
                              <span className={`w-2 h-2 rounded-full ${getStatusClasses(booking.status).replace('text-', 'bg-').split(' ')[0]}`}></span>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </div>
                            {booking.status === "confirmed" && upcoming && (
                              <Button 
                                variant="ghost"
                                size="sm" 
                                className="text-destructive hover:bg-destructive/10 h-auto p-1"
                                onClick={() => openCancelModal(booking)}
                              >
                                Cancel Booking
                              </Button>
                            )}
                          </div>
                        </div>
                        {booking.notes && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <p className="text-sm font-medium">Your notes:</p>
                            <p className="text-sm text-muted-foreground mt-1">{booking.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
              })}
            </div>
          )}
        </div>

        {selectedBooking && (
          <BookingCancellationModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onConfirm={handleConfirmCancel}
            bookingId={selectedBooking.id}
            serviceName={selectedBooking.service_name || 'Unknown Service'}
            appointmentDate={formatAppointmentDateTime(selectedBooking.appointment_start_time, selectedBooking.appointment_end_time).date}
          />
        )}
      </div>
    </ProtectedRoute>
  )
} 