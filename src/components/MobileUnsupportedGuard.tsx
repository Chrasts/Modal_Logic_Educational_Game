import { useEffect, useState, type ReactNode } from 'react'

export const phoneClassMediaQuery = '(max-width: 760px) and (pointer: coarse)'

export function MobileUnsupportedGuard({ children }: { readonly children: ReactNode }) {
  const [unsupported, setUnsupported] = useState(() => window.matchMedia?.(phoneClassMediaQuery).matches ?? false)
  useEffect(() => {
    const query = window.matchMedia?.(phoneClassMediaQuery)
    if (!query) return
    const update = () => setUnsupported(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])
  if (!unsupported) return children
  return <main className="mobile-unsupported" aria-labelledby="desktop-required-title">
    <div><span className="brand-mark" aria-hidden="true">◇</span><p className="eyebrow">Logic Model Builder</p><h1 id="desktop-required-title">Desktop required</h1><p>This application is currently designed for desktop and laptop computers. Mobile devices are not supported yet.</p><small>Please open it on a larger screen.</small></div>
  </main>
}
