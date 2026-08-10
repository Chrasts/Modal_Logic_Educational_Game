import { useEffect, useId, useState, type FocusEvent, type KeyboardEvent } from 'react'

export function WorldIdInput({ value, disabled = false, ariaLabel, onCommit }: {
  readonly value: string
  readonly disabled?: boolean
  readonly ariaLabel: string
  readonly onCommit: (value: string) => string | null
}) {
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()
  useEffect(() => { setDraft(value); setError(null) }, [value])

  const commit = () => {
    const next = draft.trim()
    const nextError = onCommit(next)
    if (nextError) {
      setDraft(value)
      setError(nextError)
      return false
    }
    setDraft(next)
    setError(null)
    return true
  }
  const onBlur = (_event: FocusEvent<HTMLInputElement>) => { commit() }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (commit()) event.currentTarget.blur()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setDraft(value)
      setError(null)
    }
  }

  return <span className="world-id-input">
    <input
      aria-label={ariaLabel}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      disabled={disabled}
      value={draft}
      onChange={(event) => { setDraft(event.target.value); setError(null) }}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
    {error && <small className="field-error" id={errorId} role="alert">{error}</small>}
  </span>
}
