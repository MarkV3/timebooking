"use client"

import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Button } from "@/components/ui"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { apiService } from "@/lib/api"

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentFormProps {
  bookingId: string
  amount: number
  currency?: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function PaymentForm({ 
  bookingId, 
  amount, 
  currency = "usd", 
  onSuccess, 
  onError 
}: PaymentFormProps) {
  const [loading, setLoading] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'succeeded' | 'failed'>('idle')

  const handlePayment = async () => {
    try {
      setLoading(true)
      setPaymentStatus('processing')

      // Create payment intent
      const paymentIntentResponse = await apiService.createPaymentIntent({
        booking_id: bookingId,
        amount: amount,
        currency: currency
      })

      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        clientSecret: paymentIntentResponse.client_secret,
        confirmParams: {
          return_url: `${window.location.origin}/bookings?payment=success`,
        },
        redirect: 'if_required'
      })

      if (error) {
        throw new Error(error.message)
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment on our backend
        await apiService.confirmPayment({
          payment_intent_id: paymentIntent.id,
          booking_id: bookingId
        })

        setPaymentStatus('succeeded')
        onSuccess?.()
      } else {
        throw new Error('Payment confirmation failed')
      }

    } catch (error) {
      console.error('Payment error:', error)
      setPaymentStatus('failed')
      const errorMessage = error instanceof Error ? error.message : 'Payment failed'
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  if (paymentStatus === 'succeeded') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-green-900 mb-2">Payment Successful!</h3>
          <p className="text-green-700">Your booking has been confirmed and payment processed.</p>
        </CardContent>
      </Card>
    )
  }

  if (paymentStatus === 'failed') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Payment Failed</h3>
          <p className="text-red-700 mb-4">There was an issue processing your payment.</p>
          <Button 
            onClick={() => {
              setPaymentStatus('idle')
            }}
            variant="outline"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Your Payment</CardTitle>
        <CardDescription>
          Secure payment processing powered by Stripe
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Amount:</span>
            <span className="text-lg font-semibold">{formatAmount(amount)}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>✓ Secure payment processing</p>
            <p>✓ 256-bit SSL encryption</p>
            <p>✓ No payment information stored</p>
          </div>
        </div>

        <Button 
          onClick={handlePayment}
          disabled={loading || paymentStatus === 'processing'}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing Payment...
            </>
          ) : (
            `Pay ${formatAmount(amount)}`
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          By clicking "Pay", you agree to our terms of service and privacy policy.
          Your payment is secured by Stripe.
        </p>
      </CardContent>
    </Card>
  )
}
