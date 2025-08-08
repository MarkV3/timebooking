"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  className?: string
  disabled?: boolean
}

export function Checkbox({ 
  checked, 
  onCheckedChange, 
  label,
  className,
  disabled = false
}: CheckboxProps) {
  return (
    <label className={cn(
      "flex items-center space-x-2 cursor-pointer",
      disabled && "cursor-not-allowed opacity-50",
      className
    )}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-input ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary border-primary text-primary-foreground" : "bg-background"
        )}
        onClick={() => !disabled && onCheckedChange(!checked)}
        disabled={disabled}
      >
        {checked && (
          <svg
            className="w-3 h-3 text-current"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>
      {label && (
        <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </span>
      )}
    </label>
  )
} 