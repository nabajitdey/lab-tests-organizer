export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low' | 'not_open' | 'closed'

export interface LabTiming {
  status: 'open' | 'not_open' | 'closed'
  urgency: UrgencyLevel
  minutesRemaining: number  // minutes until close (if open) or until open (if not_open)
  label: string
}

/** Parse "HH:MM" into total minutes from midnight */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Format total minutes from midnight as "h:mm AM/PM" */
export function minutesToDisplay(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60) % 24
  const m   = totalMinutes % 60
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const h12  = h24 % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

/** Returns a human-readable "X hr Y min" string */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return 'now'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} hr`
  return `${h} hr ${m} min`
}

/** Compute urgency/timing info for a lab given current time */
export function getLabTiming(openingTime: string, closingTime: string, now?: Date): LabTiming {
  const current = now ?? new Date()
  const currentMinutes = current.getHours() * 60 + current.getMinutes()
  const openMinutes  = timeToMinutes(openingTime)
  const closeMinutes = timeToMinutes(closingTime)

  if (currentMinutes < openMinutes) {
    const minsUntilOpen = openMinutes - currentMinutes
    return {
      status: 'not_open',
      urgency: 'not_open',
      minutesRemaining: minsUntilOpen,
      label: `Opens in ${formatDuration(minsUntilOpen)} (${minutesToDisplay(openMinutes)})`,
    }
  }

  if (currentMinutes >= closeMinutes) {
    return {
      status: 'closed',
      urgency: 'closed',
      minutesRemaining: 0,
      label: `Closed (${minutesToDisplay(openMinutes)} – ${minutesToDisplay(closeMinutes)})`,
    }
  }

  const minsUntilClose = closeMinutes - currentMinutes
  let urgency: UrgencyLevel
  if (minsUntilClose <= 60)       urgency = 'critical'
  else if (minsUntilClose <= 120) urgency = 'high'
  else if (minsUntilClose <= 240) urgency = 'medium'
  else                            urgency = 'low'

  return {
    status: 'open',
    urgency,
    minutesRemaining: minsUntilClose,
    label: `Closes in ${formatDuration(minsUntilClose)} (${minutesToDisplay(closeMinutes)})`,
  }
}

/** Sort order weight for urgency (lower = show first) */
export function urgencyWeight(urgency: UrgencyLevel): number {
  const weights: Record<UrgencyLevel, number> = {
    critical: 0,
    high:     1,
    medium:   2,
    low:      3,
    not_open: 4,
    closed:   5,
  }
  return weights[urgency]
}

export const urgencyStyles: Record<UrgencyLevel, { bg: string; border: string; text: string; badge: string }> = {
  critical: {
    bg:     'bg-red-50',
    border: 'border-red-300',
    text:   'text-red-700',
    badge:  'bg-red-100 text-red-800 border border-red-200',
  },
  high: {
    bg:     'bg-orange-50',
    border: 'border-orange-300',
    text:   'text-orange-700',
    badge:  'bg-orange-100 text-orange-800 border border-orange-200',
  },
  medium: {
    bg:     'bg-yellow-50',
    border: 'border-yellow-300',
    text:   'text-yellow-700',
    badge:  'bg-yellow-100 text-yellow-800 border border-yellow-200',
  },
  low: {
    bg:     'bg-green-50',
    border: 'border-green-300',
    text:   'text-green-700',
    badge:  'bg-green-100 text-green-800 border border-green-200',
  },
  not_open: {
    bg:     'bg-blue-50',
    border: 'border-blue-200',
    text:   'text-blue-700',
    badge:  'bg-blue-100 text-blue-800 border border-blue-200',
  },
  closed: {
    bg:     'bg-gray-50',
    border: 'border-gray-200',
    text:   'text-gray-500',
    badge:  'bg-gray-100 text-gray-600 border border-gray-200',
  },
}

export const statusStyles: Record<string, string> = {
  PENDING:          'bg-amber-100 text-amber-800 border border-amber-200',
  SAMPLE_COLLECTED: 'bg-blue-100 text-blue-800 border border-blue-200',
  DONE:             'bg-green-100 text-green-800 border border-green-200',
}

export const statusLabels: Record<string, string> = {
  PENDING:          'Pending',
  SAMPLE_COLLECTED: 'Sample Sent',
  DONE:             'Done',
}
