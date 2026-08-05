// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { learnLessons } from './learn'
import { LearnLessonView } from './LearnLessonView'

afterEach(cleanup)

const callbacks = { onStage: vi.fn(), onPrediction: vi.fn(), onExampleStep: vi.fn(), onBeginTask: vi.fn(), onBack: vi.fn() }

describe('LearnLessonView focus', () => {
  it('moves focus to the title when the lesson changes', () => {
    const { rerender } = render(<LearnLessonView lesson={learnLessons[0]} stage="concept" predictionAnswer="" exampleStep={0} {...callbacks} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
    rerender(<LearnLessonView lesson={learnLessons[1]} stage="concept" predictionAnswer="" exampleStep={0} {...callbacks} />)
    expect(screen.getByRole('heading', { level: 1, name: learnLessons[1].title })).toHaveFocus()
  })
})
