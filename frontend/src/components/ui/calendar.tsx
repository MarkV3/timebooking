"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, Button, Badge, Select } from "@/components/ui"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Plus, Settings, Home } from "lucide-react"

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
  attendee?: string
  category?: string
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  events: CalendarEvent[]
}

type CalendarView = 'month' | 'week' | 'day' | 'year'

interface EnhancedCalendarProps {
  events?: CalendarEvent[]
  onDateSelect?: (date: Date) => void
  onEventSelect?: (event: CalendarEvent) => void
  onViewChange?: (view: CalendarView) => void
  selectedDate?: Date
  className?: string
  showAddButton?: boolean
  onAddEvent?: () => void
}

const getEventTypeColor = (type: string): string => {
  switch (type) {
    case 'available':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'booked':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'unavailable':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getCategoryColor = (category?: string): string => {
  switch (category) {
    case 'Legal consultation':
      return 'bg-blue-500'
    case 'Team stand-up':
      return 'bg-yellow-500'
    case 'Religious service':
      return 'bg-purple-500'
    case 'Yoga class':
      return 'bg-pink-500'
    case 'Physical therapy':
      return 'bg-blue-400'
    case 'Photography session':
      return 'bg-orange-500'
    case 'Content planning':
      return 'bg-purple-400'
    case 'Budget review':
      return 'bg-orange-400'
    case 'Family reunion':
      return 'bg-pink-400'
    case 'Investor relations':
      return 'bg-purple-600'
    default:
      return 'bg-gray-500'
  }
}

export function EnhancedCalendar({
  events = [],
  onDateSelect,
  onEventSelect,
  onViewChange,
  selectedDate = new Date(),
  className = '',
  showAddButton = false,
  onAddEvent
}: EnhancedCalendarProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate)
  const [view, setView] = useState<CalendarView>('month')
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  useEffect(() => {
    setCurrentDate(selectedDate)
    setSelectedDay(selectedDate)
  }, [selectedDate])

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    
    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1))
        break
    }
    
    setCurrentDate(newDate)
  }

  const navigateToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDay(today)
    onDateSelect?.(today)
  }

  const handleViewChange = (newView: CalendarView) => {
    setView(newView)
    onViewChange?.(newView)
  }

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDay(day.date)
    onDateSelect?.(day.date)
  }

  // Helper function to get availability summary for a day
  const getAvailabilitySummary = (dayEvents: CalendarEvent[]) => {
    const availableSlots = dayEvents.filter(e => e.type === 'available').length
    const totalSlots = dayEvents.length
    const bookedSlots = dayEvents.filter(e => e.type === 'booked').length
    
    if (totalSlots === 0) {
      return { text: 'No slots', color: 'text-gray-400', bgColor: 'bg-gray-50' }
    }
    
    if (availableSlots === 0) {
      return { text: 'Fully booked', color: 'text-red-600', bgColor: 'bg-red-50' }
    }
    
    if (availableSlots === totalSlots) {
      return { text: `${availableSlots} available`, color: 'text-green-600', bgColor: 'bg-green-50' }
    }
    
    return { text: `${availableSlots}/${totalSlots} free`, color: 'text-blue-600', bgColor: 'bg-blue-50' }
  }

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    
    let startingDayOfWeek = firstDay.getDay()
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1

    const calendarDays: CalendarDay[] = []
    const today = new Date()

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayOfMonth = prevMonthLastDay - i
      const date = new Date(year, month - 1, dayOfMonth)
      const dayEvents = events.filter(event => 
        event.date.toDateString() === date.toDateString()
      )
      
      calendarDays.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        events: dayEvents
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const isToday = date.toDateString() === today.toDateString()
      const dayEvents = events.filter(event => 
        event.date.toDateString() === date.toDateString()
      )
      
      calendarDays.push({
        date,
        isCurrentMonth: true,
        isToday,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        events: dayEvents
      })
    }

    // Next month days
    const remainingDays = 42 - calendarDays.length
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      const dayEvents = events.filter(event => 
        event.date.toDateString() === date.toDateString()
      )
      
      calendarDays.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        events: dayEvents
      })
    }

    return calendarDays
  }

  const formatDate = (date: Date, format: 'full' | 'month' | 'day') => {
    switch (format) {
      case 'full':
        return date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      case 'month':
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        })
      case 'day':
        return date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        })
      default:
        return date.toLocaleDateString()
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    return `${hours.padStart(2, '0')}:${minutes}`
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  // Year View
  if (view === 'year') {
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(currentDate.getFullYear(), i, 1)
      const monthEvents = events.filter(event => 
        event.date.getMonth() === i && event.date.getFullYear() === currentDate.getFullYear()
      )
      
      return {
        date: monthDate,
        events: monthEvents
      }
    })

    return (
      <Card className={`w-full ${className} shadow-lg border-0 bg-card`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 bg-muted border-b">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('prev')}
              className="h-10 w-10 p-0 border-gray-200 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-2xl font-bold text-foreground">
              {currentDate.getFullYear()}
            </h2>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('next')}
              className="h-10 w-10 p-0 border-gray-200 hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={navigateToToday}
              className="h-10 px-3 border-gray-200 hover:bg-gray-100"
              title="Go to today"
            >
              <Home className="h-4 w-4 mr-1" />
              Today
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span className="font-medium">{events.length}</span>
              <span>events</span>
            </div>
            <Select 
              value={view} 
              onValueChange={(value: string) => handleViewChange(value as CalendarView)}
              options={[
                { value: 'month', label: 'Month' },
                { value: 'year', label: 'Year' }
              ]}
              className="w-[100px]"
            />
            {showAddButton && (
              <Button 
                onClick={onAddEvent}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="grid grid-cols-4 gap-6">
            {months.map((month, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border border-border hover:shadow-md transition-all cursor-pointer bg-card"
                onClick={() => {
                  setCurrentDate(month.date)
                  setView('month')
                }}
              >
                <div className="text-center">
                  <div className="font-semibold text-foreground mb-2">
                    {month.date.toLocaleDateString('en-US', { month: 'long' })}
                  </div>
                  <div className="flex justify-center gap-1 flex-wrap">
                    {month.events.slice(0, 5).map((event, eventIndex) => (
                      <div
                        key={eventIndex}
                        className={`w-2 h-2 rounded-full ${getCategoryColor(event.category)}`}
                      />
                    ))}
                    {month.events.length > 5 && (
                      <div className="text-xs text-muted-foreground ml-1">
                        +{month.events.length - 5}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {month.events.length} events
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Month View (default)
  const calendarDays = generateCalendarDays()
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <Card className={`w-full ${className} shadow-lg border-0 bg-card`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 bg-muted/60 backdrop-blur border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('prev')}
            className="h-10 w-10 p-0 border-gray-200 hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            {formatDate(currentDate, 'month')}
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('next')}
            className="h-10 w-10 p-0 border-gray-200 hover:bg-gray-100"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={navigateToToday}
            className="h-10 px-3 border-gray-200 hover:bg-gray-100"
            title="Go to today"
          >
            <Home className="h-4 w-4 mr-1" />
            Today
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <span className="font-medium">{events.length}</span>
            <span>events</span>
          </div>
          <Select 
            value={view} 
            onValueChange={(value: string) => handleViewChange(value as CalendarView)}
            options={[
              { value: 'month', label: 'Month' },
              { value: 'year', label: 'Year' }
            ]}
            className="w-[100px]"
          />
          {showAddButton && (
            <Button 
              onClick={onAddEvent}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Event
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {dayNames.map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-muted-foreground p-4 bg-muted rounded-lg">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, index) => {
              const hasEvents = day.events.length > 0
              const availabilitySummary = getAvailabilitySummary(day.events)
              
              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={`
                    min-h-[120px] p-3 border border-border rounded-xl transition-all cursor-pointer animate-fade-in
                    ${day.isCurrentMonth ? 'hover:shadow-lg hover:border-primary/40 bg-card' : 'opacity-40 bg-muted'}
                    ${day.isToday ? 'ring-2 ring-primary bg-primary/5' : ''}
                    ${selectedDay?.toDateString() === day.date.toDateString() ? 'bg-primary/10 border-primary/50' : ''}
                    ${day.isWeekend && day.isCurrentMonth ? 'bg-muted' : ''}
                  `}
                  style={{ animationDelay: `${index * 10}ms` }}
                >
                  <div className="flex flex-col h-full">
                    <div className={`text-sm font-semibold mb-2 ${day.isToday ? 'text-primary' : day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {day.date.getDate()}
                    </div>
                    
                    {hasEvents && day.isCurrentMonth && (
                      <div className="flex-1 flex flex-col justify-end">
                        <div className="space-y-2">
                          <div className={`text-xs px-2 py-1.5 rounded-md text-center border ${availabilitySummary.bgColor} ${availabilitySummary.color} border-current border-opacity-20`}>
                            <div className="font-medium">{availabilitySummary.text}</div>
                          </div>
                          <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
                            {(() => {
                              const total = day.events.length || 1
                              const available = day.events.filter(e => e.type === 'available').length
                              const booked = day.events.filter(e => e.type === 'booked').length
                              const availablePercent = (available / total) * 100
                              const bookedPercent = (booked / total) * 100
                              return (
                                <>
                                  <div className="absolute left-0 top-0 h-full bg-green-400/80" style={{ width: `${availablePercent}%` }} />
                                  <div className="absolute left-0 top-0 h-full bg-red-400/80" style={{ width: `${bookedPercent}%`, transform: `translateX(${availablePercent}%)` }} />
                                </>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-8 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Fully Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Partially Available</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 