"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, Checkbox } from "@/components/ui"
import type { AvailabilityOverrideForm, CustomTimeSlot } from "@/types"

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minute = i % 2 === 0 ? "00" : "30"
  const time24 = `${hour.toString().padStart(2, "0")}:${minute}`
  
  return { value: time24, label: time24 }
})

interface DateOverride extends AvailabilityOverrideForm {
  id?: string
}

export function DateOverrides() {
  const [overrides, setOverrides] = useState<DateOverride[]>([])
  const [newOverride, setNewOverride] = useState<DateOverride>({
    override_date: "",
    customSlots: [],
    isUnavailable: false,
    reason: "",
  })

  const addOverride = () => {
    if (newOverride.override_date) {
      setOverrides(prev => [...prev, { ...newOverride, id: Date.now().toString() }])
      setNewOverride({
        override_date: "",
        customSlots: [],
        isUnavailable: false,
        reason: "",
      })
    }
  }

  const removeOverride = (id: string) => {
    setOverrides(prev => prev.filter(override => override.id !== id))
  }

  const updateOverride = (id: string, updates: Partial<DateOverride>) => {
    setOverrides(prev => 
      prev.map(override => 
        override.id === id 
          ? { ...override, ...updates }
          : override
      )
    )
  }

  const addTimeSlot = (overrideId: string) => {
    updateOverride(overrideId, {
      customSlots: [
        ...(overrides.find(o => o.id === overrideId)?.customSlots || []),
        { startTime: "09:00", endTime: "10:00", isAvailable: true }
      ]
    })
  }

  const updateTimeSlot = (overrideId: string, slotIndex: number, updates: Partial<CustomTimeSlot>) => {
    const override = overrides.find(o => o.id === overrideId)
    if (override) {
      const updatedSlots = override.customSlots.map((slot, index) =>
        index === slotIndex ? { ...slot, ...updates } : slot
      )
      updateOverride(overrideId, { customSlots: updatedSlots })
    }
  }

  const removeTimeSlot = (overrideId: string, slotIndex: number) => {
    const override = overrides.find(o => o.id === overrideId)
    if (override) {
      const updatedSlots = override.customSlots.filter((_, index) => index !== slotIndex)
      updateOverride(overrideId, { customSlots: updatedSlots })
    }
  }

  const handleSave = () => {
    // TODO: Implement API call to save overrides
    console.log("Saving overrides:", overrides)
    alert("Date overrides saved! (This will connect to API later)")
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  return (
    <div className="space-y-6">
      {/* Add New Override */}
      <Card>
        <CardHeader>
          <CardTitle>Add Special Date</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={newOverride.override_date}
                min={getMinDate()}
                onChange={(e) => setNewOverride(prev => ({ ...prev, override_date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (Optional)</label>
              <Input
                type="text"
                placeholder="Holiday, vacation, special event..."
                value={newOverride.reason}
                onChange={(e) => setNewOverride(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Checkbox
              checked={newOverride.isUnavailable}
              onCheckedChange={(checked) => setNewOverride(prev => ({ 
                ...prev, 
                isUnavailable: checked,
                customSlots: checked ? [] : prev.customSlots
              }))}
              label="Mark as completely unavailable"
            />

            {!newOverride.isUnavailable && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Time Slots</label>
                <p className="text-sm text-muted-foreground">
                  Leave empty to use your regular weekly template for this date.
                </p>
                
                <div className="space-y-2">
                  {newOverride.customSlots.map((slot, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2 items-center">
                      <Select
                        value={slot.startTime}
                        onValueChange={(value) => {
                          const updatedSlots = newOverride.customSlots.map((s, i) =>
                            i === index ? { ...s, startTime: value } : s
                          )
                          setNewOverride(prev => ({ ...prev, customSlots: updatedSlots }))
                        }}
                        options={timeOptions}
                      />
                      <Select
                        value={slot.endTime}
                        onValueChange={(value) => {
                          const updatedSlots = newOverride.customSlots.map((s, i) =>
                            i === index ? { ...s, endTime: value } : s
                          )
                          setNewOverride(prev => ({ ...prev, customSlots: updatedSlots }))
                        }}
                        options={timeOptions}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updatedSlots = newOverride.customSlots.filter((_, i) => i !== index)
                          setNewOverride(prev => ({ ...prev, customSlots: updatedSlots }))
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewOverride(prev => ({
                        ...prev,
                        customSlots: [
                          ...prev.customSlots,
                          { startTime: "09:00", endTime: "10:00", isAvailable: true }
                        ]
                      }))
                    }}
                  >
                    Add Time Slot
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button onClick={addOverride} disabled={!newOverride.override_date}>
            Add Date Override
          </Button>
        </CardContent>
      </Card>

      {/* Existing Overrides */}
      {overrides.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Scheduled Overrides</h3>
          
          {overrides
            .sort((a, b) => new Date(a.override_date).getTime() - new Date(b.override_date).getTime())
            .map((override) => (
              <Card key={override.id}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {formatDate(override.override_date)}
                      </CardTitle>
                      {override.reason && (
                        <p className="text-sm text-muted-foreground">{override.reason}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOverride(override.id!)}
                    >
                      Remove
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {override.isUnavailable ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">❌ Unavailable all day</p>
                    </div>
                  ) : override.customSlots.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">📅 Using regular weekly schedule</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Custom time slots:</h4>
                      <div className="grid gap-2">
                        {override.customSlots.map((slot, index) => (
                          <div key={index} className="grid grid-cols-3 gap-2 items-center">
                            <Select
                              value={slot.startTime}
                              onValueChange={(value) => updateTimeSlot(override.id!, index, { startTime: value })}
                              options={timeOptions}
                            />
                            <Select
                              value={slot.endTime}
                              onValueChange={(value) => updateTimeSlot(override.id!, index, { endTime: value })}
                              options={timeOptions}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeTimeSlot(override.id!, index)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addTimeSlot(override.id!)}
                        >
                          Add Time Slot
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Save Button */}
      {overrides.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} className="px-8">
            Save Date Overrides
          </Button>
        </div>
      )}
    </div>
  )
} 