"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { Calendar } from "lucide-react"
import { AvailabilityCalendar } from "./AvailabilityCalendar"

interface AvailabilityManagerProps {
  refreshToken?: number
}

export function AvailabilityManager({ refreshToken = 0 }: AvailabilityManagerProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Calendar View</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent>
        <AvailabilityCalendar refreshToken={refreshToken} />
      </CardContent>
    </Card>
  )
}
