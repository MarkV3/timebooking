import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

export function Badge({ children, className = '', variant = 'default' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors'
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    secondary: 'bg-blue-100 text-blue-800 border-blue-200',
    destructive: 'bg-red-100 text-red-800 border-red-200',
    outline: 'bg-transparent border-gray-300 text-gray-700'
  }

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
} 