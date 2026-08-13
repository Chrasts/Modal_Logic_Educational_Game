export type AnalyticsValue = string | number | boolean
export type AnalyticsData = Readonly<Record<string, AnalyticsValue>>

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: AnalyticsData) => void
    }
  }
}

/**
 * Send a privacy-safe custom event when the Umami tracker is available.
 * Local development and tests deliberately degrade to a no-op.
 */
export function trackEvent(event: string, data?: AnalyticsData): void {
  if (typeof window === 'undefined') return
  window.umami?.track(event, data)
}
