import { useId } from 'react'

interface StaticWorld { readonly id: string; readonly atoms: string; readonly position?: { readonly x: number; readonly y: number } }
interface StaticEdge { readonly from: string; readonly to: string }

const layoutWorlds = (worlds: readonly StaticWorld[]) => {
  if (worlds.every(({ position }) => position)) {
    const xs = worlds.map(({ position }) => position!.x)
    const ys = worlds.map(({ position }) => position!.y)
    const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys)
    return new Map(worlds.map((world) => [world.id, { x: 48 + ((world.position!.x - minX) / Math.max(1, maxX - minX)) * 224, y: 45 + ((world.position!.y - minY) / Math.max(1, maxY - minY)) * 110 }]))
  }
  return new Map(worlds.map((world, index) => {
    const angle = worlds.length === 1 ? 0 : (index * Math.PI * 2) / worlds.length - Math.PI / 2
    return [world.id, { x: 160 + Math.cos(angle) * 105, y: 90 + Math.sin(angle) * 58 }]
  }))
}

export function StaticKripkeDiagram({ worlds, edges, evaluationWorld, highlightedWorlds, highlightedEdges, compact = false, ariaLabel = 'Kripke model diagram' }: {
  readonly worlds: readonly StaticWorld[]
  readonly edges: readonly StaticEdge[]
  readonly evaluationWorld?: string
  readonly highlightedWorlds?: ReadonlySet<string>
  readonly highlightedEdges?: ReadonlySet<string>
  readonly compact?: boolean
  readonly ariaLabel?: string
}) {
  const markerId = useId().replace(/:/gu, '')
  const positions = layoutWorlds(worlds)
  const summary = `Worlds: ${worlds.map(({ id, atoms }) => `${id} with ${atoms.trim() || 'no atoms'}`).join('; ')}. Relations: ${edges.length ? edges.map(({ from, to }) => `${from} to ${to}`).join('; ') : 'none'}.`
  return <span className={`static-kripke-diagram${compact ? ' compact' : ''}`}>
    <svg viewBox="0 0 320 180" role="img" aria-label={ariaLabel}>
      <defs><marker id={markerId} markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" /></marker></defs>
      {edges.map(({ from, to }, index) => {
        const source = positions.get(from); const target = positions.get(to)
        if (!source || !target) return null
        const highlighted = highlightedEdges?.has(`${from}\u0000${to}`)
        if (from === to) return <path key={`${from}-${to}-${index}`} className={`static-edge self${highlighted ? ' highlighted' : ''}`} d={`M ${source.x - 11} ${source.y - 24} C ${source.x - 35} ${source.y - 48}, ${source.x + 35} ${source.y - 48}, ${source.x + 11} ${source.y - 24}`} markerEnd={`url(#${markerId})`} />
        const dx = target.x - source.x; const dy = target.y - source.y; const distance = Math.max(1, Math.hypot(dx, dy)); const ux = dx / distance; const uy = dy / distance
        return <line key={`${from}-${to}-${index}`} className={`static-edge${highlighted ? ' highlighted' : ''}`} x1={source.x + ux * 27} y1={source.y + uy * 27} x2={target.x - ux * 30} y2={target.y - uy * 30} markerEnd={`url(#${markerId})`} />
      })}
      {worlds.map(({ id, atoms }) => { const point = positions.get(id)!; const highlighted = highlightedWorlds?.has(id); return <g key={id} className={`static-world${evaluationWorld === id ? ' evaluation' : ''}${highlighted ? ' highlighted' : ''}`} transform={`translate(${point.x} ${point.y})`}><circle r="25" /><text y="-2">{id}</text><text className="atoms" y="13">{atoms.trim() || '∅'}</text></g> })}
    </svg>
    <span className="visually-hidden">{summary}</span>
  </span>
}
