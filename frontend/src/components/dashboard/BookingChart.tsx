"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { type Booking } from '@/lib/api';

interface BookingChartProps {
  bookings: Booking[];
}

export function BookingChart({ bookings }: BookingChartProps) {
  const data = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return {
      name: date.toLocaleDateString('en-US', { weekday: 'short' }),
      bookings: 0,
    };
  }).reverse();

  bookings.forEach(booking => {
    const bookingDate = new Date(booking.created_at);
    const diffDays = Math.floor((new Date().getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      const dayIndex = 6 - diffDays;
      data[dayIndex].bookings++;
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings in the Last 7 Days</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="bookings" fill="var(--primary)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
