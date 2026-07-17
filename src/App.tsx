import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  MiniMapNode,
  Panel,
  ReactFlow,
  useNodesState,
  type Connection,
  type Edge as FlowEdge,
  type MiniMapNodeProps,
  type Node as FlowNode,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  applyFrameProperties,
  createModel,
  evaluateWithExplanation,
  parseFormula,
  type AccessibilityEdge,
  type FrameProperties,
} from './logic'

interface EditableWorld {
  readonly key: number
  id: string
  atoms: string
  position: { x: number; y: number }
}

interface EditableEdge {
  readonly key: number
  from: string
  to: string
}

type VerificationResult =
  | { readonly kind: 'success'; readonly message: string; readonly detail: string }
  | { readonly kind: 'failure'; readonly message: string; readonly detail: string }
  | { readonly kind: 'error'; readonly message: string }
  | null

type EditorMode = 'edit' | 'evaluate'

interface ModelSnapshot {
  readonly worlds: EditableWorld[]
  readonly edges: EditableEdge[]
  readonly evaluationWorld: string
  readonly frameProperties: FrameProperties
}

const initialWorlds: EditableWorld[] = [
  { key: 0, id: 'w0', atoms: '', position: { x: 90, y: 110 } },
  { key: 1, id: 'w1', atoms: 'p', position: { x: 390, y: 110 } },
]

const initialEdges: EditableEdge[] = [{ key: 0, from: 'w0', to: 'w1' }]
const storageKey = 'logic-game:sandbox:v1'
const explicitKeyFromFlowEdgeId = (id: string) => id.startsWith('explicit:') ? Number(id.slice(9)) : null

interface SandboxDraft {
  readonly formulaSource: string
  readonly worlds: EditableWorld[]
  readonly edges: EditableEdge[]
  readonly evaluationWorld: string
  readonly targetTruth: boolean
  readonly frameProperties?: FrameProperties
}

function loadDraft(): SandboxDraft | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const draft = JSON.parse(raw) as Partial<SandboxDraft>
    if (
      typeof draft.formulaSource !== 'string'
      || !Array.isArray(draft.worlds)
      || !Array.isArray(draft.edges)
      || typeof draft.evaluationWorld !== 'string'
      || typeof draft.targetTruth !== 'boolean'
    ) return null
    return {
      ...draft,
      worlds: draft.worlds.map((world, index) => ({
        ...world,
        position: world.position && typeof world.position.x === 'number' && typeof world.position.y === 'number'
          ? world.position
          : { x: 90 + (index % 3) * 240, y: 90 + Math.floor(index / 3) * 150 },
      })),
    } as SandboxDraft
  } catch {
    return null
  }
}

