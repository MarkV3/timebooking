"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { useAuth } from "@/contexts/AuthContext"
import { apiService, ApiError, NetworkError } from "@/lib/api"

interface Category {
  name: string;
  icon: string;
  count: string;
}

interface ErrorState {
  message: string;
  type: 'error' | 'warning' | 'info';
}

export default function Home() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [error, setError] = useState<ErrorState | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      setError(null);
      
      try {
        const fetchedCategories = await apiService.getCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Failed to fetch categories", error);
        
        let errorMessage = "Failed to load service categories";
        let errorType: 'error' | 'warning' | 'info' = 'error';
        
        if (error instanceof NetworkError) {
          errorMessage = error.message;
          errorType = 'warning';
        } else if (error instanceof ApiError) {
          if (error.status === 404) {
            errorMessage = "Categories service is not available";
            errorType = 'info';
          } else {
            errorMessage = error.message;
          }
        }
        
        setError({ message: errorMessage, type: errorType });
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      // Redirect authenticated users to their appropriate dashboard
      if (user.user_type === 'service_provider') {
        router.push('/providers/dashboard')
      } else {
        router.push('/services')
      }
    }
  }, [isAuthenticated, user, authLoading, router])

  // Show loading state during auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render the home page if user is authenticated (they will be redirected)
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    )
  }

  const ErrorAlert = ({ error }: { error: ErrorState }) => {
    const getErrorStyles = (type: string) => {
      switch (type) {
        case 'warning':
          return 'bg-yellow-50 border-yellow-200 text-yellow-800';
        case 'info':
          return 'bg-blue-50 border-blue-200 text-blue-800';
        default:
          return 'bg-red-50 border-red-200 text-red-800';
      }
    };

    return (
      <div className={`p-4 rounded-lg border ${getErrorStyles(error.type)} mb-6`}>
        <p className="text-sm font-medium">{error.message}</p>
      </div>
    );
  };

  const LoadingSpinner = ({ size = 'small' }: { size?: 'small' | 'medium' | 'large' }) => {
    const sizeClasses = {
      small: 'h-4 w-4',
      medium: 'h-6 w-6',
      large: 'h-8 w-8'
    };

    return (
      <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]}`}></div>
    );
  };

  return (
    <div className="flex flex-col">
      {/* New Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-[28rem] w-[36rem] rotate-12 bg-gradient-to-br from-primary/30 via-blue-400/20 to-transparent blur-3xl" />
          <div className="absolute top-1/2 -right-24 h-[28rem] w-[36rem] -rotate-12 bg-gradient-to-br from-secondary/30 via-emerald-400/20 to-transparent blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Faster bookings, happier days
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold font-heading tracking-tight mb-6">
                A better way to book services
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                Discover providers, find the perfect time, and confirm in seconds. TimeBooking keeps your schedule flowing.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <Link href="/register">Get started</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-6 max-w-md">
                <div>
                  <div className="text-2xl font-bold">2k+</div>
                  <div className="text-sm text-muted-foreground">Bookings</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">350+</div>
                  <div className="text-sm text-muted-foreground">Providers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">4.8★</div>
                  <div className="text-sm text-muted-foreground">Avg rating</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-border bg-card shadow-xl p-4 lg:p-6">
                <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-muted to-muted/70 flex items-center justify-center text-muted-foreground">
                  Preview your schedule here
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold font-heading mb-4 tracking-tight">
              Why Choose TimeBooking?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We make it simple to find, book, and manage appointments with service providers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <CardTitle>Easy Discovery</CardTitle>
                <CardDescription>
                  Find the perfect service provider in your area with our smart search and filtering system.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <CardTitle>Instant Booking</CardTitle>
                <CardDescription>
                  Book appointments in real-time with available time slots and instant confirmation.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <CardTitle>Trusted Providers</CardTitle>
                <CardDescription>
                  All service providers are verified and rated by our community for your peace of mind.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold font-heading mb-4">
              Popular Service Categories
            </h2>
            <p className="text-xl text-muted-foreground">
              Discover services across various categories
            </p>
          </div>

          {/* Error display */}
          {error && <ErrorAlert error={error} />}

          {/* Loading state */}
          {categoriesLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <LoadingSpinner size="medium" />
                <p className="mt-4 text-muted-foreground">Loading categories...</p>
              </div>
            </div>
          )}

          {/* Categories grid */}
          {!categoriesLoading && !error && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {categories.length > 0 ? (
                categories.map((category) => (
                  <Card key={category.name} className="hover:shadow-md transition-all duration-300 cursor-pointer hover:scale-105">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl mb-3">{category.icon}</div>
                      <h3 className="font-semibold mb-2">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">{category.count}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">No categories available at the moment.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
