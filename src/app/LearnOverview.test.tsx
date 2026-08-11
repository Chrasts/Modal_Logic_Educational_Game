// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { tutorialLevels } from '../campaign'
import { learnCourse, learnLessons } from '../learn'
import { emptyLearnProgress } from '../learn-progress'
import { LearnOverview } from './LearnOverview'

afterEach(cleanup)

const renderOverview = (expandedChapterId: string | null = null) => {
  const onOpenControl = vi.fn()
  render(<LearnOverview completed={0} total={tutorialLevels.length + learnLessons.length} progress={emptyLearnProgress()} tutorialLevels={tutorialLevels} tutorialCompleted={0} nextTutorialIndex={0} expandedChapterId={expandedChapterId} completedLevelIds={new Set()} course={learnCourse} lessons={learnLessons} onContinue={vi.fn()} onWelcome={vi.fn()} onOpenControl={onOpenControl} onRestartControls={vi.fn()} onOpenLesson={vi.fn()} onRestartChapter={vi.fn()} onToggleChapter={vi.fn()} />)
  return onOpenControl
}

describe('LearnOverview', () => {
  it('is the single controls browser and calls the selected control lesson', () => {
    const onOpenControl = renderOverview('controls')
    expect(screen.getByRole('heading', { name: 'Learn the Controls' })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Open' })[0])
    expect(onOpenControl).toHaveBeenCalledWith(0)
  })

  it('contains no standalone tutorial navigation', () => {
    renderOverview()
    expect(screen.queryByRole('link', { name: /tutorial/i })).not.toBeInTheDocument()
  })
})
