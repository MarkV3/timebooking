"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, Button, Select } from "@/components/ui"
import { WeeklyTemplate } from "./WeeklyTemplate"
import { WeeklyCalendarView } from "./WeeklyCalendarView"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Plus, Grid, LayoutGrid, Star, Zap, CheckCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { apiService, type ServiceProvider, type ProviderScheduleSlot } from "@/lib/api"
import { parseDateTime, formatTimeSlot, isSameDay, normalizeDateString, formatDisplayDate } from "@/lib/utils"
import { TimezoneDisplay } from "@/contexts/TimezoneContext"

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  availability: 'available' | 'unavailable'
  slotsCount: number
  bookedCount: number
  bookingPercentage: number
}

interface TimeSlotDisplay {
  id: string
  start: string
  end: string
  isBooked: boolean
  customerName?: string
  bookingId?: string
  serviceName?: string
  serviceDescription?: string
  totalPrice?: number
}

const VIEW_MODES = {
  MONTHLY: 'monthly',
  WEEKLY: 'weekly'
} as const

type ViewMode = typeof VIEW_MODES.MONTHLY | typeof VIEW_MODES.WEEKLY

export function AvailabilityCalendar() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODES.WEEKLY)
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const [provider, setProvider] = useState<ServiceProvider | null>(null)
  const [scheduleSlots, setScheduleSlots] = useState<ProviderScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const yearDropdownRef = useRef<HTMLDivElement>(null)
  const monthDropdownRef = useRef<HTMLDivElement>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = new Date()

  // Load provider data and schedule
  useEffect(() => {
    if (user?.user_type === 'service_provider') {
      loadProviderData()
    }
  }, [user])

  // Reload schedule when date or view mode changes
  useEffect(() => {
    if (provider) {
      loadScheduleData()
    }
  }, [provider, currentDate, viewMode])

  const loadProviderData = async () => {
    try {
      setLoading(true)
      setError(null)
      const providerData = await apiService.getMyProviderProfile()
      setProvider(providerData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load provider data')
    } finally {
      setLoading(false)
    }
  }

  const loadScheduleData = async () => {
    try {
      setError(null)
      
      let startDate: string, endDate: string
      
      if (viewMode === VIEW_MODES.WEEKLY) {
        // Get schedule for current week and surrounding weeks for better UX
        const weekStart = getWeekStart(currentDate)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 13) // 2 weeks
        
        startDate = weekStart.toISOString().split('T')[0]
        endDate = weekEnd.toISOString().split('T')[0]
      } else {
        // Get schedule for current month
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        
        startDate = startOfMonth.toISOString().split('T')[0]
        endDate = endOfMonth.toISOString().split('T')[0]
      }
      
      const scheduleData = await apiService.getMyProviderSchedule(startDate, endDate)
      setScheduleSlots(scheduleData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule')
    }
  }

  // Helper function to get week start (same as in WeeklyCalendarView)
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday as start of week
    return new Date(d.setDate(diff))
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setShowYearDropdown(false)
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setShowMonthDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)
    setSelectedDay(null)
    setShowMonthDropdown(false)
    setShowYearDropdown(false)
  }

  const navigateYear = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)
    setSelectedDay(null)
    setShowMonthDropdown(false)
    setShowYearDropdown(false)
  }

  const handleYearChange = (newYear: number) => {
    const newDate = new Date(currentDate)
    newDate.setFullYear(newYear)
    setCurrentDate(newDate)
    setShowYearDropdown(false)
    setSelectedDay(null)
  }

  const handleMonthChange = (newMonth: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newMonth)
    setCurrentDate(newDate)
    setShowMonthDropdown(false)
    setSelectedDay(null)
  }

  const handleDayClick = (day: CalendarDay) => {
    if (day.isCurrentMonth) {
      setSelectedDay(day)
    }
  }

  // Helper function to get slots for a specific date
  const getSlotsForDate = (date: Date): ProviderScheduleSlot[] => {
    return scheduleSlots.filter(slot => {
      return isSameDay(parseDateTime(slot.start_time), date)
    })
  }

  // Helper function to get booking for a time slot
  const getBookingForSlot = (slotId: string): ProviderScheduleSlot | undefined => {
    return scheduleSlots.find(slot => slot.id === slotId)
  }

  // Generate year and month options
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    value: currentYear + i - 5,
    label: (currentYear + i - 5).toString()
  }))

  const monthOptions = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' }
  ]

  const getAvailabilityColor = (day: CalendarDay): string => {
    if (!day.isCurrentMonth) return 'bg-gray-50/70 border-gray-100 text-gray-400'
    
    if (day.slotsCount === 0) {
      return 'bg-gradient-to-br from-gray-50 to-gray-100/70 border-gray-200 text-gray-600 hover:from-gray-100 hover:to-gray-150 hover:shadow-md hover:border-gray-300'
    }
    
    // Enhanced but refined styling for days with slots
    const baseClasses = 'border transition-all duration-250 hover:scale-[1.01] hover:shadow-lg'
    
    if (day.bookingPercentage === 0) {
      return `${baseClasses} bg-gradient-to-br from-emerald-50 to-green-100/60 border-emerald-200 text-gray-900 hover:from-emerald-100 hover:to-green-150 hover:shadow-emerald-200/30 hover:border-emerald-300`
    } else if (day.bookingPercentage <= 0.3) {
      return `${baseClasses} bg-gradient-to-br from-green-50 to-lime-100/60 border-green-200 text-gray-900 hover:from-green-100 hover:to-lime-150 hover:shadow-green-200/30 hover:border-green-300`
    } else if (day.bookingPercentage <= 0.6) {
      return `${baseClasses} bg-gradient-to-br from-amber-50 to-yellow-100/60 border-amber-200 text-gray-900 hover:from-amber-100 hover:to-yellow-150 hover:shadow-amber-200/30 hover:border-amber-300`
    } else if (day.bookingPercentage < 1) {
      return `${baseClasses} bg-gradient-to-br from-orange-50 to-red-100/60 border-orange-200 text-gray-900 hover:from-orange-100 hover:to-red-150 hover:shadow-orange-200/30 hover:border-orange-300`
    } else {
      return `${baseClasses} bg-gradient-to-br from-red-50 to-red-100/60 border-red-200 text-gray-900 hover:from-red-100 hover:to-red-150 hover:shadow-red-200/30 hover:border-red-300`
    }
  }



  // Generate calendar days with real data
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1)
  let startingDayOfWeek = firstDay.getDay()
  startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1

  const calendarDays: CalendarDay[] = []

  // Previous month days
  const prevMonthYear = month === 0 ? year - 1 : year
  const prevMonthIndex = month === 0 ? 11 : month - 1
  const prevMonthLastDay = new Date(prevMonthYear, prevMonthIndex + 1, 0).getDate()
  
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayOfMonth = prevMonthLastDay - i
    const date = new Date(prevMonthYear, prevMonthIndex, dayOfMonth)
    calendarDays.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      availability: 'unavailable',
      slotsCount: 0,
      bookedCount: 0,
      bookingPercentage: 0,
    })
  }

  // Current month days with real data
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const isToday = date.toDateString() === today.toDateString()
    const daySlots = getSlotsForDate(date)
    
    let availability: CalendarDay['availability'] = 'unavailable'
    const slotsCount = daySlots.length
    const bookedCount = daySlots.filter(slot => slot.is_booked).length
    const bookingPercentage = slotsCount > 0 ? bookedCount / slotsCount : 0
    
    if (slotsCount > 0) {
      availability = bookedCount >= slotsCount ? 'unavailable' : 'available'
    }
    
    calendarDays.push({
      date,
      isCurrentMonth: true,
      isToday,
      availability,
      slotsCount,
      bookedCount,
      bookingPercentage,
    })
  }

  // Next month days
  const remainingDays = 42 - calendarDays.length
  const nextMonthYear = month === 11 ? year + 1 : year
  const nextMonthIndex = month === 11 ? 0 : month + 1
  
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(nextMonthYear, nextMonthIndex, day)
    calendarDays.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      availability: 'unavailable',
      slotsCount: 0,
      bookedCount: 0,
      bookingPercentage: 0,
    })
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const generateTimeSlots = (day: CalendarDay): TimeSlotDisplay[] => {
    const daySlots = getSlotsForDate(day.date)
    
    return daySlots.map(slot => {
      const startTime = parseDateTime(slot.start_time)
      const endTime = parseDateTime(slot.end_time)
      
      return {
        id: slot.id,
        start: startTime.toTimeString().slice(0, 5),
        end: endTime.toTimeString().slice(0, 5),
        isBooked: slot.is_booked,
        customerName: slot.booking ? slot.booking.customer_name : undefined,
        bookingId: slot.booking?.id,
        serviceName: slot.booking?.service_name,
        serviceDescription: slot.booking?.service_description,
        totalPrice: slot.booking?.total_price
      }
    })
  }

  if (loading) {
    return (
      <Card className="shadow-lg border-0 bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading calendar...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="shadow-lg border-0 bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadProviderData} variant="outline">
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (selectedDay) {
    return (
      <div className="space-y-6 animate-slide-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {formatDisplayDate(selectedDay.date, 'full')}
            </h2>
            <TimezoneDisplay />
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-gray-200 hover:bg-gray-50"
              onClick={() => alert('Mark day unavailable - feature coming soon')}
            >
              Mark Unavailable
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-gray-200 hover:bg-gray-50"
              onClick={() => alert('Mark time slots as occupied - feature coming soon')}
            >
              Mark Occupied
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSelectedDay(null)}
              className="border-gray-200 hover:bg-gray-50"
            >
              ← Back to Calendar
            </Button>
          </div>
        </div>
        
        <Card className="shadow-lg border-0 bg-white">
          <CardContent className="p-6">
            {getSlotsForDate(selectedDay.date).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No time slots available for this date</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {generateTimeSlots(selectedDay).map((slot, index) => (
                  <div
                    key={slot.id}
                    className={`
                      group p-4 rounded-xl border cursor-pointer transition-all animate-fade-in
                      ${slot.isBooked 
                        ? 'bg-red-50 border-red-200 hover:bg-red-100 hover:shadow-md' 
                        : 'bg-green-50 border-green-200 hover:bg-green-100 hover:shadow-md'}
                    `}
                    style={{ animationDelay: `${index * 20}ms` }}
                    onClick={() => {
                      if (!slot.isBooked) {
                        const action = confirm('Mark this slot as occupied?')
                        if (action) alert('Time slot marked as occupied - feature coming soon')
                      }
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${slot.isBooked ? 'bg-red-500' : 'bg-green-500'}`} />
                          <div className="font-semibold text-gray-900">
                            {slot.start} - {slot.end}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {slot.isBooked ? (
                            <>
                              <User className="h-4 w-4 text-red-600" />
                              <span className="text-red-900">Booked by {slot.customerName}</span>
                            </>
                          ) : (
                            <>
                              <CalendarIcon className="h-4 w-4 text-green-600" />
                              <span className="text-green-900 font-medium">Available</span>
                            </>
                          )}
                        </div>
                      </div>
                      {slot.isBooked && slot.serviceName && (
                        <div className="pl-6 space-y-1 border-l-2 border-red-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
                                <span className="text-blue-600 text-xs font-bold">S</span>
                              </div>
                              <span className="font-medium text-gray-800">{slot.serviceName}</span>
                            </div>
                            {slot.totalPrice && (
                              <span className="text-green-600 font-semibold">
                                ${slot.totalPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                          {slot.serviceDescription && (
                            <p className="text-sm text-gray-600 pl-6">
                              {slot.serviceDescription}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show weekly view
  if (viewMode === VIEW_MODES.WEEKLY) {
    return (
      <div className="space-y-5">
        {/* View Toggle */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 bg-gradient-to-r from-white to-gray-50 rounded-xl p-1.5 shadow-sm border border-gray-200">
            <Button
              variant={viewMode === VIEW_MODES.MONTHLY ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode(VIEW_MODES.MONTHLY)}
              className={`h-9 px-4 transition-all duration-200 ${
                viewMode === VIEW_MODES.MONTHLY 
                  ? 'bg-gradient-to-r from-primary to-blue-600 shadow-md shadow-blue-200/40' 
                  : 'hover:bg-white hover:shadow-sm'
              }`}
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              Monthly
            </Button>
            <Button
              variant={viewMode === VIEW_MODES.WEEKLY ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode(VIEW_MODES.WEEKLY)}
              className={`h-9 px-4 transition-all duration-200 ${
                viewMode === VIEW_MODES.WEEKLY 
                  ? 'bg-gradient-to-r from-primary to-blue-600 shadow-md shadow-blue-200/40' 
                  : 'hover:bg-white hover:shadow-sm'
              }`}
            >
              <Grid className="h-4 w-4 mr-1.5" />
              Weekly
            </Button>
          </div>
          <TimezoneDisplay />
        </div>

        <WeeklyCalendarView
          scheduleSlots={scheduleSlots}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onRefresh={loadScheduleData}
        />
      </div>
    )
  }

  // Monthly view
  return (
    <div className="space-y-5">
      {/* View Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 bg-gradient-to-r from-white to-gray-50 rounded-xl p-1.5 shadow-sm border border-gray-200">
          <Button
            variant={viewMode === VIEW_MODES.MONTHLY ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode(VIEW_MODES.MONTHLY)}
            className={`h-9 px-4 transition-all duration-200 ${
              viewMode === VIEW_MODES.MONTHLY 
                ? 'bg-gradient-to-r from-primary to-blue-600 shadow-md shadow-blue-200/40' 
                : 'hover:bg-white hover:shadow-sm'
            }`}
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            Monthly
          </Button>
          <Button
            variant={viewMode === VIEW_MODES.WEEKLY ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode(VIEW_MODES.WEEKLY)}
            className={`h-9 px-4 transition-all duration-200 ${
              viewMode === VIEW_MODES.WEEKLY 
                ? 'bg-gradient-to-r from-primary to-blue-600 shadow-md shadow-blue-200/40' 
                : 'hover:bg-white hover:shadow-sm'
            }`}
          >
            <Grid className="h-4 w-4 mr-1.5" />
            Weekly
          </Button>
        </div>
        <TimezoneDisplay />
      </div>

      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50/20 backdrop-blur-sm">
        <CardContent className="p-7">
          <div className="space-y-7">
            {/* Header with Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                {/* Month Navigation */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigateMonth('prev')}
                  className="h-10 w-10 p-0 border-2 border-gray-200 hover:border-gray-300 hover:bg-white hover:shadow-md transition-all duration-200 rounded-xl"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 min-h-[36px]">
                    <div className="relative" ref={monthDropdownRef}>
                      <button
                        onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                        className="px-5 py-1.5 text-2xl font-light text-gray-800 hover:text-primary transition-all duration-200 border-none bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-xl leading-tight hover:bg-white/40"
                      >
                        {monthOptions[month].label}
                      </button>
                      {showMonthDropdown && (
                        <div className="absolute top-full left-0 mt-2 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl z-10 min-w-full max-h-80 overflow-y-auto animate-slide-in">
                          {monthOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => handleMonthChange(option.value)}
                              className={`w-full px-5 py-3 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-primary/5 first:rounded-t-xl last:rounded-b-xl transition-all duration-200 font-medium ${
                                option.value === month ? 'bg-gradient-to-r from-blue-50 to-primary/10 text-primary border-l-3 border-primary' : 'text-gray-700'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="relative" ref={yearDropdownRef}>
                      <button
                        onClick={() => setShowYearDropdown(!showYearDropdown)}
                        className="px-3 py-1.5 text-2xl font-light text-gray-600 hover:text-gray-800 transition-all duration-200 border-none bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-xl leading-tight hover:bg-white/40"
                      >
                        {year}
                      </button>
                      {showYearDropdown && (
                        <div className="absolute top-full left-0 mt-2 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl z-10 min-w-full animate-slide-in">
                          {yearOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => handleYearChange(option.value)}
                              className={`w-full px-5 py-3 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-primary/5 first:rounded-t-xl last:rounded-b-xl transition-all duration-200 font-medium ${
                                option.value === year ? 'bg-gradient-to-r from-blue-50 to-primary/10 text-primary border-l-3 border-primary' : 'text-gray-700'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse"></div>
                    <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">Monthly Overview</p>
                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse"></div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigateMonth('next')}
                  className="h-10 w-10 p-0 border-2 border-gray-200 hover:border-gray-300 hover:bg-white hover:shadow-md transition-all duration-200 rounded-xl"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const today = new Date()
                    setCurrentDate(today)
                    setSelectedDay(null)
                  }}
                  className="border-2 border-gray-200 hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all duration-200 px-5 h-9 rounded-lg font-medium"
                >
                  <CalendarIcon className="h-4 w-4 mr-1.5" />
                  Today
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadScheduleData}
                  className="border-2 border-gray-200 hover:border-secondary hover:bg-secondary/5 hover:shadow-md transition-all duration-200 px-5 h-9 rounded-lg font-medium"
                >
                  <Zap className="h-4 w-4 mr-1.5" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden shadow-sm">
              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-gradient-to-r from-gray-50 to-gray-100/40 border-b-2 border-gray-200">
                {dayNames.map((dayName) => (
                  <div 
                    key={dayName} 
                    className="p-4 text-center font-semibold text-gray-700 text-sm tracking-wide"
                  >
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-0">
                {calendarDays.map((day, index) => {
                  return (
                    <div
                      key={index}
                      className={`
                        group relative min-h-[110px] border-r border-b border-gray-100 cursor-pointer transition-all duration-250 ease-out
                        ${getAvailabilityColor(day)}
                        ${day.isToday ? 'ring-3 ring-primary/40 ring-inset shadow-lg shadow-primary/15' : ''}
                      `}
                      onClick={() => handleDayClick(day)}
                    >
                      <div className="p-3 h-full flex flex-col relative overflow-hidden">
                        {/* Today indicator */}
                        {day.isToday && (
                          <div className="absolute top-2 right-2">
                            <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-md animate-pulse"></div>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-2.5">
                          <span className={`
                            text-lg font-bold transition-all duration-200
                            ${day.isToday ? 'text-primary scale-105' : ''} 
                            ${!day.isCurrentMonth ? 'text-gray-400' : 'text-gray-800'}
                          `}>
                            {day.date.getDate()}
                          </span>
                          {day.isCurrentMonth && day.slotsCount > 0 && (
                            <div className="text-right bg-white/70 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm">
                              <div className="text-xs font-bold text-gray-800">
                                {day.slotsCount - day.bookedCount}
                              </div>
                              <div className="text-xs text-gray-600 -mt-0.5 font-medium">
                                open
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {day.isCurrentMonth && day.slotsCount > 0 && (
                          <div className="flex-1 flex flex-col justify-end">
                            <div className="space-y-2">
                              {/* Status indicator with subtle icon */}
                              <div className="flex items-center justify-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-lg py-1.5 px-2 shadow-sm">
                                {day.bookedCount === 0 ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 text-emerald-600" />
                                    <span className="text-xs font-semibold text-emerald-700">
                                      Available
                                    </span>
                                  </>
                                ) : day.bookedCount === day.slotsCount ? (
                                  <>
                                    <Clock className="h-3 w-3 text-red-600" />
                                    <span className="text-xs font-semibold text-red-700">
                                      Fully Booked
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Star className="h-3 w-3 text-amber-600" />
                                    <span className="text-xs font-semibold text-amber-700">
                                      {day.bookedCount}/{day.slotsCount} Booked
                                    </span>
                                  </>
                                )}
                              </div>
                              
                              {/* Enhanced progress bar with meaningful gradients */}
                              <div className="relative w-full h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                                {/* Available portion (left side) with purpose-driven colors */}
                                {day.bookingPercentage < 1 && (
                                  <div 
                                    className={`
                                      absolute left-0 top-0 h-full transition-all duration-600 ease-out rounded-l-full
                                      ${day.bookingPercentage === 0 ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-sm shadow-green-300/40' :
                                        day.bookingPercentage <= 0.3 ? 'bg-gradient-to-r from-green-400 to-lime-500 shadow-sm shadow-green-300/40' :
                                        day.bookingPercentage <= 0.6 ? 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-sm shadow-yellow-300/40' :
                                        day.bookingPercentage <= 0.8 ? 'bg-gradient-to-r from-orange-400 to-red-400 shadow-sm shadow-orange-300/40' : 'bg-gradient-to-r from-red-400 to-red-500 shadow-sm shadow-red-300/40'
                                      }
                                    `}
                                    style={{
                                      width: `${(1 - day.bookingPercentage) * 100}%`
                                    }}
                                  />
                                )}
                                
                                {/* Booked portion (right side) with clear visual purpose */}
                                {day.bookingPercentage > 0 && (
                                  <div 
                                    className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-500 to-red-600 rounded-r-full transition-all duration-600 ease-out shadow-sm shadow-red-300/40"
                                    style={{
                                      width: `${day.bookingPercentage * 100}%`
                                    }}
                                  />
                                )}
                                
                                {/* Subtle shine effect for visual feedback */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-pulse opacity-40"></div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {day.isCurrentMonth && day.slotsCount === 0 && (
                          <div className="flex-1 flex items-center justify-center">
                            <div className="text-center bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
                              <div className="text-xs text-gray-500 font-medium">
                                No slots available
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Subtle hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 