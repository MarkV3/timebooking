"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, Button, Checkbox, Select } from "@/components/ui"
import { Clock, Calendar, Plus, Trash2, Save, AlertCircle, Settings } from "lucide-react"
import { apiService } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { stripSeconds } from "@/lib/utils"

// Types
interface RecurringSchedule {
  defaultStartTime: string
  defaultEndTime: string
  defaultSlotDuration: number
  enabledDays: number[] // 0=Sunday, 1=Monday, etc.
  breakTime?: {
    startTime: string
    endTime: string
  }
  dayOverrides: DayOverride[]
}

interface DayOverride {
  dayOfWeek: number
  startTime?: string
  endTime?: string
  slotDuration?: number
  isUnavailable?: boolean
  breakTime?: {
    startTime: string
    endTime: string
  }
}

interface SpecificOverride {
  id: string
  date: string
  endDate?: string // For period overrides
  type: 'unavailable' | 'custom_schedule' | 'break_change'
  reason?: string
  customSchedule?: {
    startTime: string
    endTime: string
    slotDuration: number
  }
  customBreak?: {
    startTime: string
    endTime: string
  }
}

interface PreviewSlot {
  time: string
  status: 'available' | 'break' | 'unavailable'
  reason?: string
}

// Constants
const daysOfWeek = [
  { value: 1, label: "Mon", name: "Monday" },
  { value: 2, label: "Tue", name: "Tuesday" },
  { value: 3, label: "Wed", name: "Wednesday" },
  { value: 4, label: "Thu", name: "Thursday" },
  { value: 5, label: "Fri", name: "Friday" },
  { value: 6, label: "Sat", name: "Saturday" },
  { value: 0, label: "Sun", name: "Sunday" }
]

const timeOptions = Array.from({ length: 24 * 2 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minute = i % 2 === 0 ? '00' : '30'
  const time = `${hour.toString().padStart(2, '0')}:${minute}`
  return { value: time, label: time }
})

const slotDurationOptions = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" }
]

