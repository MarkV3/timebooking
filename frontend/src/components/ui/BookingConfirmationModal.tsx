"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Button } from './Button'
import { Badge } from './Badge'

export interface BookingConfirmationData {
  serviceName: string
  serviceDescription?: string
  duration: number
  price: number
  date: string
  time: string
  providerName: string
  bookingId: string
}

interface BookingConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  bookingData: BookingConfirmationData
  onViewBookings?: () => void
}

export function BookingConfirmationModal({ 
  isOpen, 
  onClose, 
  bookingData,
  onViewBookings
}: BookingConfirmationModalProps) {
  if (!isOpen) return null

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-lg shadow-2xl max-w-md w-full mx-4 animate-slide-in">
        <Card className="border-0">
          <CardHeader className="text-center bg-card border-b border-border rounded-t-lg">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <svg 
                className="w-8 h-8 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
            <CardTitle className="text-foreground text-2xl font-bold">
              Booking Confirmed!
            </CardTitle>
            <p className="text-muted-foreground text-base mt-2">
              Your appointment has been successfully booked
            </p>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {/* Service Information */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground">
                    {bookingData.serviceName}
                  </h3>
                  {bookingData.serviceDescription && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {bookingData.serviceDescription}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                      {bookingData.duration} mins
                    </Badge>
                    <span className="text-sm text-foreground">
                      with {bookingData.providerName}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatPrice(bookingData.price)}
                  </p>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Appointment Details
              </h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground font-medium">Date</p>
                  <p className="font-semibold text-foreground">{bookingData.date}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Time</p>
                  <p className="font-semibold text-foreground">{bookingData.time}</p>
                </div>
              </div>
              
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium">
                  Booking ID: #{bookingData.bookingId.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            {/* Calendar Notification */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-green-900 font-medium">Event added to your calendar automatically</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4">
              <Button 
                onClick={() => {
                  if (onViewBookings) {
                    onViewBookings()
                  } else {
                    onClose()
                  }
                }}
                className="w-full"
                size="lg"
              >
                OK
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 