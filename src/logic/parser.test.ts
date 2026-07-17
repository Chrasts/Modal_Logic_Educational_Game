import { describe, expect, it } from 'vitest'
import { and, atom, box, diamond, implies, not, or } from './formula'
import { FormulaSyntaxError, parseFormula, tokenize } from './parser'
import { createModel } from './model'
import { evaluate } from './evaluate'

describe('tokenizer', () => {
  it('recognizes Unicode and text notation', () => {
    expect(tokenize('¬p ∧ box q -> ◇r').map(({ kind }) => kind)).toEqual([
      'not', 'atom', 'and', 'box', 'atom', 'implies', 'diamond', 'atom', 'end',
    ])
  })

  it('reports an unknown character and its position', () => {
    expect(() => tokenize('p @ q')).toThrowError(new FormulaSyntaxError('Unknown character “@”', 2))
  })
})

describe('formula parser', () => {
  it('parses atoms and all unary operators', () => {
    expect(parseFormula('¬□◇p')).toEqual(not(box(diamond(atom('p')))))
    expect(parseFormula('! box diamond p')).toEqual(not(box(diamond(atom('p')))))
  })

  it('applies standard operator precedence', () => {
    expect(parseFormula('p ∨ q ∧ r')).toEqual(or(atom('p'), and(atom('q'), atom('r'))))
    expect(parseFormula('¬p ∧ q → r')).toEqual(implies(and(not(atom('p')), atom('q')), atom('r')))
  })

  it('makes implication right-associative', () => {
    expect(parseFormula('p -> q -> r')).toEqual(
      implies(atom('p'), implies(atom('q'), atom('r'))),
    )
  })

  it('uses parentheses to override precedence', () => {
    expect(parseFormula('(p ∨ q) ∧ r')).toEqual(and(or(atom('p'), atom('q')), atom('r')))
  })

  it('supports identifiers with digits and underscores', () => {
    expect(parseFormula('premise_1 -> result2')).toEqual(
      implies(atom('premise_1'), atom('result2')),
    )
  })

  it.each([
    ['', /input ended/i],
    ['p ∧', /input ended/i],
    ['(p ∨ q', /closing parenthesis/i],
    ['p q', /unexpected symbol/i],
    ['p)', /unexpected symbol/i],
  ])('rejects malformed input %j', (source, message) => {
    expect(() => parseFormula(source)).toThrow(message)
  })
})

describe('parser and evaluator integration', () => {
  it('evaluates a parsed modal formula in a finite model', () => {
    const model = createModel(
      { w0: [], w1: ['p'], w2: ['q'] },
      [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }],
    )

    expect(evaluate(model, 'w0', parseFormula('◇p ∧ ◇q'))).toBe(true)
    expect(evaluate(model, 'w0', parseFormula('□(p ∨ q) -> (□p ∨ □q)'))).toBe(false)
  })
})
