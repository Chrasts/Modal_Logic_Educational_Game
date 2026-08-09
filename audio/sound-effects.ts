export type SoundEffectKind = 'create' | 'success' | 'failure'

type AudioContextConstructor = new () => AudioContext

export function playSound(kind: SoundEffectKind, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return
  const AudioContextClass = (window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext) as AudioContextConstructor | undefined
  if (!AudioContextClass) return
  try {
    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime
    const frequencies = kind === 'success' ? [480, 660] : kind === 'failure' ? [210, 165] : [330, 360]
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequencies[0], now)
    oscillator.frequency.exponentialRampToValueAtTime(frequencies[1], now + 0.08)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(kind === 'create' ? 0.025 : 0.035, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'create' ? 0.07 : 0.13))
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + (kind === 'create' ? 0.075 : 0.14))
    oscillator.addEventListener('ended', () => void context.close(), { once: true })
  } catch {
    // Audio is optional; blocked or unavailable playback must never affect play.
  }
}
