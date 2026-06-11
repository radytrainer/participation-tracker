import clsx from 'clsx'

export function Card({ children, className }) {
  return (
    <div className={clsx('rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return (
    <div className={clsx('flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={clsx('font-semibold text-gray-900 dark:text-gray-100', className)}>
      {children}
    </h3>
  )
}

export function CardContent({ children, className }) {
  return <div className={clsx('p-5', className)}>{children}</div>
}
