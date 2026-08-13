import { useEffect } from 'react'

export type AnalyticsEventData = Readonly<Record<string, string | number | boolean>>

interface UmamiTracker {
  track: (eventName: string, data?: Record<string, string | number | boolean>) => void
}

declare global {
  interface Window {
    umami?: UmamiTracker
  }
}

export function trackEvent(eventName: string, data?: AnalyticsEventData): void {
  if (typeof window === 'undefined') return
  try {
    window.umami?.track(eventName, data ? { ...data } : undefined)
  } catch {
    // Analytics is deliberately best-effort and must never break gameplay.
  }
}

export function useAnalyticsView(section: string): void {
  useEffect(() => {
    trackEvent('section_view', { section })
  }, [section])
}
