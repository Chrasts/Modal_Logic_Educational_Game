// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GameLevel } from '../campaign'
import { QuestionTaskPanel } from './QuestionTaskPanel'

const level = (prediction: NonNullable<GameLevel['prediction']>, scope: GameLevel['scope'] = 'pointed'): GameLevel => ({
  id: 'question', chapter: 'Test', title: 'Question', concept: 'Interpretation', instruction: 'Answer the question.',
  interactionMode: 'question', formula: 'p', scope, targetTruth: true, evaluationWorld: 'w0', prediction,
  worlds: [{ id: 'w0', atoms: 'p', position: { x: 0, y: 0 } }], edges: [], editable: [],
})

describe('QuestionTaskPanel', () => {
  it('uses frame-valid labels for frame truth questions', () => {
    render(<QuestionTaskPanel level={level({ kind: 'truth', prompt: 'Valid?' }, 'frame')} answer="" onAnswer={vi.fn()} />)
    expect(screen.getByRole('radio', { name: 'Valid on this frame' })).toBeVisible()
    expect(screen.getByRole('radio', { name: 'Not valid on this frame' })).toBeVisible()
  })

  it('supports all three scope answers as one question response', () => {
    const onAnswer = vi.fn()
    render(<QuestionTaskPanel level={level({ kind: 'scope-truth', prompt: 'Which profile?' })} answer="true,,false" onAnswer={onAnswer} />)
    fireEvent.click(screen.getByText('False', { selector: '.question-scope-choice div:nth-child(2) button:last-child' }))
    expect(onAnswer).toHaveBeenCalledWith('true,false,false')
  })

  it('renders candidate models as answer cards', () => {
    const onAnswer = vi.fn()
    render(<QuestionTaskPanel level={level({ kind: 'model-choice', prompt: 'Which model?', expectedChoice: 'A', modelChoices: [{ id: 'A', evaluationWorld: 'w0', worlds: [{ id: 'w0', atoms: 'p' }], edges: [] }] })} answer="" onAnswer={onAnswer} />)
    fireEvent.click(screen.getByRole('radio', { name: /Model A/ }))
    expect(onAnswer).toHaveBeenCalledWith('A')
  })
})
