import { useState, useRef, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'
import clsx from 'clsx'

export default function ActionMenu({ items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-40 rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 py-1 overflow-hidden">
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className="my-1 border-t border-gray-100 dark:border-gray-700" />
            ) : (
              <button
                key={i}
                onClick={() => { setOpen(false); item.onClick() }}
                className={clsx(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors',
                  item.danger
                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                {item.icon && <item.icon className="h-4 w-4 flex-shrink-0" />}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
