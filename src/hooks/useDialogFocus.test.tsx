// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useDialogFocus } from './useDialogFocus'

afterEach(cleanup)

function Harness({ kind }: { readonly kind: 'settings' | 'completion' }) {
  const [open, setOpen] = useState(false)
  useDialogFocus(open, () => setOpen(false))
  return <><button onClick={() => setOpen(true)}>Open {kind}</button>{open && <section role="dialog" aria-label={kind}><button onClick={() => setOpen(false)}>First</button><button>Last</button></section>}</>
}

describe('useDialogFocus', () => {
  it.each(['settings', 'completion'] as const)('traps and returns focus for a %s dialog', async (kind) => {
    const user = userEvent.setup()
    render(<Harness kind={kind} />)
    const trigger = screen.getByRole('button', { name: `Open ${kind}` })
    await user.click(trigger)
    const first = screen.getByRole('button', { name: 'First' })
    const last = screen.getByRole('button', { name: 'Last' })
    expect(first).toHaveFocus()
    await user.tab({ shift: true })
    expect(last).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })
})
