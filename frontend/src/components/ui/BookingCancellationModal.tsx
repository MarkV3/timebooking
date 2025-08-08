"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Button } from './Button'
import { AlertCircle } from 'lucide-react'

interface BookingCancellationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  bookingId: string
  serviceName: string
  appointmentDate: string
}

export function BookingCancellationModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  bookingId,
  serviceName,
  appointmentDate
}: BookingCancellationModalProps) {
  const [reason, setReason] = useState('')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 animate-slide-in">
        <Card className="border-0">
          <CardHeader className="text-center bg-white border-b border-gray-200 rounded-t-lg">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-gray-900 text-2xl font-bold">
              Cancel Booking
            </CardTitle>
            <p className="text-gray-600 text-base mt-2">
              Are you sure you want to cancel this appointment?
            </p>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            <div className="bg-gray-100 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900">Appointment Details</h4>
              <p className="text-sm text-gray-700"><strong>Service:</strong> {serviceName}</p>
              <p className="text-sm text-gray-700"><strong>Date:</strong> {appointmentDate}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="cancellation-reason" className="text-sm font-medium text-gray-700">Reason for cancellation (optional)</label>
              <textarea
                id="cancellation-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Schedule conflict, no longer needed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="pt-4 flex gap-4">
              <Button 
                onClick={onClose}
                className="w-full"
                variant="outline"
                size="lg"
              >
                Keep Booking
              </Button>
              <Button 
                onClick={() => onConfirm(reason)}
                className="w-full"
                variant="destructive"
                size="lg"
              >
                Confirm Cancellation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}