export function App() {
  const [initialDraft] = useState(loadDraft)
  const [formulaSource, setFormulaSource] = useState(initialDraft?.formulaSource ?? '◇p')
  const [worlds, setWorlds] = useState(initialDraft?.worlds ?? initialWorlds)
  const [edges, setEdges] = useState(initialDraft?.edges ?? initialEdges)
  const [evaluationWorld, setEvaluationWorld] = useState(initialDraft?.evaluationWorld ?? 'w0')
  const [targetTruth, setTargetTruth] = useState(initialDraft?.targetTruth ?? true)
  const [frameProperties, setFrameProperties] = useState<FrameProperties>(initialDraft?.frameProperties ?? {
    reflexive: false,
    symmetric: false,
    transitive: false,
  })
  const [result, setResult] = useState<VerificationResult>(null)
  const [nextWorldKey, setNextWorldKey] = useState(() => Math.max(-1, ...worlds.map(({ key }) => key)) + 1)
  const [nextEdgeKey, setNextEdgeKey] = useState(() => Math.max(-1, ...edges.map(({ key }) => key)) + 1)
  const [selectedEdgeKey, setSelectedEdgeKey] = useState<number | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode>('edit')
  const [showDerivedEdges, setShowDerivedEdges] = useState(true)
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [selectedWorldKey, setSelectedWorldKey] = useState<number | null>(null)
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null)
  const historyPast = useRef<ModelSnapshot[]>([])
  const historyFuture = useRef<ModelSnapshot[]>([])
  const [historyVersion, setHistoryVersion] = useState(0)

  const currentSnapshot = (): ModelSnapshot => ({
    worlds: structuredClone(worlds),
    edges: structuredClone(edges),
    evaluationWorld,
    frameProperties: { ...frameProperties },
  })

  const saveHistoryPoint = () => {
    historyPast.current.push(currentSnapshot())
    if (historyPast.current.length > 50) historyPast.current.shift()
    historyFuture.current = []
    setHistoryVersion((version) => version + 1)
  }

  const restoreSnapshot = (snapshot: ModelSnapshot) => {
    setWorlds(structuredClone(snapshot.worlds))
    setEdges(structuredClone(snapshot.edges))
    setEvaluationWorld(snapshot.evaluationWorld)
    setFrameProperties({ ...snapshot.frameProperties })
    setSelectedWorldKey(null)
    setResult(null)
  }

  const undo = () => {
    const previous = historyPast.current.pop()
    if (!previous) return
    historyFuture.current.push(currentSnapshot())
    restoreSnapshot(previous)
    setHistoryVersion((version) => version + 1)
  }

  const redo = () => {
    const next = historyFuture.current.pop()
    if (!next) return
    historyPast.current.push(currentSnapshot())
    restoreSnapshot(next)
    setHistoryVersion((version) => version + 1)
  }

  useEffect(() => {
    const draft: SandboxDraft = { formulaSource, worlds, edges, evaluationWorld, targetTruth, frameProperties }
    localStorage.setItem(storageKey, JSON.stringify(draft))
  }, [formulaSource, worlds, edges, evaluationWorld, targetTruth, frameProperties])

  const usableWorldIds = useMemo(
    () => worlds.map(({ id }) => id.trim()).filter((id, index, ids) => id && ids.indexOf(id) === index),
    [worlds],
  )

  const effectiveEdges = useMemo(
    () => applyFrameProperties(usableWorldIds, edges, frameProperties),
    [usableWorldIds, edges, frameProperties],
  )

  const explicitEdgeKeyByPair = useMemo(
    () => new Map(edges.map((edge) => [`${edge.from}\u0000${edge.to}`, edge.key])),
    [edges],
  )

  const displayedEdges = useMemo(
    () => showDerivedEdges
      ? effectiveEdges
      : effectiveEdges.filter((edge) => explicitEdgeKeyByPair.has(`${edge.from}\u0000${edge.to}`)),
    [effectiveEdges, explicitEdgeKeyByPair, showDerivedEdges],
  )

  const nodeBlueprints = useMemo<FlowNode[]>(() => worlds.map((world) => ({
    id: String(world.key),
    position: world.position,
    data: {
      label: (
        <div className="node-label">
          <strong>{world.id || 'unnamed'}</strong>
          <span>{world.atoms.trim() || '∅'}</span>
          {effectiveEdges.some((edge) => edge.from === world.id.trim() && edge.to === world.id.trim()) && (
            <span className="reflexive-badge" title={`${world.id} R ${world.id}`} aria-label="Reflexive relation">↻</span>
          )}
        </div>
      ),
    },
    className: [
      world.id.trim() === evaluationWorld ? 'evaluation-node' : '',
      world.key === selectedWorldKey ? 'selected-world-node' : '',
    ].filter(Boolean).join(' '),
    ariaLabel: `World ${world.id || 'without a name'}, atoms ${world.atoms || 'none'}`,
  })), [worlds, effectiveEdges, evaluationWorld, selectedWorldKey])

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodeBlueprints)

  useEffect(() => {
    setFlowNodes(nodeBlueprints)
  }, [nodeBlueprints, setFlowNodes])

  const worldKeyById = useMemo(
    () => new Map(worlds.map((world) => [world.id.trim(), String(world.key)])),
    [worlds],
  )

  const flowEdges = useMemo<FlowEdge[]>(() => displayedEdges.flatMap((edge) => {
    const source = worldKeyById.get(edge.from)
    const target = worldKeyById.get(edge.to)
    const explicitKey = explicitEdgeKeyByPair.get(`${edge.from}\u0000${edge.to}`)
    return source && target && source !== target ? [{
      id: explicitKey === undefined ? `derived:${edge.from}:${edge.to}` : `explicit:${explicitKey}`,
      source,
      target,
      markerEnd: { type: MarkerType.ArrowClosed },
      selectable: explicitKey !== undefined,
      focusable: explicitKey !== undefined,
      selected: explicitKey === selectedEdgeKey,
      className: explicitKey === undefined
        ? 'model-edge derived-edge'
        : explicitKey === selectedEdgeKey ? 'model-edge selected-edge' : 'model-edge',
    }] : []
  }), [displayedEdges, worldKeyById, explicitEdgeKeyByPair, selectedEdgeKey])

  const MiniMapWithRelations = useMemo(() => {
    const worldByKey = new Map(worlds.map((world) => [String(world.key), world]))
    const keyByWorldId = new Map(worlds.map((world) => [world.id.trim(), String(world.key)]))
    const relationPairs = displayedEdges
      .filter((edge) => edge.from !== edge.to)
      .map((edge) => ({ source: keyByWorldId.get(edge.from), target: keyByWorldId.get(edge.to) }))

    return function RelationMiniMapNode(props: MiniMapNodeProps) {
      const sourceWorld = worldByKey.get(props.id)
      const diameter = Math.min(props.width, props.height) * 0.62
      const circleX = props.x + props.width / 2 - diameter / 2
      const circleY = props.y + props.height / 2 - diameter / 2
      return (
        <g>
          {sourceWorld && relationPairs
            .filter((pair) => pair.source === props.id && pair.target)
            .map((pair) => {
              const targetWorld = worldByKey.get(pair.target!)
              if (!targetWorld) return null
              return (
                <line
                  key={`${pair.source}-${pair.target}`}
                  x1={props.x + props.width / 2}
                  y1={props.y + props.height / 2}
                  x2={targetWorld.position.x + 64}
                  y2={targetWorld.position.y + 30}
                  className="minimap-relation"
                />
              )
            })}
          <MiniMapNode
            {...props}
            x={circleX}
            y={circleY}
            width={diameter}
            height={diameter}
          />
        </g>
      )
    }
  }, [worlds, displayedEdges])

  const selectedWorld = worlds.find((world) => world.key === selectedWorldKey) ?? null

  const updateWorld = (key: number, field: 'id' | 'atoms', value: string) => {
    const previous = worlds.find((world) => world.key === key)
    setWorlds((current) => current.map((world) => world.key === key ? { ...world, [field]: value } : world))
    if (field === 'id' && previous) {
      const oldId = previous.id.trim()
      const newId = value.trim()
      setEdges((current) => current.map((edge) => ({
        ...edge,
        from: edge.from === oldId ? newId : edge.from,
        to: edge.to === oldId ? newId : edge.to,
      })))
      if (evaluationWorld === oldId) setEvaluationWorld(newId)
    }
    setResult(null)
  }

  const addWorld = () => {
    saveHistoryPoint()
    const used = new Set(worlds.map(({ id }) => id))
    let number = worlds.length
    while (used.has(`w${number}`)) number += 1
    setWorlds((current) => [...current, {
      key: nextWorldKey,
      id: `w${number}`,
      atoms: '',
      position: { x: 90 + (current.length % 3) * 240, y: 90 + Math.floor(current.length / 3) * 150 },
    }])
    setNextWorldKey((key) => key + 1)
    setResult(null)
  }

  const removeWorld = (key: number) => {
    saveHistoryPoint()
    const removed = worlds.find((world) => world.key === key)
    setWorlds((current) => current.filter((world) => world.key !== key))
    if (removed) {
      setEdges((current) => current.filter(({ from, to }) => from !== removed.id && to !== removed.id))
    }
    setResult(null)
  }

  const addEdge = () => {
    saveHistoryPoint()
    const fallback = usableWorldIds[0] ?? ''
    setEdges((current) => [...current, { key: nextEdgeKey, from: fallback, to: fallback }])
    setNextEdgeKey((key) => key + 1)
    setResult(null)
  }

  const connectWorlds = (connection: Connection) => {
    const source = worlds.find(({ key }) => String(key) === connection.source)?.id.trim()
    const target = worlds.find(({ key }) => String(key) === connection.target)?.id.trim()
    if (!source || !target) return
    if (edges.some((edge) => edge.from === source && edge.to === target)) return
    saveHistoryPoint()
    setEdges((current) => [...current, { key: nextEdgeKey, from: source, to: target }])
    setNextEdgeKey((key) => key + 1)
    setResult(null)
  }

  const deleteEdge = (key: number) => {
    saveHistoryPoint()
    setEdges((current) => current.filter((edge) => edge.key !== key))
    setSelectedEdgeKey((current) => current === key ? null : current)
    setResult(null)
  }

  const resetSandbox = () => {
    if (!window.confirm('Reset the sandbox? The current model will be replaced.')) return
    saveHistoryPoint()
    setFormulaSource('◇p')
    setWorlds(initialWorlds)
    setEdges(initialEdges)
    setEvaluationWorld('w0')
    setTargetTruth(true)
    setFrameProperties({ reflexive: false, symmetric: false, transitive: false })
    setNextWorldKey(2)
    setNextEdgeKey(1)
    setSelectedEdgeKey(null)
    setResult(null)
  }

  const verify = () => {
    try {
      const ids = worlds.map(({ id }) => id.trim())
      if (ids.some((id) => !id)) throw new Error('Every world must have a name.')
      if (new Set(ids).size !== ids.length) throw new Error('World names must be unique.')
      if (!ids.includes(evaluationWorld)) throw new Error('Select an existing evaluation world.')

      const valuations = Object.fromEntries(worlds.map(({ id, atoms }) => [
        id.trim(),
        atoms.split(/[\s,]+/u).map((value) => value.trim()).filter(Boolean),
      ]))
      const normalizedEdges: AccessibilityEdge[] = effectiveEdges.map(({ from, to }) => ({ from, to }))
      const evaluation = evaluateWithExplanation(
        createModel(valuations, normalizedEdges),
        evaluationWorld,
        parseFormula(formulaSource),
      )
      const matches = evaluation.value === targetTruth
      setResult({
        kind: matches ? 'success' : 'failure',
        message: matches
          ? `Goal met: the formula is ${evaluation.value ? 'true' : 'false'} at ${evaluationWorld}.`
          : `Goal not met: the formula is ${evaluation.value ? 'true' : 'false'} at ${evaluationWorld}.`,
        detail: evaluation.explanation,
      })
    } catch (error) {
      setResult({ kind: 'error', message: error instanceof Error ? error.message : 'Verification failed.' })
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">◇</span><strong>Logic Model Builder</strong><nav className="product-nav" aria-label="Game modes"><button className="active" type="button">Sandbox</button><button type="button" disabled>Campaign <small>soon</small></button></nav></div>
        <div className="topbar-actions">
          <button type="button" className="icon-button" onClick={undo} disabled={historyPast.current.length === 0} aria-label="Undo" title="Undo">↶</button>
          <button type="button" className="icon-button" onClick={redo} disabled={historyFuture.current.length === 0} aria-label="Redo" title="Redo">↷</button>
          <button type="button" className="icon-button" onClick={() => setLeftPanelOpen((open) => !open)} aria-label="Toggle left panels" title="Toggle left panels">◧</button>
          <button type="button" className="icon-button" onClick={() => setRightPanelOpen((open) => !open)} aria-label="Toggle right panels" title="Toggle right panels">◨</button>
          <button type="button" className="text-button" onClick={resetSandbox}>Reset model</button>
          <button type="button" className="help-button" onClick={() => setShowHelp(true)}>Help / legend</button>
        </div>
      </header>

      <section className={`workspace ${!leftPanelOpen ? 'left-collapsed' : ''} ${!rightPanelOpen ? 'right-collapsed' : ''}`} aria-label="Kripke model editor">
        <div className="panel formula-panel">
          <div className="panel-heading">
            <span className="step">01</span>
            <div><h2>Formula and goal</h2><p>Unicode and text notation</p></div>
          </div>
          <label className="field">
            <span>Modal formula</span>
            <input value={formulaSource} onChange={(event) => { setFormulaSource(event.target.value); setResult(null) }} spellCheck={false} />
          </label>
          <div className="symbol-row" aria-label="Insert symbol">
            {['¬', '∧', '∨', '→', '□', '◇'].map((symbol) => (
              <button key={symbol} type="button" className="symbol-button" onClick={() => setFormulaSource((value) => value + symbol)}>{symbol}</button>
            ))}
          </div>
          <fieldset className="target-choice">
            <legend>Construction goal</legend>
            <label><input type="radio" checked={targetTruth} onChange={() => { setTargetTruth(true); setResult(null) }} /> Make it true</label>
            <label><input type="radio" checked={!targetTruth} onChange={() => { setTargetTruth(false); setResult(null) }} /> Build a countermodel</label>
          </fieldset>
          <fieldset className="frame-properties">
            <legend>Global frame properties</legend>
            {([
              ['reflexive', 'Reflexive', 'wRw for every world'],
              ['symmetric', 'Symmetric', 'wRv ⇒ vRw'],
              ['transitive', 'Transitive', 'wRv ∧ vRu ⇒ wRu'],
            ] as const).map(([property, label, description]) => (
              <label key={property}>
                <input
                  type="checkbox"
                  checked={frameProperties[property]}
                  onChange={(event) => {
                    saveHistoryPoint()
                    setFrameProperties((current) => ({ ...current, [property]: event.target.checked }))
                    setResult(null)
                  }}
                />
                <span><strong>{label}</strong><small>{description}</small></span>
              </label>
            ))}
          </fieldset>
          <p className="notation">Precedence: ¬ □ ◇ &gt; ∧ &gt; ∨ &gt; →. Alternatives: !, &amp;, |, -&gt;, box, diamond.</p>
        </div>

        <div className="panel graph-panel">
          <div className="panel-heading">
            <span className="step">02</span>
            <div><h2>Visual model</h2><p>Drag worlds and connect their handles</p></div>
          </div>
          <div className="graph-canvas">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              onInit={setFlowInstance}
              onNodesChange={onNodesChange}
              nodesDraggable={editorMode === 'edit'}
              nodesConnectable={editorMode === 'edit'}
              edgesFocusable={editorMode === 'edit'}
              onNodeDragStart={saveHistoryPoint}
              onNodeDragStop={(_event, node) => setWorlds((current) => current.map((world) => world.key === Number(node.id) ? { ...world, position: node.position } : world))}
              onNodeClick={(_event, node) => {
                const selectedWorld = worlds.find(({ key }) => key === Number(node.id))
                setSelectedWorldKey(Number(node.id))
                if (selectedWorld?.id.trim() && selectedWorld.id.trim() !== evaluationWorld) {
                  saveHistoryPoint()
                  setEvaluationWorld(selectedWorld.id.trim())
                }
                setResult(null)
              }}
              onConnect={connectWorlds}
              onEdgeClick={(_event, edge) => setSelectedEdgeKey(explicitKeyFromFlowEdgeId(edge.id))}
              onEdgeDoubleClick={(_event, edge) => {
                const key = explicitKeyFromFlowEdgeId(edge.id)
                if (key !== null) deleteEdge(key)
              }}
              onEdgesDelete={(deleted) => deleted.forEach(({ id }) => {
                const key = explicitKeyFromFlowEdgeId(id)
                if (key !== null) deleteEdge(key)
              })}
              onPaneClick={() => { setSelectedEdgeKey(null); setSelectedWorldKey(null) }}
              deleteKeyCode={editorMode === 'edit' ? ['Backspace', 'Delete'] : null}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              minZoom={0.35}
              maxZoom={1.8}
              colorMode="light"
            >
              <Panel position="top-left" className="map-toolbar">
                <div className="mode-switch" aria-label="Editor mode">
                  <button type="button" className={editorMode === 'edit' ? 'active' : ''} onClick={() => setEditorMode('edit')}>Edit</button>
                  <button type="button" className={editorMode === 'evaluate' ? 'active' : ''} onClick={() => setEditorMode('evaluate')}>Evaluate</button>
                </div>
                <button type="button" onClick={addWorld} disabled={editorMode !== 'edit'}>+ World</button>
                <button type="button" onClick={() => flowInstance?.fitView({ padding: .25, duration: 250 })}>Fit view</button>
                <button type="button" className={!showDerivedEdges ? 'muted' : ''} onClick={() => setShowDerivedEdges((show) => !show)}>{showDerivedEdges ? 'Hide' : 'Show'} derived</button>
                {editorMode === 'evaluate' && <button type="button" className="toolbar-verify" onClick={verify}>Verify</button>}
              </Panel>
              {worlds.length === 0 && (
                <Panel position="top-center" className="empty-graph-state">
                  <strong>Start with a world</strong><span>Then connect worlds to define accessibility.</span>
                  <button type="button" onClick={addWorld}>Add first world</button>
                </Panel>
              )}
              {selectedWorld && (
                <Panel position="bottom-left" className="world-inspector">
                  <div className="inspector-heading"><strong>{selectedWorld.id || 'Unnamed world'}</strong><button type="button" onClick={() => setSelectedWorldKey(null)} aria-label="Close world inspector">×</button></div>
                  <label><span>Name</span><input disabled={editorMode !== 'edit'} value={selectedWorld.id} onFocus={saveHistoryPoint} onChange={(event) => updateWorld(selectedWorld.key, 'id', event.target.value)} /></label>
                  <label><span>True atoms</span><input disabled={editorMode !== 'edit'} value={selectedWorld.atoms} onFocus={saveHistoryPoint} onChange={(event) => updateWorld(selectedWorld.key, 'atoms', event.target.value)} /></label>
                  <div className="inspector-actions">
                    <button type="button" onClick={() => setEvaluationWorld(selectedWorld.id.trim())} disabled={!selectedWorld.id.trim()}>Set as evaluation world</button>
                    {editorMode === 'edit' && <button type="button" className="danger" onClick={() => removeWorld(selectedWorld.key)}>Delete</button>}
                  </div>
                </Panel>
              )}
              <Background color="#b9b6aa" gap={24} size={1} />
              <MiniMap
                pannable
                zoomable
                nodeComponent={MiniMapWithRelations}
                nodeColor={(node) => node.className === 'evaluation-node' ? '#14647a' : '#a45127'}
                nodeStrokeColor="#f8f7f1"
                nodeStrokeWidth={2}
                nodeBorderRadius={50}
                maskColor="rgba(236, 233, 223, .62)"
                ariaLabel="Model overview and viewport control"
              />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          <div className="graph-toolbar">
            <button type="button" className="delete-edge-button" disabled={selectedEdgeKey === null} onClick={() => selectedEdgeKey !== null && deleteEdge(selectedEdgeKey)}>
              Delete selected edge
            </button>
          </div>
        </div>

        <div className="panel model-panel">
          <div className="panel-heading">
            <span className="step">03</span>
            <div><h2>Worlds and valuations</h2><p>Separate atoms with spaces or commas</p></div>
          </div>
          <div className="world-list">
            {worlds.length === 0 && <div className="empty-card"><strong>No worlds yet</strong><span>Add a world to start building a model.</span></div>}
            {worlds.map((world, index) => (
              <div className="world-row" key={world.key}>
                <span className="world-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <label><span>World</span><input disabled={editorMode !== 'edit'} value={world.id} onFocus={saveHistoryPoint} onChange={(event) => updateWorld(world.key, 'id', event.target.value)} /></label>
                <label className="atoms-field"><span>True atoms</span><input disabled={editorMode !== 'edit'} value={world.atoms} placeholder="p, q" onFocus={saveHistoryPoint} onChange={(event) => updateWorld(world.key, 'atoms', event.target.value)} /></label>
                <button type="button" className="remove-button" disabled={editorMode !== 'edit'} onClick={() => removeWorld(world.key)} aria-label={`Delete world ${world.id}`}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className="secondary-button" onClick={addWorld} disabled={editorMode !== 'edit'}>+ Add world</button>
        </div>

        <div className="panel edge-panel">
          <div className="panel-heading">
            <span className="step">04</span>
            <div><h2>Accessibility</h2><p>Directed edges and reflexivity</p></div>
          </div>
          <div className="edge-list">
            {edges.length === 0 && <p className="empty-state">The model has no explicit edges.</p>}
            {edges.map((edge) => (
              <div className="edge-row" key={edge.key}>
                <span className="edge-mark" aria-hidden="true">R</span>
                <select disabled={editorMode !== 'edit'} aria-label="Edge source world" value={edge.from} onFocus={saveHistoryPoint} onChange={(event) => setEdges((current) => current.map((item) => item.key === edge.key ? { ...item, from: event.target.value } : item))}>
                  <option value="">—</option>{usableWorldIds.map((id) => <option key={id}>{id}</option>)}
                </select>
                <span className="relation-arrow" aria-hidden="true">→</span>
                <select disabled={editorMode !== 'edit'} aria-label="Edge target world" value={edge.to} onFocus={saveHistoryPoint} onChange={(event) => setEdges((current) => current.map((item) => item.key === edge.key ? { ...item, to: event.target.value } : item))}>
                  <option value="">—</option>{usableWorldIds.map((id) => <option key={id}>{id}</option>)}
                </select>
                <button type="button" className="remove-button" disabled={editorMode !== 'edit'} onClick={() => deleteEdge(edge.key)} aria-label="Delete edge">×</button>
              </div>
            ))}
          </div>
          {effectiveEdges.length > edges.length && (
            <p className="derived-summary">+ {effectiveEdges.length - edges.length} edges derived from frame properties</p>
          )}
          <button type="button" className="secondary-button" onClick={addEdge} disabled={worlds.length === 0 || editorMode !== 'edit'}>+ Add edge</button>
        </div>

        <div className="panel verify-panel">
          <div className="panel-heading">
            <span className="step">05</span>
            <div><h2>Verification</h2><p>Choose an evaluation world</p></div>
          </div>
          <label className="field">
            <span>Evaluation world</span>
            <select value={evaluationWorld} onChange={(event) => { setEvaluationWorld(event.target.value); setResult(null) }}>
              <option value="">Select a world</option>{usableWorldIds.map((id) => <option key={id}>{id}</option>)}
            </select>
          </label>
          <button type="button" className="verify-button" onClick={verify}>Verify model</button>
          <div className={`result ${result?.kind ?? ''}`} aria-live="polite">
            <strong>{result?.message ?? 'The verification result will appear here.'}</strong>
            {result && 'detail' in result && <span>{result.detail}</span>}
          </div>
        </div>
      </section>

      {showHelp && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setShowHelp(false)}>
          <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-heading">
              <div><p className="eyebrow">Quick reference</p><h2 id="help-title">Help and legend</h2></div>
              <button type="button" className="dialog-close" onClick={() => setShowHelp(false)} aria-label="Close help">×</button>
            </div>
            <div className="help-grid">
              <div><h3>Build the model</h3><p>Drag worlds to move them. Drag between handles to create an accessibility edge. Click a world to make it the evaluation world.</p></div>
              <div><h3>Editor modes</h3><p>Edit mode unlocks construction tools. Evaluate mode locks the graph against accidental changes and keeps verification close at hand.</p></div>
              <div><h3>Edit and delete</h3><p>Edit names and valuations in the side panel. Double-click an explicit edge, or select it and use the delete button.</p></div>
              <div><h3>Legend</h3><p><span className="legend-swatch petrol" /> Evaluation world<br /><span className="legend-line" /> Explicit edge<br /><span className="legend-line derived" /> Edge derived from frame properties<br /><span className="legend-reflexive">↻</span> Reflexive relation wRw</p></div>
              <div><h3>Frame properties</h3><p>Reflexive, symmetric, and transitive options compute the least closure of your explicit relation. Derived edges disappear when the option is disabled.</p></div>
              <div><h3>Formula notation</h3><p>Use ¬, ∧, ∨, →, □, ◇ or the alternatives !, &amp;, |, -&gt;, box, diamond.</p></div>
              <div><h3>Storage</h3><p>Your sandbox is saved only in this browser. Reset model restores the initial example.</p></div>
              <div><h3>Workspace</h3><p>Use the top-bar controls to undo or redo model edits and collapse either side of the workspace. The map toolbar can fit the graph or hide derived edges.</p></div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
