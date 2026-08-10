export interface TextInsertion {
  readonly value: string
  readonly selectionStart: number
  readonly selectionEnd: number
}

export function insertAtSelection(source: string, token: string, selectionStart: number | null, selectionEnd: number | null): TextInsertion {
  const start = Math.max(0, Math.min(source.length, selectionStart ?? source.length))
  const end = Math.max(start, Math.min(source.length, selectionEnd ?? start))
  const caret = start + token.length
  return { value: `${source.slice(0, start)}${token}${source.slice(end)}`, selectionStart: caret, selectionEnd: caret }
}
