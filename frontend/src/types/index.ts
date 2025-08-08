// User types
export interface User {
  id: string
  email: string
  name: string
  role: 'customer' | 'provider'
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

// Service Provider types
export interface ServiceProvider {
  id: string
  userId: string
  businessName: string
  description: string
  category: string
  location: string
  phone?: string
  website?: string
  avatar?: string
  rating: number
  reviewCount: number
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

// Service types
export interface Service {
  id: string
  providerId: string
  name: string
  description: string
  duration: number // in minutes
  price: number
  category: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Time Slot types
export interface TimeSlot {
  id: string
  serviceId: string
  startTime: Date
  endTime: Date
  isAvailable: boolean
  isBooked: boolean
  createdAt: Date
  updatedAt: Date
}

// Booking types
export interface Booking {
  id: string
  customerId: string
  serviceId: string
  timeSlotId: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes?: string
  totalPrice: number
  createdAt: Date
  updatedAt: Date
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: 'customer' | 'provider'
}

export interface ServiceProviderForm {
  businessName: string
  description: string
  category: string
  location: string
  phone?: string
  website?: string
}

export interface ServiceForm {
  name: string
  description: string
  duration: number
  price: number
  category: string
}

export interface BookingForm {
  serviceId: string
  timeSlotId: string
  notes?: string
}

// Search and Filter types
export interface SearchFilters {
  query?: string
  category?: string
  location?: string
  priceMin?: number
  priceMax?: number
  rating?: number
  sortBy?: 'price' | 'rating' | 'distance' | 'newest'
  sortOrder?: 'asc' | 'desc'
}

// Component prop types
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

export interface InputProps {
  label?: string
  placeholder?: string
  type?: string
  error?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// Availability Management types
export interface AvailabilityTemplate {
  id: string
  providerId: string
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  slotDuration: number // in minutes
  breakStartTime?: string
  breakEndTime?: string
  isEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AvailabilityOverride {
  id: string
  providerId: string
  override_date: string // YYYY-MM-DD format
  customSlots: CustomTimeSlot[]
  isUnavailable: boolean
  reason?: string
  createdAt: Date
  updatedAt: Date
}

export interface CustomTimeSlot {
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  isAvailable: boolean
}

export interface RecurringPattern {
  id: string
  providerId: string
  name: string
  templateId: string
  startDate: string // YYYY-MM-DD format
  endDate?: string // YYYY-MM-DD format (null for indefinite)
  frequency: 'weekly' | 'monthly'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Form types for availability management
export interface AvailabilityTemplateForm {
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDuration: number
  breakStartTime?: string
  breakEndTime?: string
  isEnabled: boolean
}

export interface AvailabilityOverrideForm {
  override_date: string // YYYY-MM-DD format
  customSlots: CustomTimeSlot[]
  isUnavailable: boolean
  reason?: string
}

export interface RecurringPatternForm {
  name: string
  templateId: string
  startDate: string
  endDate?: string
  frequency: 'weekly' | 'monthly'
} 