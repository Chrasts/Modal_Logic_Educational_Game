// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { learnLessons } from './learn'
import { createShareUrl } from './share-url'

describe('sandbox user interface', () => {
  it('opens on a home menu and persists functional interface settings', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Logic Model Builder' })).toBeVisible()
    const learnButton = screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' })
    expect(learnButton).toBeVisible()
    expect(learnButton).toHaveTextContent(/^LEARN$/)
    expect((learnButton.textContent ?? '').trim().split(/\s+/u)).toHaveLength(1)
    expect(learnButton).not.toContainElement(screen.getByText(/0\/\d+ complete/))
    expect(screen.getByRole('button', { name: /Campaigns: longer challenges/ })).toHaveTextContent(/^CAMPAIGNS$/)
    expect(screen.getByRole('button', { name: /Sandbox: build and test/ })).toHaveTextContent(/^SANDBOX$/)
    expect(screen.queryByLabelText('Kripke model editor')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open settings from home' }))
    await user.click(screen.getByRole('checkbox', { name: 'Show minimap' }))
    expect(JSON.parse(localStorage.getItem('logic-game:interface-settings:v1') ?? '{}')).toMatchObject({ showMinimap: false })
    await user.click(screen.getByRole('button', { name: 'Home' }))
    await user.click(screen.getByRole('button', { name: 'Sandbox' }))
    expect(screen.getByLabelText('Kripke model editor')).toBeVisible()
    expect(screen.queryByLabelText('Model overview and viewport control')).not.toBeInTheDocument()
  })

  it('provides a keyboard skip link and a focusable main landmark', () => {
    render(<App initialView="workspace" />)
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1')
  })

  it('uses hierarchical back navigation between menu levels', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Campaigns' }))
    expect(screen.getByRole('heading', { name: 'Campaigns' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Go back' }))
    expect(screen.getByRole('heading', { name: 'Logic Model Builder' })).toBeVisible()
  })

  it('links to the game repository', async () => {
    render(<App initialView="workspace" />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'More' }))
    expect(screen.getByRole('menuitem', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/Chrasts/Modal_Logic_Educational_Game')
  })

  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState(null, '', '/')
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('adds a world and can undo the change', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    expect(screen.getAllByLabelText('World')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: '+ Add world' }))
    expect(screen.getAllByLabelText('World')).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getAllByLabelText('World')).toHaveLength(2)
  })

  it('locks construction controls in Evaluate mode', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.click(screen.getByRole('button', { name: 'φ Formula · Evaluate' }))
    expect(screen.getByRole('button', { name: '+ Add world' })).toBeDisabled()
    for (const input of screen.getAllByLabelText('World')) expect(input).toBeDisabled()
  })

  it('enables global frame properties and reports derived edges', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.click(screen.getByRole('button', { name: /^Frame rules/ }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Reflexive rule mode' }), 'enforce')
    expect(screen.getByRole('combobox', { name: 'Reflexive rule mode' })).toHaveValue('enforce')
    expect(screen.getByText(/2 edges derived from frame properties/)).toBeVisible()
  })

  it('shows a parser error for an empty formula', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.clear(screen.getByLabelText('Modal formula'))
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    expect(screen.getByText(/Expected a formula, but the input ended/)).toBeVisible()
    expect(screen.getByLabelText('Modal formula')).toHaveFocus()
  })

  it('focuses a verification result and communicates its status with text', async () => {
    localStorage.setItem('logic-game:sandbox-orientation:v1', 'seen')
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    const result = screen.getByText('Objective met').closest('.result')
    expect(result).toHaveFocus()
    expect(result).toHaveAttribute('role', 'status')
    expect(result).toHaveTextContent(/Objective met|Pass/)
  })

  it('gives every rendered icon-only button an accessible name', async () => {
    localStorage.setItem('logic-game:sandbox-orientation:v1', 'seen')
    const user = userEvent.setup()
    const { container } = render(<App initialView="workspace" />)
    const assertNames = () => {
      for (const button of container.querySelectorAll('button')) if (!(button.textContent ?? '').trim()) {
        expect(button.getAttribute('aria-label') || button.getAttribute('title')).toBeTruthy()
      }
    }
    assertNames()
    await user.click(screen.getByRole('button', { name: /^Frame rules/ }))
    assertNames()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Data' }))
    assertNames()
  })

  it('keeps the narrow result route and verification action available', () => {
    localStorage.setItem('logic-game:sandbox-orientation:v1', 'seen')
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 })
    render(<App initialView="workspace" />)
    expect(screen.getByRole('tab', { name: 'result' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Verify objective' })).toHaveClass('verify-button')
    expect(screen.getByLabelText('Kripke model editor')).toHaveClass('mobile-tab-model')
  })

  it('shows the Sandbox orientation once and remembers its dismissal', async () => {
    const user = userEvent.setup()
    const first = render(<App initialView="workspace" />)
    expect(screen.getByRole('dialog', { name: 'Four steps, one workbench' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Start exploring' }))
    expect(localStorage.getItem('logic-game:sandbox-orientation:v1')).toBe('seen')
    first.unmount()
    render(<App initialView="workspace" />)
    expect(screen.queryByRole('dialog', { name: 'Four steps, one workbench' })).not.toBeInTheDocument()
  })

  it('provides a synchronized keyboard-accessible model table', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.click(screen.getByRole('button', { name: 'Table' }))
    expect(screen.getByRole('table', { name: /Keyboard-accessible model view/ })).toBeVisible()
    const tableAtoms = screen.getByLabelText('Atoms at w0')
    await user.type(tableAtoms, 'q')
    expect(screen.getAllByLabelText('True atoms')[0]).toHaveValue('q')
  })

  it('steps through semantic evaluation and highlights its witness in the graph', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    expect(screen.getByText('Step 1 of 2')).toBeVisible()
    expect(document.querySelector('.trace-witness-node')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText('Step 2 of 2')).toBeVisible()
  })

  it('checks all valuations and returns a frame counterexample', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.selectOptions(screen.getByLabelText('Semantic target'), 'frame')
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    expect(screen.getByText('Not valid on this frame.')).toBeVisible()
    expect(screen.getByText(/Countervaluation at/)).toBeVisible()
    expect(screen.getByText(/Evaluation tree/)).toBeVisible()
  })

  it('loads a modal correspondence preset', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.selectOptions(screen.getByLabelText('Correspondence lab'), 't')
    expect(screen.getByLabelText('Modal formula')).toHaveValue('□p → p')
    expect(screen.getByLabelText('Semantic target')).toHaveValue('correspondence')
  })

  it('verifies equivalence or difference between two formulas', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.type(screen.getByLabelText('Comparison formula'), 'p')
    await user.click(screen.getByLabelText('Make formulas differ'))
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    expect(screen.getByText('Pointed equivalence')).toBeVisible()
    expect(screen.getByText(/are different at w0/i)).toBeVisible()
  })

  it('classifies failures and summarizes practice by concept in the local profile', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.clear(screen.getByLabelText('Modal formula'))
    await user.type(screen.getByLabelText('Modal formula'), 'box (')
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Profile' }))
    expect(screen.getByText('Practice by concept')).toBeVisible()
    expect(screen.getByText('pointed sandbox')).toBeVisible()
    expect(screen.getByText('Syntax or model data')).toBeVisible()
  })

  it('classifies a missing possibility witness as a specific semantic error', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    fireEvent.change(screen.getByLabelText('Modal formula'), { target: { value: 'diamond q' } })
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Profile' }))
    expect(screen.getByText('Missing witness for diamond')).toBeVisible()
  })

  it('estimates frame-validity cost and blocks searches above the valuation limit', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.selectOptions(screen.getByLabelText('Semantic target'), 'frame')
    expect(screen.getByText('4 valuations')).toBeVisible()
    fireEvent.change(screen.getByLabelText('Modal formula'), { target: { value: Array.from({ length: 16 }, (_, index) => `p${index}`).join(' | ') } })
    expect(screen.getByText(/4,294,967,296 valuations/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Verify objective' })).toBeDisabled()
    expect(screen.getByText(/Reduce the number of worlds or distinct atoms/)).toBeVisible()
  })

  it('reports formula, relation, and correspondence verdicts separately', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.selectOptions(screen.getByLabelText('Correspondence lab'), 't')
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    expect(screen.getByText('Formula and relation agree on this frame')).toBeVisible()
    expect(screen.getByText('Frame validity')).toBeVisible()
    expect(screen.getByText('Relational property')).toBeVisible()
    expect(screen.getByText('Instance comparison')).toBeVisible()
  })

  it('selects a remaining evaluation world after deleting the current one', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.click(screen.getByRole('button', { name: 'Delete world w0' }))
    expect(screen.getByLabelText('Evaluation world')).toHaveValue('w1')
  })

  it('closes an open dialog with Escape', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.click(screen.getByRole('button', { name: 'Open Modal Logic Guide' }))
    expect(screen.getByRole('dialog', { name: 'Guide' })).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Guide' })).not.toBeInTheDocument()
  })

  it('keeps the More popover above the workspace and closes it with outside click or Escape', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    const trigger = screen.getByRole('button', { name: 'More' })
    await user.click(trigger)
    expect(screen.getByRole('menu')).toHaveClass('utility-menu-popover')
    expect(screen.queryByRole('menuitem', { name: /fullscreen/i })).not.toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('exposes fullscreen directly in the topbar and updates its accessible state', async () => {
    const fullscreenEnabled = Object.getOwnPropertyDescriptor(document, 'fullscreenEnabled')
    const fullscreenElement = Object.getOwnPropertyDescriptor(document, 'fullscreenElement')
    const requestFullscreen = Object.getOwnPropertyDescriptor(document.documentElement, 'requestFullscreen')
    const exitFullscreen = Object.getOwnPropertyDescriptor(document, 'exitFullscreen')
    let currentFullscreenElement: Element | null = null
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => currentFullscreenElement })
    Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: vi.fn(async () => { currentFullscreenElement = document.documentElement; document.dispatchEvent(new Event('fullscreenchange')) }) })
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: vi.fn(async () => { currentFullscreenElement = null; document.dispatchEvent(new Event('fullscreenchange')) }) })
    try {
      const user = userEvent.setup()
      render(<App initialView="workspace" />)
      await user.click(screen.getByRole('button', { name: 'Enter fullscreen' }))
      expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toHaveAttribute('aria-pressed', 'true')
      await user.click(screen.getByRole('button', { name: 'More' }))
      expect(screen.queryByRole('menuitem', { name: /fullscreen/i })).not.toBeInTheDocument()
    } finally {
      if (fullscreenEnabled) Object.defineProperty(document, 'fullscreenEnabled', fullscreenEnabled); else delete (document as unknown as Record<string, unknown>).fullscreenEnabled
      if (fullscreenElement) Object.defineProperty(document, 'fullscreenElement', fullscreenElement); else delete (document as unknown as Record<string, unknown>).fullscreenElement
      if (requestFullscreen) Object.defineProperty(document.documentElement, 'requestFullscreen', requestFullscreen); else delete (document.documentElement as unknown as Record<string, unknown>).requestFullscreen
      if (exitFullscreen) Object.defineProperty(document, 'exitFullscreen', exitFullscreen); else delete (document as unknown as Record<string, unknown>).exitFullscreen
    }
  })

  it('runs the short How to Play flow without a prediction gate and persists v2 progress', async () => {
    const user = userEvent.setup()
    const view = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' }))
    await user.click(screen.getByRole('button', { name: 'Skip introduction' }))
    expect(screen.getByText('Make w1 the evaluation world.')).toBeVisible()
    expect(screen.queryByText('Predict before verification')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Modal formula')).not.toBeInTheDocument()
    expect(screen.getByText('Verification')).toBeVisible()
    fireEvent.click(screen.getByLabelText(/World w1, atoms p/))
    await user.click(screen.getByRole('button', { name: 'Set as evaluation world' }))
    expect(screen.getByLabelText('Evaluation world')).toHaveValue('w1')
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getAllByText('Task complete').length).toBeGreaterThan(0)
    expect(screen.getByRole('dialog', { name: 'Task complete' })).toBeVisible()
    await user.click(within(screen.getByRole('dialog', { name: 'Task complete' })).getByRole('button', { name: 'Next lesson' }))
    expect(screen.getByText('Add q to w0.')).toBeVisible()
    view.unmount()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' }))
    expect(screen.getByText('Learn the Controls · Lesson 2 of 6')).toBeVisible()
    expect(JSON.parse(localStorage.getItem('logic-game:campaign-progress:v2') ?? '[]')).toContain('tutorial-v2-evaluation-world')
  })

  it('uses one compact lesson header with an action checklist and relevant side panels', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' }))
    await user.click(screen.getByRole('button', { name: 'Skip introduction' }))
    const header = screen.getByRole('region', { name: 'Current lesson' })
    expect(within(header).getByText('Make w1 the evaluation world.')).toBeVisible()
    expect(screen.getAllByText('Make w1 the evaluation world.')).toHaveLength(1)
    expect(within(header).getByRole('list', { name: 'Action checklist' })).toHaveTextContent('Select w1')
    expect(screen.queryByLabelText('Campaign mission context')).not.toBeInTheDocument()
    expect(screen.getByText('Verification')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Toggle world and accessibility panels' })).not.toBeInTheDocument()
    await user.click(within(header).getByText('Details & hints'))
    expect(within(header).getByText('Control help')).toBeVisible()
  })

  it('merges campaign analysis, hints, and reference help into the mission header', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Campaigns' }))
    await user.click(screen.getAllByRole('button', { name: 'Start campaign' })[0])
    const header = screen.getByRole('region', { name: 'Current mission' })
    const objective = within(header).getByText(/Make .*false|Make .*true/u)
    expect(screen.getAllByText(objective.textContent ?? '')).toHaveLength(1)
    await user.click(within(header).getByText('Details & hints'))
    expect(within(header).getByText('Analyse the target')).toBeVisible()
    expect(within(header).getByText('Strategic hints')).toBeVisible()
    expect(within(header).getByText('Reference solution')).toBeVisible()
    expect(document.querySelector('.campaign-lesson-bar')).not.toBeInTheDocument()
  })

  it('requires an explicit correct witness choice in Finding a witness', async () => {
    const completedTutorial = ['tutorial-v2-evaluation-world', 'tutorial-v2-valuation', 'tutorial-v2-draw-edge', 'tutorial-v2-correct-edge', 'tutorial-v2-add-world', 'tutorial-v2-build-model']
    const completedLessons = ['learn-truth-atomic', 'learn-truth-selected-world', 'learn-truth-negation', 'learn-truth-conjunction', 'learn-truth-same-model', 'learn-worlds-add', 'learn-worlds-directed-edge', 'learn-worlds-direction', 'learn-worlds-branching', 'learn-worlds-reflexive-edge', 'learn-possibility-alternative']
    localStorage.setItem('logic-game:campaign-progress:v2', JSON.stringify(completedTutorial))
    localStorage.setItem('logic-game:campaign-content-revision:v1', '2')
    localStorage.setItem('logic-game:learn-progress:v1', JSON.stringify({ version: 1, contentRevision: 2, welcomeViewed: true, completedLessonIds: completedLessons, completedChapterIds: ['truth-at-a-world', 'worlds-accessibility'], highestStageByLesson: {}, attemptsByLesson: {}, successfulAttemptsByLesson: {}, predictionAnswers: {}, predictionCorrectness: {}, hintsUsed: {}, transferCompletedLessonIds: [], completedAt: {} }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' }))
    expect(screen.getByRole('dialog', { name: 'Finding a witness' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Start task' }))
    await user.selectOptions(screen.getByLabelText('Witness world answer'), 'w1')
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getByText('Required answer incorrect')).toBeVisible()
    await user.selectOptions(screen.getByLabelText('Witness world answer'), 'w3')
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getByRole('dialog', { name: 'Task complete' })).toBeVisible()
  })

  it('shows all ten available chapters and derives the complete 62-task path total', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Learn' }))
    expect(screen.getByText('0/62')).toBeVisible()
    expect(screen.queryByText('Coming later')).not.toBeInTheDocument()
    for (const title of ['Necessity', 'Box and Diamond', 'Nested Modalities', 'Local, Global, and Frame Truth', 'Models and Countermodels', 'Frame Properties', 'Modal Axioms and Correspondence']) {
      expect(screen.getByRole('heading', { name: title })).toBeVisible()
    }
  })

  it('continues from the completed Possibility chapter into Necessity', async () => {
    const tutorial = ['tutorial-v2-evaluation-world', 'tutorial-v2-valuation', 'tutorial-v2-draw-edge', 'tutorial-v2-correct-edge', 'tutorial-v2-add-world', 'tutorial-v2-build-model']
    const completed = learnLessons.slice(0, 15).map(({ id }) => id)
    localStorage.setItem('logic-game:campaign-progress:v2', JSON.stringify(tutorial))
    localStorage.setItem('logic-game:campaign-content-revision:v1', '2')
    localStorage.setItem('logic-game:learn-progress:v1', JSON.stringify({ version: 1, contentRevision: 2, welcomeViewed: true, completedLessonIds: completed, completedChapterIds: ['truth-at-a-world', 'worlds-accessibility', 'possibility'], highestStageByLesson: {}, attemptsByLesson: {}, successfulAttemptsByLesson: {}, predictionAnswers: {}, predictionCorrectness: {}, hintsUsed: {}, transferCompletedLessonIds: [], completedAt: {} }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' }))
    expect(screen.getByRole('dialog', { name: 'One successor' })).toBeVisible()
  })

  it('offers the next chapter CTA after the last Necessity lesson', async () => {
    const targetIndex = learnLessons.findIndex(({ id }) => id === 'learn-necessity-repair')
    const completed = learnLessons.slice(0, targetIndex).map(({ id }) => id)
    const tutorial = ['tutorial-v2-evaluation-world', 'tutorial-v2-valuation', 'tutorial-v2-draw-edge', 'tutorial-v2-correct-edge', 'tutorial-v2-add-world', 'tutorial-v2-build-model']
    localStorage.setItem('logic-game:campaign-progress:v2', JSON.stringify(tutorial))
    localStorage.setItem('logic-game:campaign-content-revision:v1', '2')
    localStorage.setItem('logic-game:learn-progress:v1', JSON.stringify({ version: 1, contentRevision: 2, welcomeViewed: true, completedLessonIds: completed, completedChapterIds: ['truth-at-a-world', 'worlds-accessibility', 'possibility'], highestStageByLesson: {}, attemptsByLesson: {}, successfulAttemptsByLesson: {}, predictionAnswers: {}, predictionCorrectness: {}, hintsUsed: {}, transferCompletedLessonIds: [], completedAt: {} }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' }))
    await user.click(screen.getByRole('button', { name: 'Start task' }))
    fireEvent.change(screen.getAllByLabelText('True atoms')[1], { target: { value: 'p' } })
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(within(screen.getByRole('dialog', { name: 'Task complete' })).getByRole('button', { name: 'Continue to Box and Diamond' })).toBeVisible()
  })

  it('shows Formula A and Formula B chips in Box and Diamond and Nested Modalities', async () => {
    const tutorial = ['tutorial-v2-evaluation-world', 'tutorial-v2-valuation', 'tutorial-v2-draw-edge', 'tutorial-v2-correct-edge', 'tutorial-v2-add-world', 'tutorial-v2-build-model']
    const seed = (lessonId: string) => {
      const targetIndex = learnLessons.findIndex(({ id }) => id === lessonId)
      localStorage.setItem('logic-game:campaign-progress:v2', JSON.stringify(tutorial))
      localStorage.setItem('logic-game:campaign-content-revision:v1', '2')
      localStorage.setItem('logic-game:learn-progress:v1', JSON.stringify({ version: 1, contentRevision: 2, welcomeViewed: true, completedLessonIds: learnLessons.slice(0, targetIndex).map(({ id }) => id), completedChapterIds: [], highestStageByLesson: {}, attemptsByLesson: {}, successfulAttemptsByLesson: {}, predictionAnswers: {}, predictionCorrectness: {}, hintsUsed: {}, transferCompletedLessonIds: [], completedAt: {} }))
    }
    const user = userEvent.setup()
    seed('learn-box-diamond-possible-not-necessary')
    const first = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' }))
    await user.click(screen.getByRole('button', { name: 'Start task' }))
    expect(within(screen.getByLabelText('Formula comparison')).getByText('◇p')).toBeVisible()
    expect(within(screen.getByLabelText('Formula comparison')).getByText('□p')).toBeVisible()
    first.unmount()
    localStorage.clear()
    seed('learn-nested-order')
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' }))
    await user.click(screen.getByRole('button', { name: 'Start task' }))
    expect(within(screen.getByLabelText('Formula comparison')).getByText('□◇p')).toBeVisible()
    expect(within(screen.getByLabelText('Formula comparison')).getByText('◇□p')).toBeVisible()
  })

  it('renders statement choices, blocks a wrong scope profile, and reports all three scopes after checking', async () => {
    const targetIndex = learnLessons.findIndex(({ id }) => id === 'learn-scopes-comparison')
    const completed = learnLessons.slice(0, targetIndex).map(({ id }) => id)
    const tutorial = ['tutorial-v2-evaluation-world', 'tutorial-v2-valuation', 'tutorial-v2-draw-edge', 'tutorial-v2-correct-edge', 'tutorial-v2-add-world', 'tutorial-v2-build-model']
    localStorage.setItem('logic-game:campaign-progress:v2', JSON.stringify(tutorial))
    localStorage.setItem('logic-game:campaign-content-revision:v1', '2')
    localStorage.setItem('logic-game:learn-progress:v1', JSON.stringify({ version: 1, contentRevision: 2, welcomeViewed: true, completedLessonIds: completed, completedChapterIds: [], highestStageByLesson: {}, attemptsByLesson: {}, successfulAttemptsByLesson: {}, predictionAnswers: {}, predictionCorrectness: {}, hintsUsed: {}, transferCompletedLessonIds: [], completedAt: {} }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' }))
    await user.click(screen.getByRole('button', { name: 'Start task' }))
    const wrong = screen.getByRole('radio', { name: 'Pointed: true · Model-global: true · Frame-valid: true' })
    await user.click(wrong)
    expect(wrong).toHaveAttribute('aria-checked', 'true')
    expect(JSON.parse(localStorage.getItem('logic-game:learn-progress:v1') ?? '{}').predictionAnswers).toMatchObject({ 'learn-scopes-comparison': 'all-true' })
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getByText('Required answer incorrect')).toBeVisible()
    expect(screen.getByText('That interpretation is not correct for this model.')).toBeVisible()
    const comparison = screen.getByLabelText('Scope comparison results')
    expect(within(comparison).getByText('Pointed truth')).toBeVisible()
    expect(within(comparison).getByText('Model-global truth')).toBeVisible()
    expect(within(comparison).getByText('Frame validity')).toBeVisible()
    expect(within(comparison).getAllByText(/PASS|FAIL/)).toHaveLength(3)
    expect(comparison).toHaveTextContent('every valuation')
    await user.click(screen.getByRole('radio', { name: 'Pointed: true · Model-global: false · Frame-valid: false' }))
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getByRole('dialog', { name: 'Task complete' })).toBeVisible()
  })

  it('states the all-valuations quantification in the frame-validity lesson', async () => {
    const targetIndex = learnLessons.findIndex(({ id }) => id === 'learn-scopes-frame')
    const completed = learnLessons.slice(0, targetIndex).map(({ id }) => id)
    const tutorial = ['tutorial-v2-evaluation-world', 'tutorial-v2-valuation', 'tutorial-v2-draw-edge', 'tutorial-v2-correct-edge', 'tutorial-v2-add-world', 'tutorial-v2-build-model']
    localStorage.setItem('logic-game:campaign-progress:v2', JSON.stringify(tutorial))
    localStorage.setItem('logic-game:campaign-content-revision:v1', '2')
    localStorage.setItem('logic-game:learn-progress:v1', JSON.stringify({ version: 1, contentRevision: 2, welcomeViewed: true, completedLessonIds: completed, completedChapterIds: [], highestStageByLesson: {}, attemptsByLesson: {}, successfulAttemptsByLesson: {}, predictionAnswers: {}, predictionCorrectness: {}, hintsUsed: {}, transferCompletedLessonIds: [], completedAt: {} }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' }))
    await user.click(screen.getByRole('button', { name: 'Start task' }))
    expect(screen.getByText(/Frame validity checks every world under every valuation\./)).toBeVisible()
  })

  it('shows one Learn CTA and keeps Campaigns focused on challenges and practice', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getAllByRole('button', { name: 'Start or continue Learn Modal Logic' })).toHaveLength(1)
    expect(screen.queryByText('Internal lesson engine')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Campaigns' }))
    expect(screen.getByRole('tab', { name: 'General Challenges' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Countermodel Hunter')).toBeVisible()
    await user.click(screen.getByRole('tab', { name: 'Practice Library' }))
    expect(screen.getByText('Local Models & Countermodels')).toBeVisible()
  })

  it('keeps arbitrary atoms in the second controls lesson and requires q', async () => {
    localStorage.setItem('logic-game:learn-progress:v1', JSON.stringify({ version: 1, welcomeViewed: true, completedLessonIds: [], completedChapterIds: [], highestStageByLesson: {}, attemptsByLesson: {}, successfulAttemptsByLesson: {}, predictionAnswers: {}, predictionCorrectness: {}, hintsUsed: {}, transferCompletedLessonIds: [], completedAt: {} }))
    localStorage.setItem('logic-game:campaign-progress:v2', JSON.stringify(['tutorial-v2-evaluation-world']))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' }))
    const atoms = screen.getByLabelText('True atoms')
    await user.type(atoms, 'p')
    expect(atoms).toHaveValue('p')
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getAllByText(/Construction constraint not met/).length).toBeGreaterThan(0)
    await user.clear(atoms)
    await user.type(atoms, 'p q')
    expect(atoms).toHaveValue('p q')
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getByRole('dialog', { name: 'Task complete' })).toBeVisible()
  })

  it('migrates only the controls completion whose task meaning changed', () => {
    localStorage.setItem('logic-game:campaign-progress:v2', JSON.stringify(['tutorial-v2-evaluation-world', 'tutorial-v2-valuation']))
    render(<App />)
    expect(JSON.parse(localStorage.getItem('logic-game:campaign-progress:v2') ?? '[]')).toEqual(['tutorial-v2-evaluation-world'])
    expect(localStorage.getItem('logic-game:campaign-content-revision:v1')).toBe('2')
  })

  it('offers a state-specific section restart without erasing attempt history', async () => {
    const completedTutorial = ['tutorial-v2-evaluation-world', 'tutorial-v2-valuation', 'tutorial-v2-draw-edge', 'tutorial-v2-correct-edge', 'tutorial-v2-add-world', 'tutorial-v2-build-model']
    localStorage.setItem('logic-game:campaign-progress:v2', JSON.stringify(completedTutorial))
    localStorage.setItem('logic-game:campaign-content-revision:v1', '2')
    localStorage.setItem('logic-game:learn-progress:v1', JSON.stringify({ version: 1, contentRevision: 2, welcomeViewed: true, completedLessonIds: ['learn-truth-atomic'], completedChapterIds: [], highestStageByLesson: {}, attemptsByLesson: { 'learn-truth-atomic': 3 }, successfulAttemptsByLesson: { 'learn-truth-atomic': 1 }, predictionAnswers: {}, predictionCorrectness: {}, hintsUsed: {}, transferCompletedLessonIds: [], completedAt: {} }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Learn' }))
    const section = screen.getByRole('heading', { name: 'Truth at a World' }).closest('article')!
    expect(within(section).getByRole('button', { name: 'Continue' })).toBeVisible()
    await user.click(within(section).getByRole('button', { name: 'Restart section' }))
    expect(screen.getByRole('dialog', { name: 'Atomic truth' })).toBeVisible()
    const stored = JSON.parse(localStorage.getItem('logic-game:learn-progress:v1') ?? '{}')
    expect(stored.completedLessonIds).not.toContain('learn-truth-atomic')
    expect(stored.attemptsByLesson).toMatchObject({ 'learn-truth-atomic': 3 })
  })

  it('restores the sandbox after leaving campaign mode', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.clear(screen.getByLabelText('Modal formula'))
    await user.type(screen.getByLabelText('Modal formula'), 'box q')
    await user.click(screen.getByRole('button', { name: 'Home' }))
    await user.click(screen.getByRole('button', { name: 'Campaigns' }))
    await user.click(screen.getByRole('tab', { name: 'Practice Library' }))
    await user.click(screen.getAllByRole('button', { name: 'Open collection' })[0])
    await user.click(screen.getByRole('button', { name: 'Start practice' }))
    await user.click(screen.getByRole('button', { name: 'Home' }))
    await user.click(screen.getByRole('button', { name: 'Sandbox' }))

    expect(screen.getByLabelText('Modal formula')).toHaveValue('box q')
  })

  it('switches between campaign tracks and loads their objectives', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.click(screen.getByRole('button', { name: 'Home' }))
    await user.click(screen.getByRole('button', { name: 'Campaigns' }))
    await user.click(screen.getByRole('tab', { name: 'Practice Library' }))
    await user.click(screen.getAllByRole('button', { name: 'Open collection' })[0])
    expect(screen.getByText('Necessary, not actual')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Global Model Building/ }))
    expect(screen.getByText('Persistence of truth')).toBeVisible()
  })

  it('preserves the active campaign while browsing another track and the guide', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.click(screen.getByRole('button', { name: 'Home' }))
    await user.click(screen.getByRole('button', { name: 'Campaigns' }))
    await user.click(screen.getByRole('tab', { name: 'Practice Library' }))
    await user.click(screen.getAllByRole('button', { name: 'Open collection' })[0])
    await user.click(screen.getByRole('button', { name: 'Start practice' }))
    await user.click(screen.getByRole('button', { name: 'Home' }))
    await user.click(screen.getByRole('button', { name: 'Campaigns' }))
    await user.click(screen.getByRole('tab', { name: 'Practice Library' }))
    await user.click(screen.getAllByRole('button', { name: 'Open collection' })[0])
    await user.click(screen.getByRole('button', { name: /Global Model Building/ }))
    await user.click(screen.getByRole('button', { name: 'Modal Logic Guide' }))
    await user.click(screen.getByRole('button', { name: 'Return to current mission' }))

    expect(screen.getByText('Necessary, not actual')).toBeVisible()
    expect(screen.getByRole('region', { name: 'Current mission' })).toHaveTextContent('Local Models & Countermodels')
    expect(screen.queryByLabelText('Modal formula')).not.toBeInTheDocument()
  })

  it('falls back to a safe initial model when persisted data is malformed', () => {
    localStorage.setItem('logic-game:sandbox:v1', JSON.stringify({
      formulaSource: 'p', worlds: [{ id: 42 }], edges: [], evaluationWorld: 'w0', targetTruth: true,
    }))
    render(<App initialView="workspace" />)

    expect(screen.getAllByLabelText('World')).toHaveLength(2)
    expect(screen.getByLabelText('Modal formula')).toHaveValue('◇p')
  })

  it('exports and imports a validated model as JSON', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Data' }))
    const editor = screen.getByLabelText('Model JSON') as HTMLTextAreaElement
    const exported = JSON.parse(editor.value)
    expect(exported).toMatchObject({ format: 'logic-model-builder', version: 1, formula: '◇p' })
    exported.formula = 'box q'
    exported.worlds = [{ id: 'root', atoms: 'q', position: { x: 12, y: 34 } }]
    exported.edges = [{ from: 'root', to: 'root' }]
    exported.evaluationWorld = 'root'
    fireEvent.change(editor, { target: { value: JSON.stringify(exported) } })
    await user.click(screen.getByRole('button', { name: 'Import JSON' }))

    expect(screen.getByLabelText('Modal formula')).toHaveValue('box q')
    expect(screen.getByLabelText('World')).toHaveValue('root')
    expect(screen.getByLabelText('Evaluation world')).toHaveValue('root')
  })

  it('resets learning progress independently of the sandbox', async () => {
    localStorage.setItem('logic-game:campaign-progress:v1', JSON.stringify(['tutorial-evaluation']))
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Data' }))
    await user.click(screen.getByRole('button', { name: 'Reset learning progress' }))
    expect(screen.getByRole('status')).toHaveTextContent('progress was reset')
    await user.click(screen.getByRole('button', { name: 'Close data manager' }))
    await user.click(screen.getByRole('button', { name: 'Home' }))
    await user.click(screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' }))
    await user.click(screen.getByRole('button', { name: 'Skip introduction' }))
    expect(screen.getByText('Learn the Controls · Lesson 1 of 6')).toBeVisible()
  })

  it('shows truth by world and a structured countervaluation', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.selectOptions(screen.getByLabelText('Semantic target'), 'frame')
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    expect(screen.getByText('Countervaluation')).toBeVisible()
    expect(screen.getByText('Truth under countervaluation')).toBeVisible()
    expect(screen.getByText('Key diagnostics')).toBeVisible()
    expect(screen.getAllByText(/w0:/).length).toBeGreaterThan(0)
  })

  it('records verification history in the local guest profile across reloads', async () => {
    const user = userEvent.setup()
    const view = render(<App initialView="workspace" />)

    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Profile' }))
    expect(screen.getByText('Sandbox verification')).toBeVisible()
    expect(screen.getByText('1 successful verifications')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Download results CSV' })).toBeEnabled()
    expect(screen.getByText(/never leaves this browser unless you share it/i)).toBeVisible()
    view.unmount()

    render(<App initialView="workspace" />)
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Profile' }))
    expect(screen.getByText('Sandbox verification')).toBeVisible()
    expect(screen.getByText('1 successful verifications')).toBeVisible()
  })

  it('clears guest history without deleting learning progress', async () => {
    localStorage.setItem('logic-game:campaign-progress:v1', JSON.stringify(['tutorial-evaluation']))
    localStorage.setItem('logic-game:guest-profile:v1', JSON.stringify({
      id: 'guest-test', createdAt: '2026-01-01T00:00:00.000Z', history: [{
        id: 'attempt-1', timestamp: '2026-01-02T00:00:00.000Z', mode: 'tutorial',
        levelId: 'tutorial-evaluation', title: 'Evaluation world', scope: 'pointed',
        success: true, worldCount: 2, edgeCount: 0,
      }],
    }))
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Profile' }))
    await user.click(screen.getByRole('button', { name: 'Clear history' }))
    expect(screen.getByText('No attempts recorded yet')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Home' }))
    await user.click(screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' }))
    await user.click(screen.getByRole('button', { name: 'Skip introduction' }))
    expect(screen.getByText('Learn the Controls · Lesson 1 of 6')).toBeVisible()
  })

  it('imports a guest profile backup with history and progress', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Data' }))
    const backup = {
      format: 'logic-model-builder-profile', version: 1,
      guest: { id: 'restored-guest', createdAt: '2026-01-01T00:00:00.000Z', history: [{
        id: 'restored-attempt', timestamp: '2026-01-02T00:00:00.000Z', mode: 'campaign',
        levelId: 'local-necessary-not-actual', title: 'Necessary, not actual', scope: 'pointed',
        success: true, worldCount: 2, edgeCount: 2,
      }] },
      completedLevelIds: ['local-necessary-not-actual'],
    }
    fireEvent.change(screen.getByLabelText('Model JSON'), { target: { value: JSON.stringify(backup) } })
    await user.click(screen.getByRole('button', { name: 'Import JSON' }))
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Profile' }))
    expect(screen.getByText('Necessary, not actual')).toBeVisible()
    expect(screen.getByText('1 task in saved progress')).toBeVisible()
  })

  it('imports and starts a versioned custom mission', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Data' }))
    const customMission = {
      format: 'logic-model-builder-level', version: 1,
      level: {
        id: 'custom-test', chapter: 'Custom mission', title: 'Shared possibility', concept: 'Imported objective',
        instruction: 'Make ◇p true at w0.', formula: '◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 90, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
        edges: [], constraints: { requiredEdges: [{ from: 'w0', to: 'w1' }], forbiddenAtoms: { w0: ['p'] } }, editable: ['edges'],
      },
    }
    fireEvent.change(screen.getByLabelText('Model JSON'), { target: { value: JSON.stringify(customMission) } })
    await user.click(screen.getByRole('button', { name: 'Import JSON' }))

    expect(screen.getByText('Shared possibility')).toBeVisible()
    expect(screen.getByText('Make ◇p true at w0.')).toBeVisible()
    expect(screen.queryByLabelText('Modal formula')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Add edge' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: '+ Add world' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getByText(/Required edge w0Rw1 is missing/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: '+ Add edge' }))
    await user.selectOptions(screen.getByLabelText('Edge target world'), 'w1')
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getByRole('dialog', { name: 'Task complete' })).toBeVisible()
    expect(screen.getByText(/Distinct solutions recorded for this mission:/)).toHaveTextContent('1')
    const metrics = screen.getByLabelText('Construction metrics')
    expect(metrics).toHaveTextContent('2 worlds')
    expect(metrics).toHaveTextContent('1 explicit edges')
    expect(metrics).toHaveTextContent('1 true atoms')
    expect(metrics).toHaveTextContent('1 changes from start')
  })

  it('requires a correct relational-property answer when the mission requests it', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Data' }))
    const mission = {
      format: 'logic-model-builder-level', version: 1,
      level: {
        id: 'property-test', chapter: 'Custom mission', title: 'Property diagnosis', concept: 'Relation diagnosis',
        instruction: 'Identify the property.', formula: 'p -> p', scope: 'frame', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 90, y: 130 } }, { id: 'w1', atoms: '', position: { x: 390, y: 130 } }],
        edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w1' }], editable: [],
        prediction: { kind: 'frame-property', prompt: 'Which property fails?', expectedProperty: 'symmetric', propertyChoices: ['symmetric', 'transitive', 'serial'], mustBeCorrect: true },
      },
    }
    fireEvent.change(screen.getByLabelText('Model JSON'), { target: { value: JSON.stringify(mission) } })
    await user.click(screen.getByRole('button', { name: 'Import JSON' }))
    await user.selectOptions(screen.getByLabelText('Relational property answer'), 'transitive')
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getByText('Required answer incorrect')).toBeVisible()
    await user.selectOptions(screen.getByLabelText('Relational property answer'), 'symmetric')
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getByRole('dialog', { name: 'Task complete' })).toBeVisible()
  })

  it('renders countervaluations and requires the distinguishing choice', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Data' }))
    const mission = {
      format: 'logic-model-builder-level', version: 1,
      level: {
        id: 'countervaluation-test', chapter: 'Custom mission', title: 'Choose valuation', concept: 'Countervaluation',
        instruction: 'Choose the countervaluation.', formula: 'box p -> p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 90, y: 130 } }], edges: [], editable: [],
        prediction: { kind: 'countervaluation', prompt: 'Which valuation refutes T?', expectedChoice: 'A', mustBeCorrect: true, countervaluationChoices: [{ id: 'A', valuation: { w0: [] } }, { id: 'B', valuation: { w0: ['p'] } }] },
      },
    }
    fireEvent.change(screen.getByLabelText('Model JSON'), { target: { value: JSON.stringify(mission) } })
    await user.click(screen.getByRole('button', { name: 'Import JSON' }))
    const answers = screen.getByRole('radiogroup', { name: 'Countervaluation answer' })
    expect(answers).toHaveTextContent('w0: ∅')
    await user.click(within(answers).getByRole('radio', { name: /B/ }))
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getByText('Required answer incorrect')).toBeVisible()
    await user.click(within(answers).getByRole('radio', { name: /A/ }))
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getByRole('dialog', { name: 'Task complete' })).toBeVisible()
  })

  it('renders candidate models and requires the configured model choice', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Data' }))
    const mission = {
      format: 'logic-model-builder-level', version: 1,
      level: {
        id: 'model-choice-test', chapter: 'Custom mission', title: 'Compare models', concept: 'Candidate models',
        instruction: 'Choose the model.', formula: 'p -> p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 90, y: 130 } }], edges: [], editable: [],
        prediction: { kind: 'model-choice', prompt: 'Where is diamond p true?', expectedChoice: 'A', mustBeCorrect: true, modelChoices: [
          { id: 'A', evaluationWorld: 'w0', worlds: [{ id: 'w0', atoms: '' }, { id: 'w1', atoms: 'p' }], edges: [{ from: 'w0', to: 'w1' }] },
          { id: 'B', evaluationWorld: 'w0', worlds: [{ id: 'w0', atoms: '' }, { id: 'w1', atoms: 'p' }], edges: [] },
        ] },
      },
    }
    fireEvent.change(screen.getByLabelText('Model JSON'), { target: { value: JSON.stringify(mission) } })
    await user.click(screen.getByRole('button', { name: 'Import JSON' }))
    const answers = screen.getByRole('radiogroup', { name: 'Candidate model answer' })
    expect(answers).toHaveTextContent('R = {(w0,w1)}')
    await user.click(within(answers).getByRole('radio', { name: /Model B/ }))
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getByText('Required answer incorrect')).toBeVisible()
    await user.click(within(answers).getByRole('radio', { name: /Model A/ }))
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getByRole('dialog', { name: 'Task complete' })).toBeVisible()
  })

  it('exposes constraint, prediction, and bonus controls for custom mission authoring', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Data' }))

    expect(screen.getByRole('navigation', { name: 'Mission authoring steps' })).toBeVisible()
    expect(screen.getAllByRole('listitem', { hidden: true }).filter((item) => item.closest('.author-step-navigation'))).toHaveLength(9)
    expect(screen.queryByLabelText('Min worlds')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Capture mission start' }))
    for (let step = 2; step < 5; step += 1) await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { name: 'Constraints' })).toBeVisible()
    expect(screen.getByLabelText('Min worlds')).toBeVisible()
    expect(screen.getByLabelText('Max edges')).toBeVisible()
    expect(screen.getByLabelText('Max changes')).toBeVisible()
    expect(screen.getByLabelText('Bonus maximum edges')).toBeVisible()
    expect(screen.getByLabelText('Required custom mission edges')).toBeVisible()
    expect(screen.getByLabelText('Forbidden custom mission atoms')).toBeVisible()
    expect(screen.getByRole('group', { name: 'Required frame properties' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByLabelText('Custom mission prediction')).toHaveValue('none')
    expect(screen.getByRole('button', { name: /9Export\/share/ })).toBeDisabled()
  })

  it('opens a shared mission directly from the URL fragment', () => {
    const mission = {
      format: 'logic-model-builder-level', version: 1,
      level: { id: 'shared-url', chapter: 'Shared', title: 'Fragment mission', concept: 'URL sharing', instruction: 'Verify p.', formula: 'p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [{ id: 'w0', atoms: 'p', position: { x: 90, y: 130 } }], edges: [], editable: [] },
    }
    const shared = new URL(createShareUrl(JSON.stringify(mission)))
    window.history.replaceState(null, '', `${shared.pathname}${shared.hash}`)
    render(<App initialView="workspace" />)
    expect(screen.getByText('Fragment mission')).toBeVisible()
    expect(screen.queryByLabelText('Modal formula')).not.toBeInTheDocument()
  })

  it('imports and progresses through a custom campaign package', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Data' }))
    const level = (id: string, title: string) => ({
      format: 'logic-model-builder-level', version: 1,
      level: { id, chapter: 'Course', title, concept: 'Package test', instruction: 'Verify p.', formula: 'p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [{ id: 'w0', atoms: 'p', position: { x: 90, y: 130 } }], edges: [], editable: [] },
    })
    const campaign = { format: 'logic-model-builder-campaign', version: 1, title: 'Imported course', description: 'Two steps', missions: [level('package-one', 'First packaged mission'), level('package-two', 'Second packaged mission')] }
    fireEvent.change(screen.getByLabelText('Model JSON'), { target: { value: JSON.stringify(campaign) } })
    await user.click(screen.getByRole('button', { name: 'Import JSON' }))
    expect(screen.getByText('First packaged mission')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Check task' }))
    expect(screen.getByRole('dialog', { name: 'Task complete' })).toBeVisible()
    await user.click(within(screen.getByRole('dialog', { name: 'Task complete' })).getByRole('button', { name: 'Next mission' }))
    expect(screen.getByText('Second packaged mission')).toBeVisible()
  })

  it('captures and verifies separate custom-mission start and solution snapshots', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Data' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Capture mission start' }))
    expect(screen.getByText(/Start captured/)).toBeVisible()
    for (let step = 2; step < 7; step += 1) await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Capture valid solution' }))
    expect(screen.getByText('Solution verified')).toBeVisible()
    expect(screen.getByText(/Valid reference solution captured/)).toBeVisible()
  })

  it('playtests the captured custom-mission start and returns to the author workspace', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Data' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Capture mission start' }))
    for (let step = 2; step < 7; step += 1) await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Playtest as player' }))

    expect(screen.getByText('My custom mission')).toBeVisible()
    expect(screen.queryByLabelText('Modal formula')).not.toBeInTheDocument()
    expect(screen.getByText('Satisfy the configured objective.')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Home' }))
    await user.click(screen.getByRole('button', { name: 'Sandbox' }))
    expect(screen.getByLabelText('Modal formula')).toBeEnabled()
  })

  it('restores a captured mission start after the workspace changes', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Data' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Capture mission start' }))
    for (let step = 2; step < 7; step += 1) await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Close data manager' }))
    await user.clear(screen.getByLabelText('Modal formula'))
    await user.type(screen.getByLabelText('Modal formula'), 'p')
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('menuitem', { name: 'Data' }))
    await user.click(screen.getByRole('button', { name: 'Restore captured start' }))
    expect(screen.getByLabelText('Modal formula')).toHaveValue('\u25c7p')
  })

  it('keeps How to Play separate from semantic campaign content', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' }))
    await user.click(screen.getByRole('button', { name: 'Skip introduction' }))
    expect(screen.getByText('Make w1 the evaluation world.')).toBeVisible()
    expect(screen.queryByText('Frames and global constraints')).not.toBeInTheDocument()
  })

  it('opens the formal modal logic introduction', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.click(screen.getByRole('button', { name: 'Modal Logic Guide' }))
    await user.click(screen.getByRole('button', { name: /Formal Modal Semantics/ }))
    expect(screen.getByRole('heading', { name: 'Modal Logic Guide' })).toBeVisible()
    expect(screen.getByText(/M = ⟨W,R,ν⟩/)).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Satisfaction' })).toBeVisible()
  })

  it('reveals intuitive introduction topics progressively', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.click(screen.getByRole('button', { name: 'Modal Logic Guide' }))
    await user.click(screen.getByRole('button', { name: /Modal Logic: Intuitive Introduction/ }))
    const explanation = screen.getByText(/Ordinary logic asks whether a statement is true or false/)
    expect(explanation).not.toBeVisible()
    await user.click(screen.getByText('Reasoning about alternatives'))
    expect(explanation).toBeVisible()
  })

  it('documents objective and constraint types in the guide', async () => {
    const user = userEvent.setup()
    render(<App initialView="workspace" />)

    await user.click(screen.getByRole('button', { name: 'Modal Logic Guide' }))
    await user.click(screen.getByText('Open game guide →'))
    await user.click(screen.getByRole('tab', { name: 'Objectives & constraints' }))
    expect(screen.getByText('Objective scopes')).toBeVisible()
    expect(screen.getByText('Construction constraints')).toBeVisible()
    expect(screen.getByText('Locked inputs')).toBeVisible()
  })
})
