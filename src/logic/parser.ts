import { and, atom, box, diamond, implies, not, or, type Formula } from './formula'

type TokenKind =
  | 'atom'
  | 'not'
  | 'and'
  | 'or'
  | 'implies'
  | 'box'
  | 'diamond'
  | 'leftParen'
  | 'rightParen'
  | 'end'

interface Token {
  readonly kind: TokenKind
  readonly lexeme: string
  readonly position: number
}

export class FormulaSyntaxError extends Error {
  constructor(
    message: string,
    readonly position: number,
  ) {
    super(`${message} (position ${position + 1})`)
    this.name = 'FormulaSyntaxError'
  }
}

const singleCharacterTokens: Readonly<Record<string, TokenKind>> = {
  '¬': 'not',
  '!': 'not',
  '∧': 'and',
  '&': 'and',
  '∨': 'or',
  '|': 'or',
  '→': 'implies',
  '□': 'box',
  '◇': 'diamond',
  '(': 'leftParen',
  ')': 'rightParen',
}

export function tokenize(source: string): readonly Token[] {
  const tokens: Token[] = []
  let position = 0

  while (position < source.length) {
    const character = source[position]
    if (/\s/u.test(character)) {
      position += 1
      continue
    }

    if (source.startsWith('->', position)) {
      tokens.push({ kind: 'implies', lexeme: '->', position })
      position += 2
      continue
    }

    const singleKind = singleCharacterTokens[character]
    if (singleKind) {
      tokens.push({ kind: singleKind, lexeme: character, position })
      position += 1
      continue
    }

    const identifier = source.slice(position).match(/^[A-Za-z][A-Za-z0-9_]*/u)?.[0]
    if (identifier) {
      const keywordKind = identifier === 'box' || identifier === 'diamond' ? identifier : 'atom'
      tokens.push({ kind: keywordKind, lexeme: identifier, position })
      position += identifier.length
      continue
    }

    throw new FormulaSyntaxError(`Unknown character “${character}”`, position)
  }

  tokens.push({ kind: 'end', lexeme: '', position: source.length })
  return tokens
}

export function parseFormula(source: string): Formula {
  const tokens = tokenize(source)
  let current = 0

  const peek = () => tokens[current]
  const take = () => tokens[current++]

  const parsePrimary = (): Formula => {
    const token = take()
    if (token.kind === 'atom') return atom(token.lexeme)

    if (token.kind === 'leftParen') {
      const formula = parseImplication()
      const closing = take()
      if (closing.kind !== 'rightParen') {
        throw new FormulaSyntaxError('Missing closing parenthesis', closing.position)
      }
      return formula
    }

    if (token.kind === 'end') {
      throw new FormulaSyntaxError('Expected a formula, but the input ended', token.position)
    }
    throw new FormulaSyntaxError(`Expected a formula, found “${token.lexeme}”`, token.position)
  }

  const parseUnary = (): Formula => {
    const token = peek()
    if (token.kind === 'not') {
      take()
      return not(parseUnary())
    }
    if (token.kind === 'box') {
      take()
      return box(parseUnary())
    }
    if (token.kind === 'diamond') {
      take()
      return diamond(parseUnary())
    }
    return parsePrimary()
  }

  const parseConjunction = (): Formula => {
    let left = parseUnary()
    while (peek().kind === 'and') {
      take()
      left = and(left, parseUnary())
    }
    return left
  }

  const parseDisjunction = (): Formula => {
    let left = parseConjunction()
    while (peek().kind === 'or') {
      take()
      left = or(left, parseConjunction())
    }
    return left
  }

  function parseImplication(): Formula {
    const left = parseDisjunction()
    if (peek().kind === 'implies') {
      take()
      return implies(left, parseImplication())
    }
    return left
  }

  const result = parseImplication()
  const remaining = peek()
  if (remaining.kind !== 'end') {
    throw new FormulaSyntaxError(`Unexpected symbol “${remaining.lexeme}”`, remaining.position)
  }
  return result
}
