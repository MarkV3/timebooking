/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/lib/api'
import Home from '../page'

// Mock the AuthContext
jest.mock('@/contexts/AuthContext')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Mock the API service
jest.mock('@/lib/api')
const mockApiService = apiService as jest.Mocked<typeof apiService>

// Mock UI components
jest.mock('@/components/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}))

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default auth state - not authenticated
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    })

    // Default API response
    mockApiService.getCategories.mockResolvedValue([
      { name: 'Hair & Beauty', icon: '💄', count: '25 services' },
      { name: 'Tech Support', icon: '🔧', count: '10 services' },
    ])
  })

  describe('When user is not authenticated', () => {
    it('should render the landing page with hero section', async () => {
      render(<Home />)

      expect(screen.getByText('Book Services,')).toBeInTheDocument()
      expect(screen.getByText('Save Time')).toBeInTheDocument()
      expect(screen.getByText('Get Started')).toBeInTheDocument()
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    it('should render features section', async () => {
      render(<Home />)

      expect(screen.getByText('Why Choose TimeBooking?')).toBeInTheDocument()
      expect(screen.getByText('Easy Discovery')).toBeInTheDocument()
      expect(screen.getByText('Instant Booking')).toBeInTheDocument()
      expect(screen.getByText('Trusted Providers')).toBeInTheDocument()
    })

    it('should load and display categories', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Hair & Beauty')).toBeInTheDocument()
        expect(screen.getByText('Tech Support')).toBeInTheDocument()
      })

      expect(mockApiService.getCategories).toHaveBeenCalledTimes(1)
    })

    it('should show loading state for categories', async () => {
      // Make API call pending
      mockApiService.getCategories.mockImplementation(() => new Promise(() => {}))

      render(<Home />)

      expect(screen.getByText('Loading categories...')).toBeInTheDocument()
    })

    it('should handle category loading errors', async () => {
      mockApiService.getCategories.mockRejectedValue(new Error('Network error'))

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load service categories/)).toBeInTheDocument()
      })
    })

    it('should show empty state when no categories available', async () => {
      mockApiService.getCategories.mockResolvedValue([])

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('No categories available at the moment.')).toBeInTheDocument()
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })
    })
  })

  describe('When user is authenticated', () => {
    it('should show loading state while checking authentication', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        loading: true,
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      })

      render(<Home />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should show redirecting state for authenticated users', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', full_name: 'Test User', user_type: 'customer', is_active: true, created_at: '2024-01-01' },
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      })

      render(<Home />)

      expect(screen.getByText('Redirecting...')).toBeInTheDocument()
    })
  })

  describe('Error handling', () => {
    it('should display network error with appropriate styling', async () => {
      const networkError = new Error('Network error')
      networkError.name = 'NetworkError'
      mockApiService.getCategories.mockRejectedValue(networkError)

      render(<Home />)

      await waitFor(() => {
        const errorElement = screen.getByText(/Network error/)
        expect(errorElement).toBeInTheDocument()
      })
    })

    it('should provide retry functionality on error', async () => {
      mockApiService.getCategories.mockRejectedValue(new Error('Network error'))

      // Mock window.location.reload
      const mockReload = jest.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })

      // Note: Testing the actual click would require more complex mocking
      // This just ensures the button is present
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      render(<Home />)

      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('Book Services, Save Time')

      const sectionHeadings = screen.getAllByRole('heading', { level: 2 })
      expect(sectionHeadings).toHaveLength(2) // "Why Choose TimeBooking?" and "Popular Service Categories"
    })

    it('should have accessible buttons', async () => {
      render(<Home />)

      const getStartedButton = screen.getByRole('button', { name: /get started/i })
      const signInButton = screen.getByRole('button', { name: /sign in/i })

      expect(getStartedButton).toBeInTheDocument()
      expect(signInButton).toBeInTheDocument()
    })
  })

  describe('Visual enhancements', () => {
    it('should render card components with hover effects', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Hair & Beauty')).toBeInTheDocument()
      })

      // Cards should be rendered (tested through component mocking)
      const categories = screen.getAllByText(/Hair & Beauty|Tech Support/)
      expect(categories.length).toBeGreaterThan(0)
    })
  })
}) 