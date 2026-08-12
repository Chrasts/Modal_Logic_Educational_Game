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

export const analyticsDisabledKey = 'umami.disabled'

export function isAnalyticsEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(analyticsDisabledKey) !== '1'
  } catch {
    return true
  }
}

export function setAnalyticsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (enabled) window.localStorage.removeItem(analyticsDisabledKey)
    else window.localStorage.setItem(analyticsDisabledKey, '1')
  } catch {
    // Analytics preferences must never interfere with the application.
  }
}

export function trackEvent(eventName: string, data?: AnalyticsEventData): void {
  if (typeof window === 'undefined' || !isAnalyticsEnabled()) return
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
