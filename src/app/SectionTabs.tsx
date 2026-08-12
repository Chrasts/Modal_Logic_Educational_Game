import type { KeyboardEvent } from 'react'

export function SectionTabs<Value extends string>({ label, sections, value, onChange }: {
  readonly label: string
  readonly sections: readonly (readonly [Value, string])[]
  readonly value: Value
  readonly onChange: (value: Value) => void
}) {
  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? sections.length - 1
        : event.key === 'ArrowRight'
          ? (index + 1) % sections.length
          : (index - 1 + sections.length) % sections.length
    const tablist = event.currentTarget.parentElement
    onChange(sections[nextIndex][0])
    tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus()
  }
  return <div className="guide-tabs" role="tablist" aria-label={label}>{sections.map(([sectionValue, sectionLabel], index) => <button
    type="button"
    role="tab"
    aria-selected={value === sectionValue}
    tabIndex={value === sectionValue ? 0 : -1}
    className={value === sectionValue ? 'active' : ''}
    onClick={() => onChange(sectionValue)}
    onKeyDown={(event) => moveFocus(event, index)}
    key={sectionValue}
  >{sectionLabel}</button>)}</div>
}