export function NewTimeSlotManager() {
  const { user } = useAuth()
  
  // State for recurring schedule
  const [recurringSchedule, setRecurringSchedule] = useState<RecurringSchedule>({
    defaultStartTime: "09:00",
    defaultEndTime: "17:00",
    defaultSlotDuration: 30,
    enabledDays: [1, 2, 3, 4, 5], // Monday to Friday
    dayOverrides: []
  })

  // State for specific overrides
  const [specificOverrides, setSpecificOverrides] = useState<SpecificOverride[]>([])
  
  // Preview states
  const [previewDay, setPreviewDay] = useState<number>(1) // Monday
  const [previewDate, setPreviewDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )

  // UI states
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [loading, setLoading] = useState(true) // Start with loading=true to prevent showing defaults
  const [error, setError] = useState<string>('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false)

  // Load data on component mount
  useEffect(() => {
    if (user?.id) {
      loadScheduleData()
    }
  }, [user?.id])

  // Track changes to update preview immediately
  useEffect(() => {
    // Only track changes after initial data has been loaded
    if (hasLoadedInitialData) {
      // Mark as having unsaved changes only after initial load
      setHasUnsavedChanges(true)
    }
  }, [recurringSchedule, hasLoadedInitialData])

  // Load schedule data from API
  const loadScheduleData = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')

      // Load templates and overrides
      const [templates, overrides] = await Promise.all([
        apiService.getMyAvailabilityTemplates(),
        apiService.getMyAvailabilityOverrides()
      ])

      // Convert backend data to our format
      if (templates.length > 0) {
        const schedule = convertTemplatesToSchedule(templates)
        setRecurringSchedule(schedule)
      } else {
        // Only set defaults when no templates exist (new user)
        const defaultSchedule = {
          defaultStartTime: "09:00",
          defaultEndTime: "17:00",
          defaultSlotDuration: 30,
          enabledDays: [1, 2, 3, 4, 5], // Monday to Friday
          dayOverrides: []
        }
        setRecurringSchedule(defaultSchedule)
      }

      if (overrides.length > 0) {
        const formattedOverrides = convertOverridesToSpecific(overrides)
        setSpecificOverrides(formattedOverrides)
      }

      setHasLoadedInitialData(true)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule data')
      
      // Set defaults even if loading fails, but only if we haven't loaded data before
      if (!hasLoadedInitialData) {
        setRecurringSchedule({
          defaultStartTime: "09:00",
          defaultEndTime: "17:00",
          defaultSlotDuration: 30,
          enabledDays: [1, 2, 3, 4, 5],
          dayOverrides: []
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // Convert backend templates to our schedule format
  const convertTemplatesToSchedule = (templates: any[]): RecurringSchedule => {
    const enabledTemplates = templates.filter(t => t.is_enabled)
    const enabledDays = enabledTemplates.map(t => t.day_of_week)

    if (enabledTemplates.length === 0) {
      return {
        defaultStartTime: "09:00",
        defaultEndTime: "17:00", 
        defaultSlotDuration: 30,
        enabledDays: [1, 2, 3, 4, 5],
        dayOverrides: []
      }
    }

    // Find the most common schedule pattern across all enabled days
    const schedulePatterns = enabledTemplates.map(t => ({
      startTime: stripSeconds(t.start_time),
      endTime: stripSeconds(t.end_time),
      slotDuration: t.slot_duration,
      breakTime: t.break_start_time && t.break_end_time ? {
        startTime: stripSeconds(t.break_start_time),
        endTime: stripSeconds(t.break_end_time)
      } : undefined
    }))

    // Count occurrences of each pattern to find the most common
    const patternCounts = new Map<string, { pattern: any, count: number }>()
    
    schedulePatterns.forEach(pattern => {
      const key = JSON.stringify(pattern)
      if (patternCounts.has(key)) {
        patternCounts.get(key)!.count++
      } else {
        patternCounts.set(key, { pattern, count: 1 })
      }
    })

    // Get the most common pattern as defaults
    let mostCommonPattern = Array.from(patternCounts.values())
      .sort((a, b) => b.count - a.count)[0]?.pattern

    if (!mostCommonPattern) {
      mostCommonPattern = schedulePatterns[0]
    }

    const defaultStartTime = mostCommonPattern.startTime
    const defaultEndTime = mostCommonPattern.endTime
    const defaultSlotDuration = mostCommonPattern.slotDuration
    const defaultBreakTime = mostCommonPattern.breakTime

    // Check if all templates are identical - if so, don't create any overrides
    const allTemplatesIdentical = enabledTemplates.every(t => {
      const normalizedStart = stripSeconds(t.start_time)
      const normalizedEnd = stripSeconds(t.end_time)
      const breakStart = t.break_start_time ? stripSeconds(t.break_start_time) : undefined
      const breakEnd = t.break_end_time ? stripSeconds(t.break_end_time) : undefined
      
      return normalizedStart === defaultStartTime &&
             normalizedEnd === defaultEndTime &&
             t.slot_duration === defaultSlotDuration &&
             breakStart === defaultBreakTime?.startTime &&
             breakEnd === defaultBreakTime?.endTime
    })

    // Only create day overrides for days that actually differ from the most common pattern
    const dayOverrides: DayOverride[] = allTemplatesIdentical ? [] : enabledTemplates
      .filter(t => {
        const normalizedTemplateStart = stripSeconds(t.start_time)
        const normalizedTemplateEnd = stripSeconds(t.end_time)
        
        // Check if this day differs from the most common pattern
        const differsInTime = normalizedTemplateStart !== defaultStartTime || normalizedTemplateEnd !== defaultEndTime
        const differsInDuration = t.slot_duration !== defaultSlotDuration
        
        // Break time comparison - be more explicit about undefined/null handling
        const templateBreakStart = t.break_start_time ? stripSeconds(t.break_start_time) : undefined
        const templateBreakEnd = t.break_end_time ? stripSeconds(t.break_end_time) : undefined
        const defaultBreakStart = defaultBreakTime?.startTime
        const defaultBreakEnd = defaultBreakTime?.endTime
        
        const differsInBreak = templateBreakStart !== defaultBreakStart || templateBreakEnd !== defaultBreakEnd
        
        // Only create override if there's an actual difference
        const hasDifference = differsInTime || differsInDuration || differsInBreak
        
        // Debug logging to understand what's happening (remove in production)
        if (hasDifference) {
          console.log(`Day ${t.day_of_week} marked as override:`, {
            differsInTime: differsInTime,
            differsInDuration: differsInDuration, 
            differsInBreak: differsInBreak,
            templateStart: normalizedTemplateStart,
            defaultStart: defaultStartTime,
            templateEnd: normalizedTemplateEnd,
            defaultEnd: defaultEndTime,
            templateDuration: t.slot_duration,
            defaultDuration: defaultSlotDuration
          })
        }
        
        return hasDifference
      })
      .map(t => ({
        dayOfWeek: t.day_of_week,
        startTime: stripSeconds(t.start_time),
        endTime: stripSeconds(t.end_time),
        slotDuration: t.slot_duration,
        breakTime: t.break_start_time && t.break_end_time ? {
          startTime: stripSeconds(t.break_start_time),
          endTime: stripSeconds(t.break_end_time)
        } : undefined
      }))

    return {
      defaultStartTime,
      defaultEndTime,
      defaultSlotDuration,
      enabledDays,
      dayOverrides,
      breakTime: defaultBreakTime
    }
  }

  // Convert backend overrides to our format
  const convertOverridesToSpecific = (overrides: any[]): SpecificOverride[] => {
    return overrides.map(override => ({
      id: override.id,
      date: override.override_date,
      type: override.is_unavailable ? 'unavailable' as const : 'custom_schedule' as const,
      reason: override.reason,
      customSchedule: override.custom_slots?.length > 0 ? {
        startTime: stripSeconds(override.custom_slots[0].start_time),
        endTime: stripSeconds(override.custom_slots[override.custom_slots.length - 1].end_time),
        slotDuration: 30 // Default, could be calculated from slots
      } : undefined
    }))
  }



  // Update recurring schedule
  const updateRecurringSchedule = (updates: Partial<RecurringSchedule>) => {
    setRecurringSchedule(prev => ({ ...prev, ...updates }))
    setHasUnsavedChanges(true)
  }

  // Update day override
  const updateDayOverride = (dayOfWeek: number, override: Partial<DayOverride>) => {
    setRecurringSchedule(prev => ({
      ...prev,
      dayOverrides: prev.dayOverrides.filter(d => d.dayOfWeek !== dayOfWeek)
        .concat([{ dayOfWeek, ...override }])
    }))
    setHasUnsavedChanges(true)
  }

  // Remove day override
  const removeDayOverride = (dayOfWeek: number) => {
    setRecurringSchedule(prev => ({
      ...prev,
      dayOverrides: prev.dayOverrides.filter(d => d.dayOfWeek !== dayOfWeek)
    }))
    setHasUnsavedChanges(true)
  }

  // Add specific override
  const addSpecificOverride = (override: Omit<SpecificOverride, 'id'>) => {
    const newOverrides: SpecificOverride[] = []
    
    if (override.endDate) {
      // Create overrides for date range
      const startDate = new Date(override.date)
      const endDate = new Date(override.endDate)
      const currentDate = new Date(startDate)
      
      while (currentDate <= endDate) {
        newOverrides.push({
          ...override,
          id: `${Date.now()}-${currentDate.getTime()}`,
          date: currentDate.toISOString().split('T')[0],
          endDate: undefined // Individual overrides don't need endDate
        })
        currentDate.setDate(currentDate.getDate() + 1)
      }
    } else {
      // Single day override
      newOverrides.push({
        ...override,
        id: Date.now().toString()
      })
    }
    
    // Remove any existing overrides for these dates and add new ones
    setSpecificOverrides(prev => {
      const datesToReplace = newOverrides.map(o => o.date)
      const filtered = prev.filter(o => !datesToReplace.includes(o.date))
      return [...filtered, ...newOverrides]
    })
    setHasUnsavedChanges(true)
  }

  // Remove specific override
  const removeSpecificOverride = (id: string) => {
    setSpecificOverrides(prev => prev.filter(o => o.id !== id))
    setHasUnsavedChanges(true)
  }

  // Save changes
  const saveChanges = async () => {
    if (!user?.id) return

    try {
      setSaveLoading(true)
      setError('')

      // Convert our data to backend format
      const templates = convertScheduleToTemplates(recurringSchedule)
      const overrides = convertSpecificToOverrides(specificOverrides)

      // Save templates first
      for (const template of templates) {
        try {
          await apiService.createAvailabilityTemplate(user.id, template)
        } catch (err) {
          // If it already exists, update it
          // In a real app, we'd track IDs properly
          console.warn('Template may already exist, attempting update:', err)
        }
      }

      // Save overrides
      for (const override of overrides) {
        try {
          if (override.id && override.id !== 'new') {
            await apiService.updateAvailabilityOverride(user.id, override.id, override)
          } else {
            await apiService.createAvailabilityOverride(user.id, override)
          }
        } catch (err) {
          console.warn('Error saving override:', err)
        }
      }

      setHasUnsavedChanges(false)
      // Could show success message here

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaveLoading(false)
    }
  }

  // Convert our schedule format to backend templates
  const convertScheduleToTemplates = (schedule: RecurringSchedule) => {
    return daysOfWeek
      .filter(day => schedule.enabledDays.includes(day.value)) // Only create templates for enabled days
      .map(day => {
        const dayOverride = schedule.dayOverrides.find(d => d.dayOfWeek === day.value)
        
        return {
          day_of_week: day.value,
          start_time: dayOverride?.startTime || schedule.defaultStartTime,
          end_time: dayOverride?.endTime || schedule.defaultEndTime,
          slot_duration: dayOverride?.slotDuration || schedule.defaultSlotDuration,
          break_start_time: dayOverride?.breakTime?.startTime || schedule.breakTime?.startTime,
          break_end_time: dayOverride?.breakTime?.endTime || schedule.breakTime?.endTime,
          is_enabled: true
        }
      })
  }

  // Convert our specific overrides to backend format
  const convertSpecificToOverrides = (overrides: SpecificOverride[]) => {
    return overrides.map(override => ({
      id: override.id === Date.now().toString() ? undefined : override.id, // New items don't have real IDs
      override_date: override.date,
      is_unavailable: override.type === 'unavailable',
      reason: override.reason,
      custom_slots: override.customSchedule ? [{
        start_time: override.customSchedule.startTime,
        end_time: override.customSchedule.endTime,
        is_available: true
      }] : []
    }))
  }

  // Helper function to generate time slots
  const generateTimeSlots = (
    startTime: string, 
    endTime: string, 
    slotDuration: number,
    breakTime?: { startTime: string; endTime: string }
  ): PreviewSlot[] => {
    const slots: PreviewSlot[] = []
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    
    let currentTime = new Date()
    currentTime.setHours(startHour, startMin, 0, 0)
    
    const endTimeObj = new Date()
    endTimeObj.setHours(endHour, endMin, 0, 0)

    while (currentTime < endTimeObj) {
      const timeStr = currentTime.toTimeString().slice(0, 5)
      
      let status: 'available' | 'break' | 'unavailable' = 'available'
      
      if (breakTime && isTimeInRange(timeStr, breakTime.startTime, breakTime.endTime)) {
        status = 'break'
      }

      slots.push({ time: timeStr, status })
      currentTime.setMinutes(currentTime.getMinutes() + slotDuration)
    }

    return slots
  }

  // Helper function to check if time is in range
  const isTimeInRange = (time: string, startTime: string, endTime: string): boolean => {
    return time >= startTime && time < endTime
  }

  // Memoized preview calculations - FIXED VERSION
  const recurringPreviewSlots = useMemo(() => {
    if (!recurringSchedule.enabledDays.includes(previewDay)) {
      return []
    }

    // Check for day-specific override
    const dayOverride = recurringSchedule.dayOverrides.find(d => d.dayOfWeek === previewDay)
    
    if (dayOverride?.isUnavailable) {
      return []
    }

    const startTime = dayOverride?.startTime || recurringSchedule.defaultStartTime
    const endTime = dayOverride?.endTime || recurringSchedule.defaultEndTime
    const slotDuration = dayOverride?.slotDuration || recurringSchedule.defaultSlotDuration
    const breakTime = dayOverride?.breakTime || recurringSchedule.breakTime

    // Ensure we have valid times before generating slots
    if (!startTime || !endTime || !slotDuration) {
      return []
    }

    return generateTimeSlots(startTime, endTime, slotDuration, breakTime)
  }, [
    previewDay, 
    JSON.stringify(recurringSchedule) // Serialize the entire object to detect any changes
  ])

  // Force component re-render when recurring schedule changes
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0)
  
  useEffect(() => {
    setForceUpdateCounter(prev => prev + 1)
  }, [recurringSchedule])

  const specificPreviewSlots = useMemo(() => {
    const specificOverride = specificOverrides.find(o => o.date === previewDate)
    
    if (specificOverride) {
      if (specificOverride.type === 'unavailable') {
        return []
      }
      
      if (specificOverride.type === 'custom_schedule' && specificOverride.customSchedule) {
        return generateTimeSlots(
          specificOverride.customSchedule.startTime,
          specificOverride.customSchedule.endTime,
          specificOverride.customSchedule.slotDuration,
          specificOverride.customBreak
        )
      }

      if (specificOverride.type === 'break_change') {
        // Use recurring schedule but with different break time
        const dateObj = new Date(previewDate)
        const dayOfWeek = dateObj.getDay()
        
        if (!recurringSchedule.enabledDays.includes(dayOfWeek)) {
          return []
        }

        const dayOverride = recurringSchedule.dayOverrides.find(d => d.dayOfWeek === dayOfWeek)
        const startTime = dayOverride?.startTime || recurringSchedule.defaultStartTime
        const endTime = dayOverride?.endTime || recurringSchedule.defaultEndTime
        const slotDuration = dayOverride?.slotDuration || recurringSchedule.defaultSlotDuration
        
        const baseSlots = generateTimeSlots(startTime, endTime, slotDuration)
        
        // Modify break times
        return baseSlots.map(slot => {
          if (specificOverride.customBreak && isTimeInRange(
            slot.time, 
            specificOverride.customBreak.startTime, 
            specificOverride.customBreak.endTime
          )) {
            return { ...slot, status: 'break' as const }
          }
          return slot
        })
      }
    }

    // Fall back to recurring schedule
    const dateObj = new Date(previewDate)
    const dayOfWeek = dateObj.getDay()
    
    if (!recurringSchedule.enabledDays.includes(dayOfWeek)) {
      return []
    }

    const dayOverride = recurringSchedule.dayOverrides.find(d => d.dayOfWeek === dayOfWeek)
    const startTime = dayOverride?.startTime || recurringSchedule.defaultStartTime
    const endTime = dayOverride?.endTime || recurringSchedule.defaultEndTime
    const slotDuration = dayOverride?.slotDuration || recurringSchedule.defaultSlotDuration
    const breakTime = dayOverride?.breakTime || recurringSchedule.breakTime

    return generateTimeSlots(startTime, endTime, slotDuration, breakTime)
  }, [previewDate, recurringSchedule.defaultStartTime, recurringSchedule.defaultEndTime, recurringSchedule.defaultSlotDuration, recurringSchedule.enabledDays, recurringSchedule.dayOverrides, recurringSchedule.breakTime, specificOverrides])

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
            <p className="text-gray-600 mt-1">Loading your schedule configuration...</p>
          </div>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
          <p className="text-gray-600 mt-1">Set your recurring schedule and manage specific exceptions</p>
        </div>
        <Button
          onClick={saveChanges}
          disabled={!hasUnsavedChanges || saveLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your schedule settings...</p>
        </div>
      )}

      {/* Main content - only show when not loading */}
      {!loading && (
        <>
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-medium text-red-900">Error</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Unsaved changes warning */}
          {hasUnsavedChanges && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <h3 className="font-medium text-amber-900">Unsaved Changes</h3>
                  <p className="text-sm text-amber-700">Remember to save your schedule configuration.</p>
                </div>
              </div>
            </div>
          )}

          {/* Layout - Full width like tabs */}
          <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* LEFT PANEL: Recurring Schedule */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Calendar className="h-6 w-6 text-blue-600" />
                  General Schedule
                </CardTitle>
                <p className="text-sm text-gray-600">Set your weekly recurring availability</p>
              </CardHeader>
              <CardContent className="space-y-8 p-6">
                
                {/* Default Schedule Settings */}
                <div className="space-y-4 p-6 bg-gray-50 rounded-xl">
                  <h3 className="font-semibold text-lg text-gray-900">Default Hours</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                      <Select
                        value={recurringSchedule.defaultStartTime || ""}
                        onValueChange={(value) => updateRecurringSchedule({ defaultStartTime: value })}
                        options={timeOptions}
                        placeholder={recurringSchedule.defaultStartTime || "09:00"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                      <Select
                        value={recurringSchedule.defaultEndTime || ""}
                        onValueChange={(value) => updateRecurringSchedule({ defaultEndTime: value })}
                        options={timeOptions}
                        placeholder={recurringSchedule.defaultEndTime || "17:00"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Slot Duration</label>
                      <Select
                        value={recurringSchedule.defaultSlotDuration?.toString() || ""}
                        onValueChange={(value) => updateRecurringSchedule({ defaultSlotDuration: parseInt(value) })}
                        options={slotDurationOptions}
                        placeholder={recurringSchedule.defaultSlotDuration ? `${recurringSchedule.defaultSlotDuration} min` : "30 min"}
                      />
                    </div>
                  </div>
                </div>

                {/* Working Days */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900">Working Days</h3>
                  <div className="grid grid-cols-7 gap-3">
                    {daysOfWeek.map((day) => {
                      const isEnabled = recurringSchedule.enabledDays.includes(day.value)
                      return (
                        <button
                          key={day.value}
                          onClick={() => {
                            const newEnabledDays = isEnabled
                              ? recurringSchedule.enabledDays.filter(d => d !== day.value)
                              : [...recurringSchedule.enabledDays, day.value]
                            updateRecurringSchedule({ enabledDays: newEnabledDays })
                            
                            // Remove day override if day is disabled
                            if (isEnabled) {
                              removeDayOverride(day.value)
                            }
                          }}
                          className={`p-4 rounded-xl font-medium text-sm transition-all duration-200 ${
                            isEnabled 
                              ? 'bg-blue-500 text-white shadow-lg hover:bg-blue-600 transform hover:scale-105' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Advanced Settings Toggle */}
                <div className="space-y-4">
                  <button
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className={`w-full p-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                      showAdvancedSettings
                        ? 'bg-gray-800 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    {showAdvancedSettings ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
                  </button>

                  {/* Day-Specific Overrides - Advanced Settings */}
                  {showAdvancedSettings && (
                    <div className="space-y-4 p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
                      <h3 className="font-semibold text-lg text-gray-900">Day-Specific Rules</h3>
                      <p className="text-sm text-gray-600">Set different hours for specific days of the week</p>
                      <div className="space-y-3">
                        {daysOfWeek
                          .filter(day => recurringSchedule.enabledDays.includes(day.value))
                          .map((day) => {
                            const dayOverride = recurringSchedule.dayOverrides.find(d => d.dayOfWeek === day.value)
                            const hasOverride = !!dayOverride
                            
                            return (
                              <div key={day.value} className="p-5 bg-white rounded-xl border hover:border-blue-300 transition-all duration-200 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                  <span className="font-semibold text-sm">{day.name}</span>
                                  <button
                                    onClick={() => {
                                      if (hasOverride) {
                                        removeDayOverride(day.value)
                                      } else {
                                        updateDayOverride(day.value, {
                                          startTime: recurringSchedule.defaultStartTime,
                                          endTime: recurringSchedule.defaultEndTime,
                                          slotDuration: recurringSchedule.defaultSlotDuration
                                        })
                                      }
                                    }}
                                    className={`px-4 py-2 rounded-full font-medium text-xs transition-all duration-200 ${
                                      hasOverride
                                        ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    {hasOverride ? 'Custom' : 'Default'}
                                  </button>
                                </div>
                                
                                {hasOverride && (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      <Select
                                        value={dayOverride.startTime || recurringSchedule.defaultStartTime}
                                        onValueChange={(value) => updateDayOverride(day.value, { 
                                          ...dayOverride, 
                                          startTime: value 
                                        })}
                                        options={timeOptions}
                                      />
                                      <Select
                                        value={dayOverride.endTime || recurringSchedule.defaultEndTime}
                                        onValueChange={(value) => updateDayOverride(day.value, { 
                                          ...dayOverride, 
                                          endTime: value 
                                        })}
                                        options={timeOptions}
                                      />
                                      <Select
                                        value={(dayOverride.slotDuration || recurringSchedule.defaultSlotDuration).toString()}
                                        onValueChange={(value) => updateDayOverride(day.value, { 
                                          ...dayOverride, 
                                          slotDuration: parseInt(value) 
                                        })}
                                        options={slotDurationOptions}
                                      />
                                    </div>
                                    
                                    {/* Day-specific break time */}
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                      <span className="text-sm text-gray-700">Custom break time</span>
                                      <button
                                        onClick={() => {
                                          updateDayOverride(day.value, {
                                            ...dayOverride,
                                            breakTime: dayOverride.breakTime 
                                              ? undefined
                                              : { startTime: "12:00", endTime: "13:00" }
                                          })
                                        }}
                                        className={`px-4 py-2 rounded-full font-medium text-xs transition-all duration-200 ${
                                          dayOverride.breakTime
                                            ? 'bg-yellow-500 text-white shadow-md hover:bg-yellow-600'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                      >
                                        {dayOverride.breakTime ? 'Custom' : 'Default'}
                                      </button>
                                    </div>
                                    
                                    {dayOverride.breakTime && (
                                      <div className="grid grid-cols-2 gap-3 mt-3">
                                        <Select
                                          value={dayOverride.breakTime.startTime}
                                          onValueChange={(value) => updateDayOverride(day.value, {
                                            ...dayOverride,
                                            breakTime: { ...dayOverride.breakTime!, startTime: value }
                                          })}
                                          options={timeOptions}
                                        />
                                        <Select
                                          value={dayOverride.breakTime.endTime}
                                          onValueChange={(value) => updateDayOverride(day.value, {
                                            ...dayOverride,
                                            breakTime: { ...dayOverride.breakTime!, endTime: value }
                                          })}
                                          options={timeOptions}
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}
                </div>

                  {/* Default Break Time */}
                  <div className="space-y-4 p-6 bg-yellow-50 rounded-xl border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg text-gray-900">Default Break Time</h3>
                      <button
                        onClick={() => {
                          updateRecurringSchedule({
                            breakTime: recurringSchedule.breakTime ? undefined : { startTime: "12:00", endTime: "13:00" }
                          })
                        }}
                        className={`px-6 py-3 rounded-full font-medium text-sm transition-all duration-200 ${
                          recurringSchedule.breakTime
                            ? 'bg-yellow-500 text-white shadow-lg hover:bg-yellow-600'
                            : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {recurringSchedule.breakTime ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                    {recurringSchedule.breakTime && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start</label>
                          <Select
                            value={recurringSchedule.breakTime.startTime || ""}
                            onValueChange={(value) => updateRecurringSchedule({
                              breakTime: { ...recurringSchedule.breakTime!, startTime: value }
                            })}
                            options={timeOptions}
                            placeholder={recurringSchedule.breakTime.startTime || "12:00"}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">End</label>
                          <Select
                            value={recurringSchedule.breakTime.endTime || ""}
                            onValueChange={(value) => updateRecurringSchedule({
                              breakTime: { ...recurringSchedule.breakTime!, endTime: value }
                            })}
                            options={timeOptions}
                            placeholder={recurringSchedule.breakTime.endTime || "13:00"}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Live Preview for Recurring Schedule */}
                  <div className="border rounded-xl p-6 bg-white shadow-sm" key={forceUpdateCounter}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg text-gray-900">Weekly Preview</h3>
                      <Select
                        value={previewDay.toString()}
                        onValueChange={(value) => setPreviewDay(parseInt(value))}
                        options={daysOfWeek.map(day => ({
                          value: day.value.toString(),
                          label: day.name
                        }))}
                      />
                    </div>
                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {recurringPreviewSlots.length > 0 ? (
                        recurringPreviewSlots.map((slot, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg text-sm transition-all duration-200 ${
                              slot.status === 'available' 
                                ? 'bg-green-50 text-green-900 border border-green-200 hover:bg-green-100' 
                                : 'bg-yellow-50 text-yellow-900 border border-yellow-200 hover:bg-yellow-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{slot.time}</span>
                              <span className="text-xs capitalize font-semibold">{slot.status}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">Day is unavailable</p>
                        </div>
                      )}
                    </div>
                    {recurringPreviewSlots.length > 0 && (
                      <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Total slots: <span className="font-semibold">{recurringPreviewSlots.length}</span></span>
                          <span>Available: <span className="font-semibold text-green-600">{recurringPreviewSlots.filter(s => s.status === 'available').length}</span></span>
                        </div>
                      </div>
                    )}
                  </div>

              </CardContent>
            </Card>

            {/* RIGHT PANEL: Specific Overrides */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Settings className="h-6 w-6 text-purple-600" />
                  Schedule Exceptions
                </CardTitle>
                <p className="text-sm text-gray-600">Override specific dates or recurring patterns</p>
              </CardHeader>
              <CardContent className="space-y-8 p-6">
                
                {/* Add New Override */}
                <div className="p-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 space-y-6">
                  <h3 className="font-semibold text-xl text-gray-900">Add Schedule Exception</h3>
                  <AddOverrideForm onAdd={addSpecificOverride} />
                </div>

                {/* Existing Overrides */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-xl text-gray-900">Current Exceptions</h3>
                    {specificOverrides.length > 0 && (
                      <span className="px-3 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        {specificOverrides.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {specificOverrides
                      .sort((a, b) => a.date.localeCompare(b.date)) // Sort by date
                      .map((override) => {
                        const typeIcons = {
                          unavailable: '🚫',
                          custom_schedule: '⏰', 
                          break_change: '☕'
                        }
                        const typeColors = {
                          unavailable: 'bg-red-50 border-red-200 text-red-700',
                          custom_schedule: 'bg-blue-50 border-blue-200 text-blue-700',
                          break_change: 'bg-yellow-50 border-yellow-200 text-yellow-700'
                        }
                        
                        return (
                          <div key={override.id} className={`p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${typeColors[override.type]}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <span className="text-xl">{typeIcons[override.type]}</span>
                                <div>
                                  <p className="font-semibold text-sm">{override.date}</p>
                                  <p className="text-sm font-medium capitalize mt-1">{override.type.replace('_', ' ')}</p>
                                  {override.reason && <p className="text-sm mt-2 opacity-75">{override.reason}</p>}
                                </div>
                              </div>
                              <button
                                onClick={() => removeSpecificOverride(override.id)}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-all duration-200"
                                title="Remove exception"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    {specificOverrides.length === 0 && (
                      <div className="text-center py-12">
                        <div className="text-5xl mb-4">📅</div>
                        <p className="text-gray-500 text-sm">No exceptions set yet</p>
                        <p className="text-gray-400 text-sm mt-2">Add your first exception above</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Preview for Specific Date */}
                <div className="border rounded-xl p-6 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg text-gray-900">Date Preview</h3>
                    <input
                      type="date"
                      value={previewDate}
                      onChange={(e) => setPreviewDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {specificPreviewSlots.length > 0 ? (
                      specificPreviewSlots.map((slot, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg text-sm transition-all duration-200 ${
                            slot.status === 'available' 
                              ? 'bg-green-50 text-green-900 border border-green-200 hover:bg-green-100' 
                              : slot.status === 'break'
                              ? 'bg-yellow-50 text-yellow-900 border border-yellow-200 hover:bg-yellow-100'
                              : 'bg-red-50 text-red-900 border border-red-200 hover:bg-red-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{slot.time}</span>
                            <span className="text-xs capitalize font-semibold">{slot.status}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">Day is unavailable</p>
                      </div>
                    )}
                  </div>
                  {specificPreviewSlots.length > 0 && (
                    <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Total slots: <span className="font-semibold">{specificPreviewSlots.length}</span></span>
                        <span>Available: <span className="font-semibold text-green-600">{specificPreviewSlots.filter(s => s.status === 'available').length}</span></span>
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>

          </div>
        </>
      )}
    </div>
  )
}

// Component for adding new overrides
function AddOverrideForm({ onAdd }: { onAdd: (override: Omit<SpecificOverride, 'id'>) => void }) {
  const [formData, setFormData] = useState({
    date: "",
    endDate: "", // For time periods
    type: "unavailable" as SpecificOverride['type'],
    reason: "",
    isPeriod: false, // Toggle between single day and time period
    customSchedule: {
      startTime: "09:00",
      endTime: "17:00",
      slotDuration: 30
    },
    customBreak: {
      startTime: "12:00",
      endTime: "13:00"
    }
  })

  const handleSubmit = () => {
    if (!formData.date) return
    if (formData.isPeriod && !formData.endDate) return

    const override: Omit<SpecificOverride, 'id'> = {
      date: formData.date,
      endDate: formData.isPeriod ? formData.endDate : undefined,
      type: formData.type,
      reason: formData.reason || undefined,
      customSchedule: formData.type === 'custom_schedule' ? formData.customSchedule : undefined,
      customBreak: formData.type === 'break_change' ? formData.customBreak : undefined
    }

    onAdd(override)
    setFormData({
      ...formData,
      date: "",
      endDate: "",
      reason: ""
    })
  }

    return (
    <div className="space-y-6">
      {/* Period Toggle - Segmented Control Style */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Duration</label>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, isPeriod: false, endDate: "" })}
            className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
              !formData.isPeriod
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Single Day
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, isPeriod: true })}
            className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
              formData.isPeriod
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Time Period
          </button>
        </div>
      </div>

      {/* Date Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {formData.isPeriod ? 'Date Range' : 'Date'}
        </label>
        <div className={`grid gap-4 ${formData.isPeriod ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              {formData.isPeriod ? 'Start Date' : 'Date'}
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          {formData.isPeriod && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min={formData.date || new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
        </div>
      </div>

      {/* Exception Type */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Exception Type</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "unavailable", label: formData.isPeriod ? "Days Off" : "Day Off", icon: "🚫" },
            { value: "custom_schedule", label: "Custom Hours", icon: "⏰" },
            { value: "break_change", label: "Different Break", icon: "☕" }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFormData({ ...formData, type: option.value as SpecificOverride['type'] })}
              className={`p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                formData.type === option.value
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="text-lg mb-1">{option.icon}</div>
              <div className="text-xs font-medium">{option.label}</div>
            </button>
          ))}
        </div>
      </div>
      
      {formData.type === 'custom_schedule' && (
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-sm text-blue-900">Custom Schedule Details</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
              <Select
                value={formData.customSchedule.startTime}
                onValueChange={(value) => setFormData({
                  ...formData,
                  customSchedule: { ...formData.customSchedule, startTime: value }
                })}
                options={timeOptions}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
              <Select
                value={formData.customSchedule.endTime}
                onValueChange={(value) => setFormData({
                  ...formData,
                  customSchedule: { ...formData.customSchedule, endTime: value }
                })}
                options={timeOptions}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Slot Duration</label>
              <Select
                value={formData.customSchedule.slotDuration.toString()}
                onValueChange={(value) => setFormData({
                  ...formData,
                  customSchedule: { ...formData.customSchedule, slotDuration: parseInt(value) }
                })}
                options={slotDurationOptions}
              />
            </div>
          </div>
        </div>
      )}

      {formData.type === 'break_change' && (
        <div className="space-y-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-medium text-sm text-yellow-900">Custom Break Time</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Break Start</label>
              <Select
                value={formData.customBreak.startTime}
                onValueChange={(value) => setFormData({
                  ...formData,
                  customBreak: { ...formData.customBreak, startTime: value }
                })}
                options={timeOptions}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Break End</label>
              <Select
                value={formData.customBreak.endTime}
                onValueChange={(value) => setFormData({
                  ...formData,
                  customBreak: { ...formData.customBreak, endTime: value }
                })}
                options={timeOptions}
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Reason (Optional)</label>
        <input
          type="text"
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="e.g., Vacation, Doctor appointment, Conference..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!formData.date || (formData.isPeriod && !formData.endDate)}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
          !formData.date || (formData.isPeriod && !formData.endDate)
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-purple-600 text-white shadow-md hover:bg-purple-700 hover:shadow-lg'
        }`}
      >
        <Plus className="h-4 w-4" />
        {formData.isPeriod ? 'Add Period Exception' : 'Add Exception'}
      </button>
    </div>
  )
} 