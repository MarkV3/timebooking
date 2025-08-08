"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, Button } from "@/components/ui"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, X, MessageSquare } from "lucide-react"
import { parseDateTime, formatTimeSlot, isSameDay, formatDisplayDate } from "@/lib/utils"
import { type ProviderScheduleSlot } from "@/lib/api"

interface WeeklyCalendarViewProps {
  scheduleSlots: ProviderScheduleSlot[]
  currentDate: Date
  onDateChange: (date: Date) => void
  onRefresh: () => void
}

interface BookingDetailModalProps {
  slot: ProviderScheduleSlot | null
  onClose: () => void
}

interface WeekDay {
  date: Date
  dayName: string
  dayNumber: number
  isToday: boolean
  slots: ProviderScheduleSlot[]
}

interface TimeSlot {
  hour: number
  timeLabel: string
  isCurrentHour: boolean
}

// Booking Detail Modal Component
function BookingDetailModal({ slot, onClose }: BookingDetailModalProps) {
  // Handle escape key - must be called before early return
  useEffect(() => {
    if (!slot || !slot.booking) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [slot, onClose])

  if (!slot || !slot.booking || !slot.start_time || !slot.end_time) return null

  let startTime: Date, endTime: Date
  try {
    startTime = parseDateTime(slot.start_time)
    endTime = parseDateTime(slot.end_time)
  } catch (error) {
    console.error('Error parsing slot times:', error)
    return null
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-in shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Booking Details</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Booking Information */}
          <div className="space-y-4">
            {/* Time */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900">
                  {formatTimeSlot(startTime)} - {formatTimeSlot(endTime)}
                </div>
                <div className="text-sm text-gray-600">
                  {formatDisplayDate(startTime, 'full')}
                </div>
              </div>
            </div>

            {/* Customer */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="h-5 w-5 text-gray-600" />
              <div>
                <div className="font-medium text-gray-900">
                  {slot.booking.customer_name || 'Unknown Customer'}
                </div>
                <div className="text-sm text-gray-600">
                  {slot.booking.customer_email || 'No email provided'}
                </div>
              </div>
            </div>

            {/* Service */}
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="font-medium text-gray-900 mb-1">
                {slot.booking.service_name || 'Unknown Service'}
              </div>
              {slot.booking.total_price && (
                <div className="text-sm text-gray-600 mb-2">
                  ${slot.booking.total_price.toFixed(2)}
                </div>
              )}
              <div className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                slot.booking.status === 'confirmed' 
                  ? 'bg-green-100 text-green-800'
                  : slot.booking.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {slot.booking.status ? 
                  slot.booking.status.charAt(0).toUpperCase() + slot.booking.status.slice(1) :
                  'Unknown Status'
                }
              </div>
            </div>

            {/* Customer Notes/Comments */}
            {slot.booking.notes && (
              <div className="p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-gray-900">Customer Notes</span>
                </div>
                <p className="text-sm text-gray-700 italic">
                  "{slot.booking.notes}"
                </p>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function WeeklyCalendarView({ scheduleSlots, currentDate, onDateChange, onRefresh }: WeeklyCalendarViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState<ProviderScheduleSlot | null>(null)
  const timeIndicatorRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Calculate working hours and scroll to start time
  useEffect(() => {
    if (scheduleSlots.length > 0 && scrollContainerRef.current) {
      // Find the earliest appointment time across all days
      const earliestHour = Math.min(
        ...scheduleSlots.map(slot => {
          const startTime = parseDateTime(slot.start_time)
          return startTime.getHours()
        })
      )
      
      // Start scrolling 1 hour before the earliest appointment, but not before 6 AM
      const scrollToHour = Math.max(6, earliestHour - 1)
      
      // Calculate scroll position (each hour row is 60px min-height)
      const scrollPosition = scrollToHour * 60
      
      // Smooth scroll to the working hours
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        })
      }, 100)
    }
  }, [scheduleSlots])

  // Get the start of the current week (Monday)
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday as start of week
    return new Date(d.setDate(diff))
  }

  const weekStart = getWeekStart(currentDate)
  
  // Generate week days
  const weekDays: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    
    const daySlots = scheduleSlots.filter(slot => 
      isSameDay(parseDateTime(slot.start_time), date)
    )

    return {
      date,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: date.getDate(),
      isToday,
      slots: daySlots
    }
  })

  // Generate time slots (24 hours)
  const timeSlots: TimeSlot[] = Array.from({ length: 24 }, (_, i) => {
    const hour = i
    const timeLabel = `${hour.toString().padStart(2, '0')}:00`
    const isCurrentHour = currentTime.getHours() === hour && 
                         isSameDay(currentTime, currentDate)
    
    return {
      hour,
      timeLabel,
      isCurrentHour
    }
  })

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    onDateChange(newDate)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  // Get slots for a specific hour and day
  const getSlotsForHour = (date: Date, hour: number): ProviderScheduleSlot[] => {
    return scheduleSlots.filter(slot => {
      const slotStart = parseDateTime(slot.start_time)
      return isSameDay(slotStart, date) && slotStart.getHours() === hour
    })
  }

  // Calculate current time position for the moving indicator
  const getCurrentTimePosition = (): number => {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const totalMinutes = hours * 60 + minutes
    const dayMinutes = 24 * 60
    return (totalMinutes / dayMinutes) * 100
  }

  // Check if any day in current week is today
  const isCurrentWeek = weekDays.some(day => day.isToday)

  return (
    <>
    <Card className="shadow-lg border-0 bg-white">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header with Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateWeek('prev')}
                className="h-9 w-9 p-0 border-gray-200 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 min-h-[32px]">
                  <span className="text-2xl font-light text-gray-800 leading-tight">
                    {weekStart.toLocaleDateString('en-US', { month: 'short' })} {weekStart.getDate()} - {' '}
                    {weekStart.getMonth() !== new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).getMonth() 
                      ? new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short' }) + ' '
                      : ''
                    }
                    {new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).getDate()}
                  </span>
                  <span className="text-2xl font-light text-gray-600 leading-tight">
                    {weekStart.getFullYear()}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2 font-medium tracking-wide uppercase leading-none">Weekly View</p>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateWeek('next')}
                className="h-9 w-9 p-0 border-gray-200 hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToToday}
                className="border-gray-200 hover:bg-gray-50"
              >
                Today
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                className="border-gray-200 hover:bg-gray-50"
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="relative bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Scrollable Time Grid */}
            <div 
              ref={scrollContainerRef}
              className="relative overflow-y-auto max-h-[600px] scroll-smooth"
              style={{ scrollbarWidth: 'thin' }}
            >
              {/* Day Headers - moved inside scrollable container */}
              <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <div className="p-3 text-center font-medium text-gray-600 text-sm border-r border-gray-200">
                  Time
                </div>
                {weekDays.map((day) => (
                  <div 
                    key={day.date.toISOString()} 
                    className={`p-3 text-center border-r border-gray-200 transition-colors ${
                      day.isToday 
                        ? 'bg-blue-50 text-blue-900 font-semibold' 
                        : 'text-gray-700'
                    }`}
                  >
                    <div className="text-sm font-medium">{day.dayName}</div>
                    <div className={`text-lg font-bold mt-1 ${
                      day.isToday ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {day.dayNumber}
                    </div>
                    {day.isToday && (
                      <div className="text-xs text-blue-600 mt-1">TODAY</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="relative" ref={gridRef}>
              {/* Current Time Indicator */}
              {isCurrentWeek && (
                <div 
                  className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                  style={{ 
                    top: `${getCurrentTimePosition()}%`,
                    transform: 'translateY(-50%)'
                  }}
                >
                  <div className="w-16 bg-red-500 text-white text-xs px-2 py-1 rounded-r-full font-medium">
                    {currentTime.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: false 
                    })}
                  </div>
                  <div className="flex-1 h-0.5 bg-red-500"></div>
                </div>
              )}

              {/* Time Rows */}
              <div className="divide-y divide-gray-100">
                {timeSlots.map((timeSlot) => (
                  <div key={timeSlot.hour} className="grid grid-cols-8 min-h-[60px]">
                    {/* Time Label */}
                    <div className={`p-3 text-right text-sm border-r border-gray-200 flex items-start justify-end ${
                      timeSlot.isCurrentHour 
                        ? 'bg-red-50 text-red-700 font-medium' 
                        : 'text-gray-500'
                    }`}>
                      <span className="mt-1">{timeSlot.timeLabel}</span>
                    </div>

                    {/* Day Columns */}
                    {weekDays.map((day) => {
                      const hourSlots = getSlotsForHour(day.date, timeSlot.hour)
                      
                      return (
                        <div 
                          key={`${day.date.toISOString()}-${timeSlot.hour}`}
                          className={`border-r border-gray-200 p-1 min-h-[60px] relative ${
                            day.isToday 
                              ? 'bg-blue-50' 
                              : timeSlot.hour % 2 === 0 
                                ? 'bg-gray-50' 
                                : 'bg-white'
                          }`}
                        >
                          {hourSlots.map((slot) => {
                            const startTime = parseDateTime(slot.start_time)
                            const endTime = parseDateTime(slot.end_time)
                            const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60) // minutes
                            const startMinute = startTime.getMinutes()
                            
                            return (
                              <div
                                key={slot.id}
                                className={`absolute left-1 right-1 rounded-md p-1 text-xs transition-all hover:shadow-md ${
                                  slot.is_booked
                                    ? 'bg-red-100 border border-red-200 text-red-800 hover:bg-red-200 cursor-pointer'
                                    : 'bg-green-100 border border-green-200 text-green-800 cursor-default'
                                }`}
                                style={{
                                  top: `${(startMinute / 60) * 100}%`,
                                  height: `${Math.min((duration / 60) * 100, 100 - (startMinute / 60) * 100)}%`
                                }}
                                title={`${formatTimeSlot(startTime)} - ${formatTimeSlot(endTime)}${
                                  slot.is_booked ? ` (${slot.booking?.customer_name})` : ' (Available)'
                                }`}
                                onClick={() => {
                                  if (slot.is_booked && slot.booking) {
                                    setSelectedSlot(slot)
                                  }
                                }}
                              >
                                <div className="flex items-center gap-1">
                                  {slot.is_booked ? (
                                    <User className="h-3 w-3 flex-shrink-0" />
                                  ) : (
                                    <Clock className="h-3 w-3 flex-shrink-0" />
                                  )}
                                  <span className="truncate font-medium">
                                    {slot.is_booked 
                                      ? slot.booking?.customer_name || 'Booked' 
                                      : 'Available'
                                    }
                                  </span>
                                </div>
                                <div className="text-xs opacity-75 mt-0.5">
                                  {formatTimeSlot(startTime)} - {formatTimeSlot(endTime)}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>

          {/* Legend and Scroll Hint */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 border border-green-200" />
                <span className="text-gray-700">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
                <span className="text-gray-700">Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500" />
                <span className="text-gray-700">Current Time</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Scroll within the calendar to see full 24-hour timeline</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    
    {/* Booking Detail Modal */}
    {selectedSlot && selectedSlot.booking && (
      <BookingDetailModal 
        slot={selectedSlot} 
        onClose={() => setSelectedSlot(null)} 
      />
    )}
    </>
  )
} 