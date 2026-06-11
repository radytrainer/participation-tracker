import clsx from 'clsx'
import { forwardRef } from 'react'

const Input = forwardRef(function Input({ label, error, className, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      )}
      <input
        ref={ref}
        className={clsx(
          'rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
          'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})

export const Select = forwardRef(function Select({ label, error, children, className, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      )}
      <select
        ref={ref}
        className={clsx(
          'rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
          'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:border-primary-500',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea({ label, error, className, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      )}
      <textarea
        ref={ref}
        className={clsx(
          'rounded-lg border px-3 py-2 text-sm outline-none transition-colors resize-none',
          'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:border-primary-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})

export default Input
