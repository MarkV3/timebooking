"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button, Card, CardContent } from "@/components/ui"
import { ChevronLeft, ChevronRight, Clock, MessageSquare, User, X } from "lucide-react"
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

const INTERVAL_MINUTES = 30
const ROW_HEIGHT = 48
const TOTAL_DAY_MINUTES = 24 * 60

function BookingDetailModal({ slot, onClose }: BookingDetailModalProps) {
  useEffect(() => {
    if (!slot || !slot.booking) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [slot, onClose])

  if (!slot || !slot.booking) return null

  let startTime: Date
  let endTime: Date
  try {
    startTime = parseDateTime(slot.start_time)
    endTime = parseDateTime(slot.end_time)
  } catch (error) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="max-w-md w-full mx-4 overflow-hidden rounded-xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Booking details</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {formatTimeSlot(startTime)} – {formatTimeSlot(endTime)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDisplayDate(startTime, "full")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {slot.booking.customer_name || "Unknown customer"}
              </p>
              <p className="text-xs text-muted-foreground">
                {slot.booking.customer_email || "No email provided"}
              </p>
            </div>
          </div>

          {slot.booking.notes && (
            <div className="rounded-lg bg-muted px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Customer notes
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{slot.booking.notes}</p>
            </div>
          )}
        </div>
        <div className="border-t border-border px-6 py-4 text-right">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

export function WeeklyCalendarView({ scheduleSlots, currentDate, onDateChange, onRefresh }: WeeklyCalendarViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState<ProviderScheduleSlot | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60_000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!scheduleSlots.length) return

    const earliestMinutes = Math.min(
      ...scheduleSlots.map((slot) => {
        try {
          const start = parseDateTime(slot.start_time)
          return start.getHours() * 60 + start.getMinutes()
        } catch (error) {
          return TOTAL_DAY_MINUTES
        }
      })
    )

    const scrollMinutes = Math.max(0, earliestMinutes - 60)
    const intervalIndex = Math.floor(scrollMinutes / INTERVAL_MINUTES)
    const scrollPosition = intervalIndex * ROW_HEIGHT

    requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: scrollPosition, behavior: "smooth" })
    })
  }, [scheduleSlots])

  const getWeekStart = (date: Date): Date => {
    const copy = new Date(date)
    const day = copy.getDay()
    const diff = copy.getDate() - day + (day === 0 ? -6 : 1)
    copy.setDate(diff)
    copy.setHours(0, 0, 0, 0)
    return copy
  }

  const weekStart = getWeekStart(currentDate)

  const weekDays: WeekDay[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + index)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const slotsForDay = scheduleSlots.filter((slot) => {
        try {
          return isSameDay(parseDateTime(slot.start_time), date)
        } catch (error) {
          return false
        }
      })

      return {
        date,
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        dayNumber: date.getDate(),
        isToday: date.toDateString() === today.toDateString(),
        slots: slotsForDay,
      }
    })
  }, [scheduleSlots, weekStart])

  const timeSlots = useMemo(() => {
    return Array.from({ length: (24 * 60) / INTERVAL_MINUTES }, (_, index) => {
      const totalMinutes = index * INTERVAL_MINUTES
      const hour = Math.floor(totalMinutes / 60)
      const minute = totalMinutes % 60
      return {
        label: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
        isHourMarker: minute === 0,
      }
    })
  }, [])

  const navigateWeek = (direction: "prev" | "next") => {
    const nextDate = new Date(currentDate)
    nextDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7))
    onDateChange(nextDate)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const currentTimePosition = () => {
    const now = new Date()
    const minutes = now.getHours() * 60 + now.getMinutes()
    return (minutes / TOTAL_DAY_MINUTES) * 100
  }

  const isCurrentWeek = weekDays.some((day) => day.isToday)

  return (
    <>
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigateWeek("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Week of</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatDisplayDate(weekStart, "monthDay")}{" "}
                  – {formatDisplayDate(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000), "monthDay")}
                </p>
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigateWeek("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card">
            <div
              ref={scrollContainerRef}
              className="max-h-[600px] overflow-y-auto"
              style={{ scrollbarWidth: "thin" }}
            >
              <div className="grid min-w-[720px] grid-cols-[72px_repeat(7,minmax(0,1fr))] text-sm">
                <div className="sticky left-0 z-10 bg-card">
                  <div
                    className="grid"
                    style={{ gridTemplateRows: `repeat(${timeSlots.length}, ${ROW_HEIGHT}px)` }}
                  >
                    {timeSlots.map((slot, index) => (
                      <div
                        key={slot.label}
                        className={`flex items-start justify-end border-b border-border px-2 pt-2 text-[11px] text-muted-foreground ${
                          slot.isHourMarker ? "font-medium text-foreground" : ""
                        }`}
                      >
                        {slot.isHourMarker ? slot.label : ""}
                      </div>
                    ))}
                  </div>
                </div>

                {weekDays.map((day) => (
                  <div key={day.date.toISOString()} className="relative border-l border-border/60">
                    <div className="border-b border-border/80 bg-muted/70 px-3 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span className="block text-sm font-semibold text-foreground">{day.dayName}</span>
                      <span className={`text-xs ${day.isToday ? "text-primary" : "text-muted-foreground"}`}>
                        {day.dayNumber}
                      </span>
                    </div>
                    <div className="relative">
                      <div
                        className="grid"
                        style={{ gridTemplateRows: `repeat(${timeSlots.length}, ${ROW_HEIGHT}px)` }}
                      >
                        {timeSlots.map((_, index) => (
                          <div
                            key={`${day.date.toISOString()}-${index}`}
                            className={`border-b border-border/40 ${
                              index % 2 === 0 ? "bg-background" : "bg-muted/40"
                            } ${day.isToday ? "bg-primary/5" : ""}`}
                          />
                        ))}
                      </div>

                      <div className="pointer-events-none absolute inset-0">
                        {isCurrentWeek && day.isToday && (
                          <div
                            className="absolute left-0 right-0"
                            style={{ top: `${currentTimePosition()}%` }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-px flex-1 bg-rose-500" />
                              <span className="pointer-events-auto rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-medium text-white">
                                {currentTime.toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="absolute inset-0">
                        {day.slots.map((slot) => {
                          let startMinutes = 0
                          let endMinutes = 0
                          try {
                            const start = parseDateTime(slot.start_time)
                            const end = parseDateTime(slot.end_time)
                            startMinutes = start.getHours() * 60 + start.getMinutes()
                            endMinutes = end.getHours() * 60 + end.getMinutes()
                          } catch (error) {
                            return null
                          }

                          const duration = Math.max(endMinutes - startMinutes, INTERVAL_MINUTES / 2)
                          const topPercent = (startMinutes / TOTAL_DAY_MINUTES) * 100
                          const maxHeight = 100 - topPercent
                          const heightPercent = Math.min((duration / TOTAL_DAY_MINUTES) * 100, maxHeight)
                          const minHeightPercent = (INTERVAL_MINUTES / TOTAL_DAY_MINUTES) * 100
                          const finalHeight = Math.max(heightPercent, minHeightPercent)

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              className={`group absolute left-2 right-2 rounded-md border px-3 py-2 text-left text-xs shadow-sm transition-colors ${
                                slot.is_booked
                                  ? "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              }`}
                              style={{ top: `${topPercent}%`, height: `${finalHeight}%` }}
                              onClick={() => {
                                if (slot.is_booked && slot.booking) {
                                  setSelectedSlot(slot)
                                }
                              }}
                            >
                              <p className="font-medium">
                                {slot.is_booked ? slot.booking?.customer_name ?? "Booked" : "Available"}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {formatTimeSlot(parseDateTime(slot.start_time))} – {formatTimeSlot(parseDateTime(slot.end_time))}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-emerald-200" /> Available
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-rose-200" /> Booked
              </span>
            </div>
            <p>Scroll to explore the full day</p>
          </div>
        </CardContent>
      </Card>

      {selectedSlot && selectedSlot.booking && (
        <BookingDetailModal slot={selectedSlot} onClose={() => setSelectedSlot(null)} />
      )}
    </>
  )
}
