"use client"

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { BookingConfirmationModal, type BookingConfirmationData } from '@/components/ui'
import { EnhancedCalendar } from '@/components/ui/calendar'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { apiService, type ServiceProvider, type Service, type TimeSlot } from '@/lib/api'
import { parseDateTime, formatTimeSlot, isSameDay, formatDisplayDate } from '@/lib/utils'
import { TimezoneDisplay } from '@/contexts/TimezoneContext'

interface CalendarEvent {
  id: string
  title: string
  date: Date
  startTime: string
  endTime: string
  type: 'available' | 'booked' | 'unavailable'
  provider?: string
  service?: string
  price?: number
}



export default function ProviderDetailPage() {
  const [provider, setProvider] = useState<ServiceProvider | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dayTimeSlots, setDayTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [confirmationData, setConfirmationData] = useState<BookingConfirmationData | null>(null)
  
  const timeSlotsRef = useRef<HTMLDivElement>(null)
  
  const params = useParams()
  const router = useRouter()
  const providerId = params.id as string

  useEffect(() => {
    loadProviderData()
  }, [providerId])

  const loadProviderData = async () => {
    try {
      setLoading(true)
      const [providerData, servicesData] = await Promise.all([
        apiService.getServiceProvider(providerId),
        apiService.getProviderServices(providerId)
      ])
      
      setProvider(providerData)
      setServices(servicesData)
      
      if (servicesData.length > 0) {
        setSelectedService(servicesData[0])
        await loadTimeSlots(providerId, servicesData[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load provider data')
    } finally {
      setLoading(false)
    }
  }

  const loadTimeSlots = async (providerId: string, serviceId?: string) => {
    try {
      // Get all slots (both available and booked) for calendar display
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 30);
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const allSlotsData = await apiService.getProviderSchedule(providerId, startDate, endDateStr)
      
      // Store ALL slots (both available and booked) for proper display
      setTimeSlots(allSlotsData)
      
      // Convert ALL slots to calendar events for proper display
      const events: CalendarEvent[] = allSlotsData.map(slot => {
        const startDateTime = parseDateTime(slot.start_time)
        const endDateTime = parseDateTime(slot.end_time)
        
        return {
          id: slot.id,
          title: slot.is_booked ? 'Booked' : 'Available',
          date: startDateTime,
          startTime: formatTimeSlot(startDateTime),
          endTime: formatTimeSlot(endDateTime),
          type: slot.is_booked ? 'booked' : 'available' as 'available' | 'booked',
          provider: provider?.business_name,
          service: selectedService?.name,
          price: selectedService?.price
        }
      })
      setCalendarEvents(events)
      
      // Load day time slots for the currently selected date (both available and booked)
      await loadDayTimeSlots(selectedDate, allSlotsData)
    } catch (err) {
      console.error('Failed to load time slots:', err)
    }
  }

  const loadDayTimeSlots = async (date: Date, slots?: TimeSlot[]) => {
    const slotsToUse = slots || timeSlots
    // Include both available and booked slots for the selected date
    const daySlots = slotsToUse.filter(slot => {
      return isSameDay(slot.start_time, date)
    })
    setDayTimeSlots(daySlots)
  }

  const handleServiceChange = async (service: Service) => {
    setSelectedService(service)
    setSelectedSlot(null)
    setShowConfirmationModal(false)
    await loadTimeSlots(providerId, service.id)
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.is_booked) {
      setSelectedSlot(slot)
      setShowConfirmationModal(false)
    }
  }

  const handleDayClick = async (date: Date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    setShowConfirmationModal(false)
    await loadDayTimeSlots(date)
    
    // Auto-scroll to time slots section
    setTimeout(() => {
      timeSlotsRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start' 
      })
    }, 100)
  }

  const handleBooking = async () => {
    if (!selectedSlot || !selectedService || !provider) return

    try {
      setBookingLoading(true)
      setError('')
      
      const booking = await apiService.createBooking({
        service_id: selectedService.id,
        time_slot_id: selectedSlot.id,
        notes: notes
      })
      
      // Prepare confirmation data for the modal
      const bookingData: BookingConfirmationData = {
        serviceName: selectedService.name,
        serviceDescription: selectedService.description,
        duration: selectedService.duration,
        price: selectedService.price,
        date: formatDisplayDate(selectedSlot.start_time, 'weekday'),
        time: formatTimeSlot(selectedSlot.start_time),
        providerName: provider.business_name,
        bookingId: booking.id
      }
      
      setConfirmationData(bookingData)
      setShowConfirmationModal(true)
      setSelectedSlot(null)
      await loadTimeSlots(providerId, selectedService.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed')
    } finally {
      setBookingLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}>
        ★
      </span>
    ))
  }

  if (loading) {
    return (
      <ProtectedRoute allowedUserTypes={['customer']}>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading provider details...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!provider) {
    return (
      <ProtectedRoute allowedUserTypes={['customer']}>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Provider Not Found</h1>
              <p className="text-muted-foreground mb-4">The service provider you're looking for doesn't exist.</p>
              <Link href="/services">
                <Button>Back to Services</Button>
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedUserTypes={['customer']}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Provider Header */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row gap-6">
                  {provider.profile_image_url && (
                    <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={provider.profile_image_url} 
                        alt={provider.business_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-2xl">{provider.business_name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex">
                            {renderStars(provider.rating)}
                          </div>
                          <span className="font-medium">{provider.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground">
                            ({provider.total_reviews} reviews)
                          </span>
                        </div>
                        {provider.city && provider.state && (
                          <p className="text-muted-foreground mt-1">
                            📍 {provider.city}, {provider.state}
                          </p>
                        )}
                      </div>
                      <Link href="/services">
                        <Button variant="outline" size="sm">← Back to Search</Button>
                      </Link>
                    </div>
                    {provider.description && (
                      <CardDescription className="mt-4 text-base">
                        {provider.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Simplified Booking Interface */}
            <div id="book" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Services List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Available Services</CardTitle>
                  <CardDescription>Select a service to book an appointment</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {services.map((service) => (
                      <div 
                        key={service.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedService?.id === service.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleServiceChange(service)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{service.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {service.duration} minutes
                            </p>
                            {service.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {service.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              {formatPrice(service.price)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {services.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No services available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Calendar & Booking */}
              <div className="lg:col-span-2 space-y-6">
                {selectedService ? (
                  <>
                    {/* Calendar View */}
                    <Card>
                                              <CardHeader>
                          <CardTitle>Available Times</CardTitle>
                          <CardDescription>
                            Choose a time slot for {selectedService.name}
                          </CardDescription>
                          <TimezoneDisplay />
                        </CardHeader>
                      <CardContent>
                        <EnhancedCalendar
                          selectedDate={selectedDate}
                          onDateSelect={handleDayClick}
                          events={calendarEvents}
                          onEventSelect={(event: CalendarEvent) => {
                            const slot = timeSlots.find(s => s.id === event.id)
                            if (slot) handleSlotSelect(slot)
                          }}
                        />
                      </CardContent>
                    </Card>

                    {/* Available Time Slots for Selected Date */}
                    {dayTimeSlots.length > 0 && (
                      <Card ref={timeSlotsRef}>
                        <CardHeader>
                          <CardTitle>
                            Available Times - {formatDisplayDate(selectedDate, 'full')}
                          </CardTitle>
                          <CardDescription>
                            Select a time slot to book your appointment
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {dayTimeSlots.map((slot) => (
                              <div
                                key={slot.id}
                                className={`p-3 text-center rounded-lg border transition-colors ${
                                  slot.is_booked 
                                    ? 'bg-red-50 border-red-200 text-red-700 cursor-not-allowed opacity-70'
                                    : selectedSlot?.id === slot.id
                                      ? 'border-primary bg-primary text-white cursor-pointer'
                                      : 'border-border hover:border-primary hover:bg-primary/5 cursor-pointer'
                                }`}
                                onClick={() => !slot.is_booked && handleSlotSelect(slot)}
                              >
                                <div className={`${slot.is_booked ? 'text-sm' : 'font-medium'}`}>
                                  {formatTimeSlot(slot.start_time)} - {formatTimeSlot(slot.end_time)}
                                </div>
                                {slot.is_booked && (
                                  <div className="text-xs text-red-600 mt-1">
                                    Unavailable
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Booking Confirmation */}
                    {selectedSlot && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Confirm Booking</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium">Service</p>
                                <p className="text-muted-foreground">{selectedService.name}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Duration</p>
                                <p className="text-muted-foreground">{selectedService.duration} minutes</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Date & Time</p>
                                <p className="text-muted-foreground">
                                  {formatDisplayDate(selectedSlot.start_time, 'weekday')} at {formatTimeSlot(selectedSlot.start_time)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Price</p>
                                <p className="font-bold text-primary">
                                  {formatPrice(selectedService.price)}
                                </p>
                              </div>
                            </div>

                            <div>
                              <label htmlFor="booking-notes" className="text-sm font-medium">Notes (optional)</label>
                              <textarea
                                id="booking-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g., specific requests, allergies..."
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                rows={3}
                              />
                            </div>

                            {error && (
                              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                                {error}
                              </div>
                            )}

                            <div className="flex gap-3">
                              <Button
                                onClick={handleBooking}
                                disabled={bookingLoading}
                                className="flex-1"
                              >
                                {bookingLoading ? 'Confirming...' : 'Confirm Booking'}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setSelectedSlot(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                        Select a Service
                      </h3>
                      <p className="text-muted-foreground">
                        Choose a service from the list to view available time slots
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      {confirmationData && (
        <BookingConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => {
            setShowConfirmationModal(false)
            setConfirmationData(null)
          }}
          onViewBookings={() => {
            setShowConfirmationModal(false)
            setConfirmationData(null)
            router.push('/bookings')
          }}
          bookingData={confirmationData}
        />
      )}
    </ProtectedRoute>
  )
} 