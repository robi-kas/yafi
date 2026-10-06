'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { login } from './actions'

export function LoginForm({ message }: { message?: string }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 dark:bg-gray-900/50 sm:px-16">
      <form className="flex flex-col space-y-4" action={login}>
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-xs uppercase text-gray-600 dark:text-gray-400"
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
            className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
          />
        </div>
        
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-xs uppercase text-gray-600 dark:text-gray-400"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-10 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
          className="mt-2 flex h-10 w-full items-center justify-center rounded-md border border-transparent bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-colors"
        >
          Sign In
        </button>

        {message && (
          <div className="mt-4 p-4 bg-red-100/80 border border-red-200 text-red-700 text-center text-sm rounded-md dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
            {message}
          </div>
        )}
      </form>
    </div>
  )
}
