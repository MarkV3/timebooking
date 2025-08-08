"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { apiService, type ServiceProvider } from '@/lib/api'

export default function ServicesPage() {
  const [providers, setProviders] = useState<ServiceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      setLoading(true)
      const data = await apiService.searchServiceProviders()
      setProviders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSearching(true)
      setError('')
      const data = await apiService.searchServiceProviders(searchQuery)
      setProviders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}>
        ★
      </span>
    ))
  }

  if (loading) {
    return (
      <ProtectedRoute allowedUserTypes={['customer']}>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading service providers...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedUserTypes={['customer']}>
      <div className="min-h-screen bg-background">
        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Search Section */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Service Providers</h1>
                <p className="text-muted-foreground">Find and book appointments with trusted professionals</p>
              </div>
              
              <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sm:w-64"
                />
                <Button type="submit" disabled={searching}>
                  {searching ? 'Searching...' : 'Search'}
                </Button>
              </form>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {/* Providers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.map((provider) => (
                <Card key={provider.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{provider.business_name}</CardTitle>
                        <CardDescription className="text-sm">
                          Service Provider
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-sm">
                          {renderStars(provider.rating)}
                          <span className="ml-1 text-muted-foreground">
                            ({provider.rating.toFixed(1)})
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {provider.description || 'No description available'}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          📍 {provider.city && provider.state ? `${provider.city}, ${provider.state}` : 'Location not specified'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {provider.total_reviews} reviews
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Link href={`/providers/${provider.id}`} className="flex-1">
                          <Button className="w-full" size="sm">
                            View Details
                          </Button>
                        </Link>
                        <Link href={`/providers/${provider.id}#book`}>
                          <Button variant="outline" size="sm">
                            Book Now
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State */}
            {providers.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">No service providers found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? `No results for "${searchQuery}". Try different keywords.`
                    : 'No service providers are currently available.'
                  }
                </p>
                {searchQuery && (
                  <Button onClick={() => {
                    setSearchQuery('')
                    loadProviders()
                  }}>
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 