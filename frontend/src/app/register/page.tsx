"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { useAuth } from "@/contexts/AuthContext"
import { apiService } from "@/lib/api"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    userType: "customer", // Default to customer
    // Service provider specific fields
    businessName: "",
    description: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    // Validate service provider fields if needed
    if (formData.userType === "service_provider") {
      if (!formData.businessName.trim()) {
        setError("Business name is required for service providers")
        setLoading(false)
        return
      }
    }

    try {
      if (formData.userType === "service_provider") {
        // Use the register-provider endpoint for service providers
        await apiService.registerServiceProvider({
          full_name: formData.fullName,
          email: formData.email,
          password: formData.password,
          user_type: formData.userType,
        }, {
          business_name: formData.businessName,
          description: formData.description,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
        });
      } else {
        // Use regular registration for customers
        await apiService.register({
          full_name: formData.fullName,
          email: formData.email,
          password: formData.password,
          user_type: formData.userType,
        });
      }
      // On successful registration, redirect to login
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 -right-24 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Brand side */}
          <div className="hidden lg:block">
            <div className="rounded-2xl border border-border bg-white/70 backdrop-blur p-8 shadow-sm sticky top-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold">T</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">TimeBooking</h1>
              </div>
              <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
                Create your account
              </h2>
              <p className="text-muted-foreground mb-6">
                Choose your role and start booking or offering services in minutes.
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-primary rounded-full" /> Fast setup</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-primary rounded-full" /> Clear, simple onboarding</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-primary rounded-full" /> Great on desktop and mobile</li>
              </ul>
            </div>
          </div>

          {/* Form */}
          <Card className="w-full max-w-xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
              <CardDescription>Join TimeBooking today</CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
            {/* User Type Selection */}
            <div>
              <label htmlFor="userType" className="block text-sm font-medium mb-2">
                Account Type
              </label>
              <select
                id="userType"
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="customer">Customer - Book services</option>
                <option value="service_provider">Service Provider - Offer services</option>
              </select>
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium mb-2">
                Full Name
              </label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
              />
            </div>

            {/* Service Provider specific fields */}
            {formData.userType === "service_provider" && (
              <>
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-3">Business Information</h3>
                </div>
                
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium mb-2">
                    Business Name *
                  </label>
                  <Input
                    id="businessName"
                    name="businessName"
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="Enter your business name"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-2">
                    Business Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe your services..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2">
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Your business phone"
                  />
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium mb-2">
                    Address
                  </label>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Business address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium mb-2">
                      City
                    </label>
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium mb-2">
                      State
                    </label>
                    <Input
                      id="state"
                      name="state"
                      type="text"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="State"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="zipCode" className="block text-sm font-medium mb-2">
                    Zip Code
                  </label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    type="text"
                    value={formData.zipCode}
                    onChange={handleChange}
                    placeholder="Zip code"
                  />
                </div>
              </>
            )}

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : `Create ${formData.userType === 'service_provider' ? 'Provider' : 'Customer'} Account`}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}