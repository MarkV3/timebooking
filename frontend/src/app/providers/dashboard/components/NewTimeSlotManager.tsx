"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, Button, Checkbox, Select } from "@/components/ui"
import { Clock, Calendar, Plus, Trash2, Save, AlertCircle, Settings, ChevronDown, ChevronUp } from "lucide-react"
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

export function NewTimeSlotManager({ providerId }: { providerId: string }) {
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
    if (providerId) {
      loadScheduleData()
    }
  }, [providerId])

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
    if (!providerId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')

      // Load templates and overrides
      const [templates, overrides] = await Promise.all([
        apiService.getAvailabilityTemplates(providerId),
        apiService.getAvailabilityOverrides(providerId)
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
    if (!providerId) return

    try {
      setSaveLoading(true)
      setError('')

      // Convert our data to backend format
      const templates = convertScheduleToTemplates(recurringSchedule)
      const overrides = convertSpecificToOverrides(specificOverrides)

      // Save templates first
      for (const template of templates) {
        try {
          await apiService.createAvailabilityTemplate(providerId, template)
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
            await apiService.updateAvailabilityOverride(providerId, override.id, override)
          } else {
            await apiService.createAvailabilityOverride(providerId, override)
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Time Slots</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your weekly availability and time slots</p>
        </div>
        <Button
          onClick={saveChanges}
          disabled={!hasUnsavedChanges || saveLoading}
          size="sm"
          className="shrink-0"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <p className="text-sm text-amber-700">You have unsaved changes</p>
          </div>
        </div>
      )}

      {/* Main content */}
      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* LEFT PANEL: Weekly Schedule */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Weekly Schedule</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
                
              {/* Default Hours */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Default Hours</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Start</label>
                    <Select
                      value={recurringSchedule.defaultStartTime || ""}
                      onValueChange={(value) => updateRecurringSchedule({ defaultStartTime: value })}
                      options={timeOptions}
                      placeholder="09:00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">End</label>
                    <Select
                      value={recurringSchedule.defaultEndTime || ""}
                      onValueChange={(value) => updateRecurringSchedule({ defaultEndTime: value })}
                      options={timeOptions}
                      placeholder="17:00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Duration</label>
                    <Select
                      value={recurringSchedule.defaultSlotDuration?.toString() || ""}
                      onValueChange={(value) => updateRecurringSchedule({ defaultSlotDuration: parseInt(value) })}
                      options={slotDurationOptions}
                      placeholder="30 min"
                    />
                  </div>
                </div>
              </div>

              {/* Working Days */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Working Days</h3>
                <div className="grid grid-cols-7 gap-2">
                  {daysOfWeek.map((day) => {
                    const isEnabled = recurringSchedule.enabledDays.includes(day.value)
                    return (
                      <Button
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
                        variant={isEnabled ? "primary" : "outline"}
                        size="sm"
                        className="h-10 text-xs"
                      >
                        {day.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <div className="space-y-4">
                <Button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  variant={showAdvancedSettings ? "secondary" : "outline"}
                  size="sm"
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings
                  {showAdvancedSettings ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                </Button>

                {/* Day-Specific Overrides - Advanced Settings */}
                {showAdvancedSettings && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg shadow-sm">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-foreground">Day-Specific Rules</h4>
                      <p className="text-xs text-muted-foreground">Override default hours for specific days</p>
                    </div>
                    <div className="space-y-3">
                      {daysOfWeek
                        .filter(day => recurringSchedule.enabledDays.includes(day.value))
                        .map((day) => {
                          const dayOverride = recurringSchedule.dayOverrides.find(d => d.dayOfWeek === day.value)
                          const hasOverride = !!dayOverride
                          
                          return (
                            <div key={day.value} className="p-3 bg-background rounded-md shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium">{day.name}</span>
                                <Button
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
                                  variant={hasOverride ? "secondary" : "outline"}
                                  size="sm"
                                  className="h-7 px-3 text-xs"
                                >
                                  {hasOverride ? 'Custom' : 'Default'}
                                </Button>
                              </div>
                                
                              {hasOverride && (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-3 gap-3">
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
                                  <div className="flex items-center justify-between pt-3">
                                    <span className="text-xs text-muted-foreground">Break time</span>
                                    <Button
                                      onClick={() => {
                                        updateDayOverride(day.value, {
                                          ...dayOverride,
                                          breakTime: dayOverride.breakTime 
                                            ? undefined
                                            : { startTime: "12:00", endTime: "13:00" }
                                        })
                                      }}
                                      variant={dayOverride.breakTime ? "secondary" : "outline"}
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                    >
                                      {dayOverride.breakTime ? 'Custom' : 'None'}
                                    </Button>
                                  </div>
                                  
                                  {dayOverride.breakTime && (
                                    <div className="grid grid-cols-2 gap-2">
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Default Break Time</h3>
                  <Button
                    onClick={() => {
                      updateRecurringSchedule({
                        breakTime: recurringSchedule.breakTime ? undefined : { startTime: "12:00", endTime: "13:00" }
                      })
                    }}
                    variant={recurringSchedule.breakTime ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 px-3 text-xs"
                  >
                    {recurringSchedule.breakTime ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                {recurringSchedule.breakTime && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Start</label>
                      <Select
                        value={recurringSchedule.breakTime.startTime || ""}
                        onValueChange={(value) => updateRecurringSchedule({
                          breakTime: { ...recurringSchedule.breakTime!, startTime: value }
                        })}
                        options={timeOptions}
                        placeholder="12:00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">End</label>
                      <Select
                        value={recurringSchedule.breakTime.endTime || ""}
                        onValueChange={(value) => updateRecurringSchedule({
                          breakTime: { ...recurringSchedule.breakTime!, endTime: value }
                        })}
                        options={timeOptions}
                        placeholder="13:00"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="space-y-4" key={forceUpdateCounter}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Preview</h3>
                  <Select
                    value={previewDay.toString()}
                    onValueChange={(value) => setPreviewDay(parseInt(value))}
                    options={daysOfWeek.map(day => ({
                      value: day.value.toString(),
                      label: day.name
                    }))}
                  />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {recurringPreviewSlots.length > 0 ? (
                    recurringPreviewSlots.map((slot, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded-md text-xs ${
                          slot.status === 'available' 
                            ? 'bg-primary/10 text-primary shadow-sm' 
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{slot.time}</span>
                          <span className="capitalize text-[10px]">{slot.status}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No slots available</p>
                    </div>
                  )}
                </div>
                {recurringPreviewSlots.length > 0 && (
                  <div className="pt-3 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Total: {recurringPreviewSlots.length}</span>
                      <span>Available: {recurringPreviewSlots.filter(s => s.status === 'available').length}</span>
                    </div>
                  </div>
                )}
              </div>

              </CardContent>
            </Card>

            {/* RIGHT PANEL: Specific Overrides */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Schedule Exceptions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Add New Override */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-foreground">Add Exception</h3>
                  <div className="p-4 bg-muted/30 rounded-lg shadow-sm">
                    <AddOverrideForm onAdd={addSpecificOverride} />
                  </div>
                </div>

                {/* Existing Overrides */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Exceptions</h3>
                    {specificOverrides.length > 0 && (
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                        {specificOverrides.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {specificOverrides
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((override) => {
                        const typeColors = {
                          unavailable: 'bg-destructive/10 text-destructive shadow-sm',
                          custom_schedule: 'bg-primary/10 text-primary shadow-sm',
                          break_change: 'bg-amber-50 text-amber-700 shadow-sm'
                        }
                        
                        return (
                          <div key={override.id} className={`p-3 rounded-md ${typeColors[override.type]}`}>
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-medium">{override.date}</p>
                                <p className="text-xs capitalize">{override.type.replace('_', ' ')}</p>
                                {override.reason && <p className="text-xs opacity-75">{override.reason}</p>}
                              </div>
                              <Button
                                onClick={() => removeSpecificOverride(override.id)}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    {specificOverrides.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No exceptions set</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Date Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Date Preview</h3>
                    <input
                      type="date"
                      value={previewDate}
                      onChange={(e) => setPreviewDate(e.target.value)}
                      className="px-2 py-1 rounded-md text-xs bg-muted/30 shadow-sm"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {specificPreviewSlots.length > 0 ? (
                      specificPreviewSlots.map((slot, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded-md text-xs ${
                            slot.status === 'available' 
                              ? 'bg-primary/10 text-primary shadow-sm' 
                              : slot.status === 'break'
                              ? 'bg-amber-50 text-amber-700 shadow-sm'
                              : 'bg-destructive/10 text-destructive shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{slot.time}</span>
                            <span className="capitalize text-[10px]">{slot.status}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Day unavailable</p>
                      </div>
                    )}
                  </div>
                  {specificPreviewSlots.length > 0 && (
                    <div className="pt-3 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Total: {specificPreviewSlots.length}</span>
                        <span>Available: {specificPreviewSlots.filter(s => s.status === 'available').length}</span>
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>

          </div>
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
              className="w-full px-3 py-2 rounded-lg text-sm bg-input shadow-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                className="w-full px-3 py-2 rounded-lg text-sm bg-input shadow-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
          className="w-full px-3 py-2 rounded-lg text-sm bg-input shadow-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
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

