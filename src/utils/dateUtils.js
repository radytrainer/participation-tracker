import { format, parseISO, isValid } from 'date-fns'

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = parseISO(String(dateStr))
    return isValid(d) ? format(d, 'MMM d, yyyy') : String(dateStr)
  } catch {
    return String(dateStr)
  }
}
