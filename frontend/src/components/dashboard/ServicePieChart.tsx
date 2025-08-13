"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { type Booking } from '@/lib/api';

interface ServicePieChartProps {
  bookings: Booking[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

export function ServicePieChart({ bookings }: ServicePieChartProps) {
  const serviceCounts = bookings.reduce((acc, booking) => {
    acc[booking.service_name] = (acc[booking.service_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.keys(serviceCounts).map(serviceName => ({
    name: serviceName,
    value: serviceCounts[serviceName],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Popularity</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
