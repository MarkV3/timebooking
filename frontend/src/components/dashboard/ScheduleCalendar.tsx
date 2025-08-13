"use client"

import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { type Booking } from '@/lib/api';

interface ScheduleCalendarProps {
  bookings: Booking[];
}

export function ScheduleCalendar({ bookings }: ScheduleCalendarProps) {
  const bookedDays = bookings.map(booking => new Date(booking.appointment_start_time));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <DayPicker
          mode="multiple"
          selected={bookedDays}
          showOutsideDays
          fixedWeeks
          styles={{
            caption: { color: 'var(--primary)' },
          }}
        />
      </CardContent>
    </Card>
  );
}
