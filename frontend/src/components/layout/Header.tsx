"use client"

import Link from "next/link"
import { Button } from "@/components/ui"
import { useAuth } from "@/contexts/AuthContext"

export function Header() {
  const { user, isAuthenticated, logout, loading } = useAuth()

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">T</span>
              </div>
              <span className="font-bold text-xl">TimeBooking</span>
            </Link>
          </div>
          <div className="w-20 h-8 bg-muted rounded animate-pulse"></div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-lg">T</span>
            </div>
            <span className="font-bold text-xl tracking-tight">TimeBooking</span>
          </Link>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex items-center space-x-6">
              {user?.user_type === 'customer' ? (
                <>
                  <Link 
                    href="/services" 
                    className="text-sm font-medium text-foreground/80 hover:text-foreground"
                  >
                    Browse Services
                  </Link>
                  <Link 
                    href="/bookings" 
                    className="text-sm font-medium text-foreground/80 hover:text-foreground"
                  >
                    My Bookings
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    href="/providers/dashboard" 
                    className="text-sm font-medium text-foreground/80 hover:text-foreground"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/providers/bookings" 
                    className="text-sm font-medium text-foreground/80 hover:text-foreground"
                  >
                    My Bookings
                  </Link>
                </>
              )}
            </nav>
            
            <div className="flex items-center space-x-3">
              <span className="text-sm text-muted-foreground hidden sm:block">
                Welcome, {user?.full_name}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                href="/about" 
                className="text-sm font-medium text-foreground/80 hover:text-foreground"
              >
                About
              </Link>
              <Link 
                href="/contact" 
                className="text-sm font-medium text-foreground/80 hover:text-foreground"
              >
                Contact
              </Link>
            </nav>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
} 