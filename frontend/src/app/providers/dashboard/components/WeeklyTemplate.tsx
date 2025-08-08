"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, Button, Select, Checkbox } from "@/components/ui"

const daysOfWeek = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
]

const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i
  const time24 = `${hour.toString().padStart(2, '0')}:00`
  
  return { value: time24, label: time24 }
})

const slotOptions = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hour" },
]

interface DayTemplate {
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDuration: number
  isEnabled: boolean
}

export function WeeklyTemplate() {
  const [templates, setTemplates] = useState<DayTemplate[]>(() =>
    daysOfWeek.map(day => ({
      dayOfWeek: day.value,
      startTime: "09:00",
      endTime: "17:00",
      slotDuration: 30,
      isEnabled: day.value >= 1 && day.value <= 5, // Weekdays only
    }))
  )

  const updateTemplate = (dayOfWeek: number, updates: Partial<DayTemplate>) => {
    setTemplates(prev => 
      prev.map(template => 
        template.dayOfWeek === dayOfWeek 
          ? { ...template, ...updates }
          : template
      )
    )
  }

  const handleSave = () => {
    console.log("Saving templates:", templates)
    alert("Settings saved!")
  }

  const copyToAll = () => {
    const mondayTemplate = templates.find(t => t.dayOfWeek === 1)
    if (mondayTemplate) {
      daysOfWeek.forEach(day => {
        if (day.value !== 1) {
          updateTemplate(day.value, {
            startTime: mondayTemplate.startTime,
            endTime: mondayTemplate.endTime,
            slotDuration: mondayTemplate.slotDuration,
          })
        }
      })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Working Hours</CardTitle>
          <div className="flex gap-2">
            <Button variant="soft" size="sm" onClick={copyToAll}>
              Copy Mon to All
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {daysOfWeek.map((day) => {
          const template = templates.find(t => t.dayOfWeek === day.value)!
          
          return (
            <div
              key={day.value}
              className="grid grid-cols-[40px_40px_1fr_20px_1fr_80px] items-center gap-3 p-3 border rounded-md bg-background hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={template.isEnabled}
                  onCheckedChange={(checked) => updateTemplate(day.value, { isEnabled: checked })}
                />
              </div>
              
              <div className="text-sm font-medium text-foreground">{day.label}</div>
              
              {template.isEnabled ? (
                <>
                  <Select
                    value={template.startTime}
                    onValueChange={(value) => updateTemplate(day.value, { startTime: value })}
                    options={timeOptions}
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Select
                    value={template.endTime}
                    onValueChange={(value) => updateTemplate(day.value, { endTime: value })}
                    options={timeOptions}
                  />
                  <Select
                    value={template.slotDuration.toString()}
                    onValueChange={(value) => updateTemplate(day.value, { slotDuration: parseInt(value) })}
                    options={slotOptions}
                  />
                </>
              ) : (
                <div className="col-span-4 text-xs text-muted-foreground">Unavailable</div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
} 