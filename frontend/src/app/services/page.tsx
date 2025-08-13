"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Select } from '@/components/ui'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { apiService, type ServiceProvider } from '@/lib/api'
import { ProviderCard } from '@/components/ui/ProviderCard'

export default function ServicesPage() {
  const [providers, setProviders] = useState<ServiceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
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
      const data = await apiService.searchServiceProviders(searchQuery, city, state)
      setProviders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
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
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-heading tracking-tight">Find Your Perfect Service</h1>
              <p className="mt-2 text-lg text-muted-foreground">Discover and book appointments with top-rated professionals in your area.</p>
            </div>

            <form onSubmit={handleSearch} className="bg-card p-6 rounded-lg shadow-sm border border-border flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-grow w-full">
                <Input
                  placeholder="Search by business name or service type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <Select
                  value={city}
                  onValueChange={setCity}
                  options={[
                    { value: 'New York', label: 'New York' },
                    { value: 'San Francisco', label: 'San Francisco' },
                  ]}
                  placeholder="City"
                  className="h-12"
                />
                <Select
                  value={state}
                  onValueChange={setState}
                  options={[
                    { value: 'NY', label: 'NY' },
                    { value: 'CA', label: 'CA' },
                  ]}
                  placeholder="State"
                  className="h-12"
                />
              </div>
              <Button type="submit" disabled={searching} className="h-12 w-full md:w-auto">
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </form>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>

            {providers.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🤷‍♀️</div>
                <h3 className="text-2xl font-heading mb-2">No providers found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || city || state
                    ? 'Try adjusting your search or filters.'
                    : 'It looks like there are no service providers available right now.'
                  }
                </p>
                {(searchQuery || city || state) && (
                  <Button onClick={() => {
                    setSearchQuery('')
                    setCity('')
                    setState('')
                    loadProviders()
                  }}>
                    Clear Filters
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