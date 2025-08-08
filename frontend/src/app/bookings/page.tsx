"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { Card, CardContent } from "@/components/ui"
import { Button } from "@/components/ui"
import Link from "next/link"
import { apiService, type Booking } from "@/lib/api"
import { parseDateTime, formatDisplayDate, formatTimeSlot } from "@/lib/utils"

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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
    const start = parseDateTime(startTime)
    const end = parseDateTime(endTime)
    const datePart = formatDisplayDate(start, 'full')
    const timePart = `${formatTimeSlot(start)} - ${formatTimeSlot(end)}`
    return {
      date: datePart,
      time: timePart
    }
  }

  const formatBookingDate = (dateTime: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(parseDateTime(dateTime))
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "text-green-600 bg-green-50 border-green-200"
      case "cancelled":
        return "text-red-600 bg-red-50 border-red-200"
      case "completed":
        return "text-blue-600 bg-blue-50 border-blue-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmed"
      case "cancelled":
        return "Cancelled"
      case "completed":
        return "Completed"
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const isUpcoming = (startTime: string) => {
    return parseDateTime(startTime) > new Date()
  }

  return (
    <ProtectedRoute allowedUserTypes={["customer"]}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-white">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-primary">My Bookings</h1>
            <p className="text-muted-foreground mt-1">View and manage your appointments</p>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading bookings...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Bookings Yet</h3>
              <p className="text-muted-foreground mb-4">Your confirmed appointments will appear here.</p>
              <Link href="/services">
                <Button variant="outline">Browse Services</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {bookings
                .sort((a, b) => parseDateTime(b.created_at).getTime() - parseDateTime(a.created_at).getTime())
                .map((booking) => {
                const appointmentDateTime = formatAppointmentDateTime(
                  booking.appointment_start_time,
                  booking.appointment_end_time
                )
                const upcoming = isUpcoming(booking.appointment_start_time)
                
                return (
                  <Card key={booking.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        {/* Main booking info */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {booking.service_name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                with {booking.provider_name}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                booking.status,
                              )}`}
                            >
                              {getStatusText(booking.status)}
                            </span>
                          </div>

                          {booking.service_description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {booking.service_description}
                            </p>
                          )}

                          {/* Appointment details */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-700">📅 Appointment:</span>
                              <span className="text-gray-900">{appointmentDateTime.date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-700">🕒 Time:</span>
                              <span className="text-gray-900">{appointmentDateTime.time}</span>
                            </div>
                            {upcoming && (
                              <div className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                Upcoming
                              </div>
                            )}
                          </div>

                          {booking.notes && (
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Notes:</span>
                              <p className="text-gray-600 mt-1">{booking.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Price and actions */}
                        <div className="lg:text-right space-y-3">
                          <div>
                            <p className="text-2xl font-bold text-primary">
                              {formatPrice(booking.total_price)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Booked on {formatBookingDate(booking.created_at)}
                            </p>
                          </div>

                          {/* Action buttons based on status and date */}
                          <div className="flex lg:flex-col gap-2">
                            <Link href={`/providers/${booking.provider_id}`}>
                              <Button variant="outline" size="sm" className="w-full lg:w-auto">
                                View Provider
                              </Button>
                            </Link>
                            {booking.status === "confirmed" && upcoming && (
                              <Button variant="outline" size="sm" className="w-full lg:w-auto text-red-600 hover:text-red-700">
                                Cancel Booking
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
} 