"use client"

import { useEffect, useState } from "react"
import { WeeklyCalendarView } from "./WeeklyCalendarView"
import { useAuth } from "@/contexts/AuthContext"
import { apiService, type ProviderScheduleSlot } from "@/lib/api"
import { TimezoneDisplay } from "@/contexts/TimezoneContext"

interface AvailabilityCalendarProps {
  refreshToken?: number
}

export function AvailabilityCalendar({ refreshToken = 0 }: AvailabilityCalendarProps) {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [scheduleSlots, setScheduleSlots] = useState<ProviderScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadScheduleData = async (targetDate: Date = currentDate) => {
    try {
      setLoading(true)
      setError(null)

      const weekStart = getWeekStart(targetDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 13)

      const startDate = weekStart.toISOString().split("T")[0]
      const endDate = weekEnd.toISOString().split("T")[0]
      const scheduleData = await apiService.getMyProviderSchedule(startDate, endDate)
      setScheduleSlots(scheduleData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedule")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.user_type !== "service_provider") return
    void loadScheduleData(currentDate)
  }, [user, currentDate, refreshToken])

  const getWeekStart = (date: Date): Date => {
    const copy = new Date(date)
    const day = copy.getDay()
    const diff = copy.getDate() - day + (day === 0 ? -6 : 1)
    copy.setDate(diff)
    copy.setHours(0, 0, 0, 0)
    return copy
  }

  const handleRefresh = () => {
    void loadScheduleData()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Weekly calendar</h2>
          <p className="text-sm text-muted-foreground">
            Review your upcoming availability and bookings.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          <TimezoneDisplay />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-muted-foreground/50">
          <div className="text-sm text-muted-foreground">Loading calendar…</div>
        </div>
      ) : (
        <WeeklyCalendarView
          scheduleSlots={scheduleSlots}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  )
}
