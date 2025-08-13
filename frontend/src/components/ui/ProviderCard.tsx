import Link from 'next/link'
import { Button } from '@/components/ui'
import { Card, CardContent } from '@/components/ui'
import type { ServiceProvider } from '@/lib/api'

interface ProviderCardProps {
  provider: ServiceProvider
}

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}>
      ★
    </span>
  ))
}

export function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
      <div className="md:flex">
        <div className="md:flex-shrink-0">
          <img className="h-48 w-full object-cover md:w-48" src={provider.profile_image_url || 'https://via.placeholder.com/150'} alt={provider.business_name} />
        </div>
        <div className="p-6">
          <div className="flex items-baseline justify-between">
            <div className="text-sm text-indigo-600 font-semibold tracking-wide uppercase">
              {provider.city}, {provider.state}
            </div>
            <div className="flex items-center text-sm">
              {renderStars(provider.rating)}
              <span className="ml-1 text-muted-foreground">
                ({provider.rating.toFixed(1)})
              </span>
            </div>
          </div>
          <Link href={`/providers/${provider.id}`} className="block mt-1 text-lg leading-tight font-medium text-black hover:underline">
            {provider.business_name}
          </Link>
          <p className="mt-2 text-muted-foreground line-clamp-3">{provider.description}</p>
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {provider.total_reviews} reviews
            </div>
            <Link href={`/providers/${provider.id}#book`}>
              <Button>Book Now</Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}
