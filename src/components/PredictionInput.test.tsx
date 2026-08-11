// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameLevel } from '../campaign'
import { PredictionInput, supportedPredictionKinds } from './PredictionInput'

type Prediction = NonNullable<GameLevel['prediction']>
afterEach(cleanup)
const renderInput = (prediction: Prediction, answer = '') => {
  const onAnswer = vi.fn()
  render(<PredictionInput prediction={prediction} answer={answer} onAnswer={onAnswer} availableWorldIds={['w0', 'w1']} propertyChoices={['serial']} />)
  return onAnswer
}

describe('PredictionInput', () => {
  it('exhaustively declares all eight supported answer kinds', () => {
    expect(Object.keys(supportedPredictionKinds).sort()).toEqual(['counterexample-world', 'countervaluation', 'frame-property', 'model-choice', 'scope-truth', 'statement-choice', 'truth', 'world-choice'])
  })

  it('renders truth answers as radios', () => {
    const onAnswer = renderInput({ kind: 'truth', prompt: 'True?' })
    fireEvent.click(screen.getByRole('radio', { name: 'True' }))
    expect(onAnswer).toHaveBeenCalledWith('true')
  })

  it.each(['world-choice', 'counterexample-world'] as const)('renders %s as a world control', (kind) => {
    const onAnswer = renderInput({ kind, prompt: 'Which world?', worldChoices: ['w1'] })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'w1' } })
    expect(onAnswer).toHaveBeenCalledWith('w1')
  })

  it('renders relational properties', () => {
    const onAnswer = renderInput({ kind: 'frame-property', prompt: 'Which property?', propertyChoices: ['serial'] })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'serial' } })
    expect(onAnswer).toHaveBeenCalledWith('serial')
  })

  it('renders countervaluations', () => {
    const onAnswer = renderInput({ kind: 'countervaluation', prompt: 'Which valuation?', countervaluationChoices: [{ id: 'A', valuation: { w0: [] } }] })
    fireEvent.click(screen.getByRole('radio', { name: /A/ }))
    expect(onAnswer).toHaveBeenCalledWith('A')
  })

  it('renders candidate models with a diagram', () => {
    const onAnswer = renderInput({ kind: 'model-choice', prompt: 'Which model?', modelChoices: [{ id: 'A', evaluationWorld: 'w0', worlds: [{ id: 'w0', atoms: '' }], edges: [] }] })
    fireEvent.click(screen.getByRole('radio', { name: /Model A/ }))
    expect(screen.getByRole('img', { name: 'Candidate model A' })).toBeVisible()
    expect(onAnswer).toHaveBeenCalledWith('A')
  })

  it('renders statement choices', () => {
    const onAnswer = renderInput({ kind: 'statement-choice', prompt: 'Which?', statementChoices: [{ id: 'a', label: 'Answer A' }] })
    fireEvent.click(screen.getByRole('radio', { name: 'Answer A' }))
    expect(onAnswer).toHaveBeenCalledWith('a')
  })

  it('renders all three semantic scopes', () => {
    const onAnswer = renderInput({ kind: 'scope-truth', prompt: 'Profile?' }, 'true,,false')
    fireEvent.click(screen.getByText('False', { selector: '.question-scope-choice div:nth-child(2) button:last-child' }))
    expect(onAnswer).toHaveBeenCalledWith('true,false,false')
  })
})
