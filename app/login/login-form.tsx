'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { login } from './actions'

export function LoginForm({ message }: { message?: string }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex flex-col space-y-4 px-4 py-8 sm:px-16">
      <form className="flex flex-col space-y-4" action={login}>
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-xs uppercase text-muted-foreground"
          >
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-xs uppercase text-muted-foreground"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="mt-2 flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
        >
          Sign In
        </button>

        {message && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-center text-sm rounded-md">
            {message}
          </div>
        )}
      </form>
    </div>
  )
}
