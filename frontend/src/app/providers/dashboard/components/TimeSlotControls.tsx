"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, Button, Checkbox, Select } from "@/components/ui"
import { Clock, Calendar, AlertCircle, Eye, Plus, Trash2, Settings, Save } from "lucide-react"

interface DayTemplate {
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDuration: number
  isEnabled: boolean
  breakStartTime?: string
  breakEndTime?: string
}

interface BlockedSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  reason: string
  type: 'lunch' | 'meeting' | 'personal' | 'maintenance'
}

interface UnavailableDay {
  id: string
  date: string
  reason: string
}

interface PreviewSlot {
  time: string
  status: 'available' | 'blocked' | 'break'
}

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
  return {
    value: time,
    label: time
  }
})

const slotOptions = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" }
]

const blockReasons = [
  { value: "lunch", label: "Lunch Break" },
  { value: "meeting", label: "Meeting" },
  { value: "personal", label: "Personal Time" },
  { value: "maintenance", label: "Maintenance" }
]

export function TimeSlotControls() {
  const initialTemplate = daysOfWeek.map((day) => ({
    dayOfWeek: day.value,
    startTime: "09:00",
    endTime: "17:00",
    slotDuration: 30,
    isEnabled: day.value !== 0 && day.value !== 6,
  }))

  const [weeklyTemplate, setWeeklyTemplate] = useState<DayTemplate[]>(initialTemplate)
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
  const [unavailableDays, setUnavailableDays] = useState<UnavailableDay[]>([])
  
  // Track the saved state to compare against
  const [savedWeeklyTemplate, setSavedWeeklyTemplate] = useState<DayTemplate[]>(initialTemplate)
  const [savedBlockedSlots, setSavedBlockedSlots] = useState<BlockedSlot[]>([])
  const [savedUnavailableDays, setSavedUnavailableDays] = useState<UnavailableDay[]>([])
  
  const [previewDay, setPreviewDay] = useState<number>(1) // Monday by default
  const [showPreview, setShowPreview] = useState(false)
  
  const [newBlockedSlot, setNewBlockedSlot] = useState<Omit<BlockedSlot, 'id'>>({
    date: "",
    startTime: "12:00",
    endTime: "13:00",
    reason: "",
    type: "lunch"
  })
  
  const [newUnavailableDay, setNewUnavailableDay] = useState<Omit<UnavailableDay, 'id'>>({
    date: "",
    reason: ""
  })

  const today = new Date().toISOString().split('T')[0]

  // Check if current state differs from saved state
  const hasUnsavedChanges = 
    JSON.stringify(weeklyTemplate) !== JSON.stringify(savedWeeklyTemplate) ||
    JSON.stringify(blockedSlots) !== JSON.stringify(savedBlockedSlots) ||
    JSON.stringify(unavailableDays) !== JSON.stringify(savedUnavailableDays)

  const updateWeeklyTemplate = (dayOfWeek: number, updates: Partial<DayTemplate>) => {
    setWeeklyTemplate(prev =>
      prev.map(template =>
        template.dayOfWeek === dayOfWeek
          ? { ...template, ...updates }
          : template
      )
    )
  }

  const generatePreviewSlots = (dayTemplate: DayTemplate): PreviewSlot[] => {
    if (!dayTemplate.isEnabled) return []

    const slots: PreviewSlot[] = []
    const [startHour, startMin] = dayTemplate.startTime.split(':').map(Number)
    const [endHour, endMin] = dayTemplate.endTime.split(':').map(Number)
    
    let currentTime = new Date()
    currentTime.setHours(startHour, startMin, 0, 0)
    
    const endTime = new Date()
    endTime.setHours(endHour, endMin, 0, 0)

    while (currentTime < endTime) {
      const timeStr = currentTime.toTimeString().slice(0, 5)
      
      // Check if this time falls in break period
      let status: 'available' | 'blocked' | 'break' = 'available'
      
      if (dayTemplate.breakStartTime && dayTemplate.breakEndTime) {
        const [breakStartHour, breakStartMin] = dayTemplate.breakStartTime.split(':').map(Number)
        const [breakEndHour, breakEndMin] = dayTemplate.breakEndTime.split(':').map(Number)
        
        const breakStart = new Date()
        breakStart.setHours(breakStartHour, breakStartMin, 0, 0)
        
        const breakEnd = new Date()
        breakEnd.setHours(breakEndHour, breakEndMin, 0, 0)
        
        if (currentTime >= breakStart && currentTime < breakEnd) {
          status = 'break'
        }
      }

      slots.push({
        time: timeStr,
        status
      })

      currentTime.setMinutes(currentTime.getMinutes() + dayTemplate.slotDuration)
    }

    return slots
  }

  const addBlockedSlot = () => {
    if (newBlockedSlot.date && newBlockedSlot.startTime && newBlockedSlot.endTime) {
      const slot: BlockedSlot = {
        ...newBlockedSlot,
        id: Date.now().toString()
      }
      setBlockedSlots(prev => [...prev, slot])
      setNewBlockedSlot({
        date: "",
        startTime: "12:00",
        endTime: "13:00",
        reason: "",
        type: "lunch"
      })
    }
  }

  const removeBlockedSlot = (id: string) => {
    setBlockedSlots(prev => prev.filter(slot => slot.id !== id))
  }

  const addUnavailableDay = () => {
    if (newUnavailableDay.date) {
      const day: UnavailableDay = {
        ...newUnavailableDay,
        id: Date.now().toString()
      }
      setUnavailableDays(prev => [...prev, day])
      setNewUnavailableDay({
        date: "",
        reason: ""
      })
    }
  }

  const removeUnavailableDay = (id: string) => {
    setUnavailableDays(prev => prev.filter(day => day.id !== id))
  }

  const saveChanges = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Update the saved state to match current state
    setSavedWeeklyTemplate([...weeklyTemplate])
    setSavedBlockedSlots([...blockedSlots])
    setSavedUnavailableDays([...unavailableDays])
    
    // Here you would typically call your API to save the changes
    alert('Changes saved successfully!')
  }

  const selectedDayTemplate = weeklyTemplate.find(t => t.dayOfWeek === previewDay)!
  const previewSlots = generatePreviewSlots(selectedDayTemplate)

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time Slot Management</h1>
          <p className="text-gray-600 mt-1">Configure your availability and manage time slots</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className={`${showPreview ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200'}`}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button
            onClick={saveChanges}
            disabled={!hasUnsavedChanges}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-slide-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="font-medium text-amber-900">Unsaved Changes</h3>
              <p className="text-sm text-amber-700">You have unsaved changes. Don't forget to save your configuration.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly Template */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="flex items-center gap-3 text-gray-900">
                <Calendar className="h-5 w-5 text-blue-600" />
                Weekly Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {daysOfWeek.map((day) => {
                const template = weeklyTemplate.find(t => t.dayOfWeek === day.value)!
                
                return (
                  <div key={day.value} className="group p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all animate-fade-in">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-16 text-sm font-semibold text-gray-700">{day.name}</div>
                      <Checkbox
                        checked={template.isEnabled}
                        onCheckedChange={(checked) => updateWeeklyTemplate(day.value, { isEnabled: checked })}
                      />
                      {template.isEnabled && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewDay(day.value)}
                          className="ml-auto border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      )}
                    </div>
                    
                    {template.isEnabled && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 animate-slide-in">
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Start Time</label>
                          <Select
                            value={template.startTime}
                            onValueChange={(value) => updateWeeklyTemplate(day.value, { startTime: value })}
                            options={timeOptions}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">End Time</label>
                          <Select
                            value={template.endTime}
                            onValueChange={(value) => updateWeeklyTemplate(day.value, { endTime: value })}
                            options={timeOptions}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Slot Duration</label>
                          <Select
                            value={template.slotDuration.toString()}
                            onValueChange={(value) => updateWeeklyTemplate(day.value, { slotDuration: parseInt(value) })}
                            options={slotOptions}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-gray-300 hover:bg-gray-100"
                            onClick={() => {
                              const hasBreak = template.breakStartTime && template.breakEndTime
                              if (hasBreak) {
                                updateWeeklyTemplate(day.value, { 
                                  breakStartTime: undefined, 
                                  breakEndTime: undefined 
                                })
                              } else {
                                updateWeeklyTemplate(day.value, { 
                                  breakStartTime: "12:00", 
                                  breakEndTime: "13:00" 
                                })
                              }
                            }}
                          >
                            {template.breakStartTime ? 'Remove Break' : 'Add Break'}
                          </Button>
                        </div>
                        
                        {template.breakStartTime && template.breakEndTime && (
                          <div className="col-span-2 grid grid-cols-2 gap-3 mt-2 animate-slide-in">
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Break Start</label>
                              <Select
                                value={template.breakStartTime}
                                onValueChange={(value) => updateWeeklyTemplate(day.value, { breakStartTime: value })}
                                options={timeOptions}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">Break End</label>
                              <Select
                                value={template.breakEndTime}
                                onValueChange={(value) => updateWeeklyTemplate(day.value, { breakEndTime: value })}
                                options={timeOptions}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Block Time Slots */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="flex items-center gap-3 text-gray-900">
                <Clock className="h-5 w-5 text-red-600" />
                Block Time Slots
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Add New Blocked Slot */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <input
                  type="date"
                  value={newBlockedSlot.date}
                  onChange={(e) => setNewBlockedSlot(prev => ({ ...prev, date: e.target.value }))}
                  min={today}
                  className="px-3 py-2 border border-red-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-red-400 focus:border-red-400"
                />
                <Select
                  value={newBlockedSlot.startTime}
                  onValueChange={(value) => setNewBlockedSlot(prev => ({ ...prev, startTime: value }))}
                  options={timeOptions}
                />
                <Select
                  value={newBlockedSlot.endTime}
                  onValueChange={(value) => setNewBlockedSlot(prev => ({ ...prev, endTime: value }))}
                  options={timeOptions}
                />
                <Select
                  value={newBlockedSlot.type}
                  onValueChange={(value) => setNewBlockedSlot(prev => ({ ...prev, type: value as any }))}
                  options={blockReasons}
                />
                <Button 
                  onClick={addBlockedSlot} 
                  disabled={!newBlockedSlot.date}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Block
                </Button>
              </div>

              {/* Existing Blocked Slots */}
              {blockedSlots.length > 0 ? (
                <div className="space-y-3">
                  {blockedSlots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl animate-slide-in">
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                        <span className="font-medium text-red-900">{new Date(slot.date).toLocaleDateString()}</span>
                        <span className="text-red-800">{slot.startTime} - {slot.endTime}</span>
                        <span className="text-sm text-red-700">
                          {blockReasons.find(r => r.value === slot.type)?.label}
                          {slot.reason && ` - ${slot.reason}`}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeBlockedSlot(slot.id)}
                        className="text-red-600 hover:text-red-800 border-red-300 hover:border-red-400 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No blocked time slots</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mark Days Unavailable */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="flex items-center gap-3 text-gray-900">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Mark Days Unavailable
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Add New Unavailable Day */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <input
                  type="date"
                  value={newUnavailableDay.date}
                  onChange={(e) => setNewUnavailableDay(prev => ({ ...prev, date: e.target.value }))}
                  min={today}
                  className="px-3 py-2 border border-orange-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                />
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={newUnavailableDay.reason}
                  onChange={(e) => setNewUnavailableDay(prev => ({ ...prev, reason: e.target.value }))}
                  className="px-3 py-2 border border-orange-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                />
                <Button 
                  onClick={addUnavailableDay} 
                  disabled={!newUnavailableDay.date}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Mark Unavailable
                </Button>
              </div>

              {/* Existing Unavailable Days */}
              {unavailableDays.length > 0 ? (
                <div className="space-y-3">
                  {unavailableDays.map((day) => (
                    <div key={day.id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-xl animate-slide-in">
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 bg-orange-500 rounded-full" />
                        <span className="font-medium text-orange-900">{new Date(day.date).toLocaleDateString()}</span>
                        {day.reason && <span className="text-sm text-orange-700">- {day.reason}</span>}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeUnavailableDay(day.id)}
                        className="text-orange-600 hover:text-orange-800 border-orange-300 hover:border-orange-400 hover:bg-orange-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No unavailable days marked</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Sidebar */}
        {showPreview && (
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-0 bg-white sticky top-4 animate-slide-in">
              <CardHeader className="bg-blue-50 border-b">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <Eye className="h-5 w-5 text-blue-600" />
                  Live Preview
                </CardTitle>
                <div className="mt-2">
                  <Select
                    value={previewDay.toString()}
                    onValueChange={(value) => setPreviewDay(parseInt(value))}
                    options={daysOfWeek.map(day => ({
                      value: day.value.toString(),
                      label: day.name
                    }))}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedDayTemplate.isEnabled ? (
                    previewSlots.length > 0 ? (
                      previewSlots.map((slot, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded-lg text-sm animate-fade-in ${
                            slot.status === 'available' 
                              ? 'bg-green-50 border border-green-200 text-green-900' 
                              : slot.status === 'break'
                              ? 'bg-yellow-50 border border-yellow-200 text-yellow-900'
                              : 'bg-red-50 border border-red-200 text-red-900'
                          }`}
                          style={{ animationDelay: `${index * 20}ms` }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{slot.time}</span>
                            <span className="text-xs">
                              {slot.status === 'available' ? 'Available' : 
                               slot.status === 'break' ? 'Break' : 'Blocked'}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No time slots configured</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Day is marked as unavailable</p>
                    </div>
                  )}
                </div>
                
                {selectedDayTemplate.isEnabled && previewSlots.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Total slots: {previewSlots.length}</div>
                      <div>Available: {previewSlots.filter(s => s.status === 'available').length}</div>
                      <div>Break time: {previewSlots.filter(s => s.status === 'break').length}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
} 