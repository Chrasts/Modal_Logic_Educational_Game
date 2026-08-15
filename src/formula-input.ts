import { FormulaSyntaxError, parseFormula, type Formula } from './logic'

export interface TextInsertion {
  readonly value: string
  readonly selectionStart: number
  readonly selectionEnd: number
}

export type FormulaInputValidation =
  | { readonly kind: 'empty' }
  | { readonly kind: 'valid'; readonly formula: Formula }
  | { readonly kind: 'invalid'; readonly message: string; readonly position?: number }

/** Presentation-friendly validation backed by the parser used for evaluation. */
export function validateFormulaInput(source: string): FormulaInputValidation {
  if (!source.trim()) return { kind: 'empty' }
  try {
    return { kind: 'valid', formula: parseFormula(source) }
  } catch (error) {
    return {
      kind: 'invalid',
      message: error instanceof Error ? error.message : 'Invalid formula.',
      position: error instanceof FormulaSyntaxError ? error.position : undefined,
    }
  }
}

export function insertAtSelection(source: string, token: string, selectionStart: number | null, selectionEnd: number | null): TextInsertion {
  const start = Math.max(0, Math.min(source.length, selectionStart ?? source.length))
  const end = Math.max(start, Math.min(source.length, selectionEnd ?? start))
  const caret = start + token.length
  return { value: `${source.slice(0, start)}${token}${source.slice(end)}`, selectionStart: caret, selectionEnd: caret }
}
