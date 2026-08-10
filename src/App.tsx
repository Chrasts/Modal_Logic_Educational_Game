import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type WheelEvent as ReactWheelEvent } from 'react'
import {
  Background,
  ConnectionMode,
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
import { campaignTracks, legacyTutorialLevelIds, tutorialLevels, type GameLevel } from './campaign'
import { guidedCampaigns } from './guided-campaigns'
import { learnCourse, learnLessons, learnLessonByTaskId, type ConceptQuestion } from './learn'
import { emptyLearnProgress, learnProgressKey, loadLearnProgress, type LearnProgress } from './learn-progress'
import { ModalLogicWelcome } from './ModalLogicWelcome'
import { MissionHeader, type MissionHeaderMode } from './components/MissionHeader'
import { QuestionTaskPanel } from './components/QuestionTaskPanel'
import { StaticKripkeDiagram } from './components/StaticKripkeDiagram'
import { EvaluationDiagnostics, EvaluationTree, flattenEvaluationTraces } from './workspace/EvaluationTrace'
import { MobileWorkspaceTabs } from './workspace/MobileWorkspaceTabs'
import { ReflexiveRelationBadge } from './workspace/ReflexiveRelationBadge'
import { modalEdgeTypes, resolveModalEdgeEndpoints } from './workspace/ModalEdge'
import { MAP_MAX_ZOOM, MAP_MIN_ZOOM, modelMapInteractionProps, resolveMapWheelHandling } from './workspace/map-interactions'
import { buildReflexiveRelationPresentations, buildRelationPresentations, describeRelationPresentation, type RelationDirectionPresentation, type RelationPresentation } from './workspace/relation-presentation'
import { applyCollisionClassNames, commitWorldPosition, findFreeWorldPosition, findOverlappingWorldKeys, shouldCreateWorldFromPaneClick, WORLD_NODE_SIZE, type WorldPosition } from './workspace/world-placement'
import { createTidyModelLayout } from './workspace/model-layout'
import { assignRelationRouteLanes, RECIPROCAL_ARROWHEAD_SIZE, SINGLE_ARROWHEAD_SIZE, type RelationRouteItem } from './workspace/relation-routing'
import { isTextEntryTarget, resolveDeleteSelection } from './workspace/selection-keyboard'
import { deleteWorldFromEditableModel, validateEditableModel, validateExplicitEdgeCandidate, validateWorldIdCandidate } from './workspace/model-integrity'
import { WorldIdInput } from './workspace/WorldIdInput'
import { worldNodeTypes } from './workspace/WorldNode'
import { insertAtSelection } from './formula-input'
import { findFrameRuleConflicts } from './logic/frame-rule-conflicts'
import { ProgressiveHints } from './components/ProgressiveHints'
import { WorkedExampleCard } from './learn/WorkedExampleCard'
import { buildQuestionFeedback } from './learn/question-feedback'
import { playSound } from './audio/sound-effects'
import { parseCustomCampaign, serializeCustomCampaign } from './campaign-format'
import { assertCompatibleAuthoredConstraints, parseAuthoredAtoms, parseAuthoredEdges } from './author-constraints'
import { createShareUrl, readSharedJson } from './share-url'
import { createEducatorCsv } from './educator-export'
import { auditMission, type MissionAuditFinding } from './mission-audit'
import { MissionAuthorStepper } from './authoring/MissionAuthorStepper'
import { AuthorValidationSummary } from './authoring/AuthorValidationSummary'
import { useDialogFocus } from './hooks/useDialogFocus'
import { HomeView } from './app/HomeView'
import { LearnRecoveryActions } from './components/LearnRecoveryActions'
import { assertValidReferenceSolution, parseCustomLevelFile, parseCustomLevelPackage, serializeCustomLevel, type ParsedCustomLevelFile, type ReferenceSolution } from './level-format'
import {
  applyFrameProperties,
  checkConstructionConstraints,
  checkFrameProperty,
  canonicalModelSignature,
  collectAtoms,
  countConstructionChanges,
  DEFAULT_MAXIMUM_VALUATIONS,
  FormulaSyntaxError,
  parseFormula,
  verifyObjective,
  verifyConstructionObjective,
  type AccessibilityEdge,
  type FrameProperties,
  type FramePropertyName,
  type FramePropertyWitness,
  type EvaluationTrace,
  type ObjectiveScope,
  type ObjectiveVerdict,
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

interface EdgeDraft {
  readonly from: string
  readonly to: string
  readonly error?: string
}

type VerificationResult =
  | { readonly kind: 'success' | 'failure'; readonly message: string; readonly detail: string; readonly diagnostic?: string; readonly verdict?: ObjectiveVerdict; readonly bonus?: { achieved: boolean; detail: string }; readonly prediction?: { correct: boolean; detail: string } }
  | { readonly kind: 'error'; readonly message: string }
  | null

type EditorMode = 'edit' | 'evaluate'
type GameMode = 'sandbox' | 'tutorial' | 'learn' | 'campaign' | 'guidedCampaign' | 'custom'
type GuideTab = 'overview' | 'theory' | 'operators' | 'scopes' | 'relations' | 'objectives' | 'controls' | 'glossary'
type AppView = 'home' | 'practice' | 'workspace' | 'learn' | 'welcome' | 'tutorial' | 'campaigns' | 'create' | 'guide' | 'profile' | 'settings'
type CampaignSection = 'challenges' | 'practice'
type EvaluationScope = ObjectiveScope
type FrameRuleMode = 'off' | 'validate' | 'enforce'
type FrameRules = Record<FramePropertyName, FrameRuleMode>

const describeFrameWitness = (witness: FramePropertyWitness): string => {
  if (witness.kind === 'missing-reflexive') return `${witness.world} is missing its reflexive relation.`
  if (witness.kind === 'irreflexive-loop') return `${witness.world} accesses itself.`
  if (witness.kind === 'missing-successor') return `${witness.world} has no successor.`
  if (witness.kind === 'missing-symmetric') return `${witness.edge.from} → ${witness.edge.to} exists, but ${witness.missing.from} → ${witness.missing.to} is missing.`
  if (witness.kind === 'missing-transitive') return `${witness.first.from} → ${witness.first.to} → ${witness.second.to} needs ${witness.missing.from} → ${witness.missing.to}.`
  if (witness.kind === 'missing-euclidean') return `The two successors of ${witness.first.from} need ${witness.missing.from} → ${witness.missing.to}.`
  return `Directed cycle: ${witness.worlds.join(' → ')}.`
}

function handleTabListKeyDown<T extends string>(event: ReactKeyboardEvent<HTMLElement>, order: readonly T[], current: T, onChange: (next: T) => void) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const index = Math.max(0, order.indexOf(current))
  const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? order.length - 1 : event.key === 'ArrowLeft' ? (index - 1 + order.length) % order.length : (index + 1) % order.length
  onChange(order[nextIndex])
  requestAnimationFrame(() => event.currentTarget.querySelector<HTMLElement>('[role="tab"][tabindex="0"]')?.focus())
}

function ChapterRecapQuestions({ questions }: { readonly questions: readonly ConceptQuestion[] }) {
  const [answers, setAnswers] = useState<Readonly<Record<number, string>>>({})
  return <div className="concept-recap" aria-label="Concept recap questions"><strong>Concept check</strong>{questions.map((question, index) => {
    const answer = answers[index]
    const correct = answer === question.correctChoice
    return <fieldset key={question.prompt}><legend>{index + 1}. {question.prompt}</legend><div>{question.choices.map((choice) => <button type="button" className={answer === choice ? 'selected' : ''} aria-pressed={answer === choice} key={choice} onClick={() => setAnswers((current) => ({ ...current, [index]: choice }))}>{choice}</button>)}</div>{answer && <p role="status" className={correct ? 'correct' : 'incorrect'}><b>{correct ? 'Correct.' : 'Not quite.'}</b> {question.explanation}</p>}</fieldset>
  })}</div>
}

function MapControlsReference({ onReplayTour }: { readonly onReplayTour: () => void }) {
  return <>
    <article><h2>Select and edit worlds</h2><p>Click a world to select it and focus its incoming and outgoing relations. Use the model panel to rename it, change its true atoms, or make it the evaluation world when the task permits.</p></article>
    <article><h2>Add and position worlds</h2><p>Use + World for a collision-aware position near the selected world or viewport centre. On desktop, double-click empty map space to create one world without zooming. Dragging may intentionally overlap worlds; Tidy model is the explicit recovery action.</p></article>
    <article><h2>Relations</h2><p>Start dragging on the world where the arrow begins and release on its destination; any of the four connection points works and handle position does not determine direction. You can also use Accessibility. A self-loop wRw appears only as ↻ on its world: solid is explicit and dashed is derived. A two-way relation is one ↔ line; click it to expose each direction. Only explicit directions can be selected and deleted.</p></article>
    <article><h2>Move around the map</h2><p>Drag empty space to pan. A mouse wheel zooms under the pointer; two-finger touchpad scrolling pans freely in X and Y; pinch zooms. Zoom in, Zoom out, and Fit model are available in the map toolbar.</p></article>
    <article><h2>Tidy and Fit</h2><p>Tidy model organizes the explicit construction as one undoable step; enforced derived relations are redrawn over that layout. Fit model changes only the viewport and never enters model history.</p></article>
    <article className="guide-action-card"><h2>Workspace tour</h2><p>Replay the short overlay without resetting the current mission, model, or progress.</p><button type="button" className="secondary-button" onClick={onReplayTour}>Replay workspace tour</button></article>
  </>
}

function classifyObjectiveFailure(verdict: ObjectiveVerdict, scope: EvaluationScope, targetTruth: boolean, evaluationWorld: string): AttemptFailureCategory {
  const traces: EvaluationTrace[] = []
  const visit = (trace: EvaluationTrace): void => {
    traces.push(trace)
    trace.children.forEach(visit)
  }
  verdict.formula.evaluationTraces?.forEach(visit)

  if (scope === 'pointed' && verdict.formula.truthByWorld?.some(({ worldId, value }) => worldId !== evaluationWorld && value === targetTruth)) return 'wrong-world'
  const isEquivalence = verdict.formula.label.toLowerCase().includes('equivalence')
  if (!isEquivalence && traces.some(({ rule, value }) => rule === 'possibility' && !value) && targetTruth) return 'missing-diamond-witness'
  if (!isEquivalence && traces.some(({ rule, value }) => rule === 'possibility' && value) && !targetTruth) return 'unwanted-diamond-witness'
  if (!isEquivalence && traces.some(({ rule, value }) => rule === 'necessity' && !value) && targetTruth) return 'box-counterexample'
  if (!isEquivalence && traces.some(({ rule, value, children }) => rule === 'necessity' && value && children.length === 0) && !targetTruth) return 'vacuous-box'
  if (scope === 'model') return 'model-global-counterexample'
  if (scope === 'frame' && verdict.formula.witnessValuation) return 'frame-countervaluation'
  if (scope === 'frame') return 'frame-validity-quantification'
  if (scope === 'correspondence') return 'correspondence-mismatch'
  return 'objective'
}

interface ModelSnapshot {
  readonly worlds: EditableWorld[]
  readonly edges: EditableEdge[]
  readonly evaluationWorld: string
  readonly frameRules: FrameRules
}

interface ModelHistoryEntry {
  readonly snapshot: ModelSnapshot
  readonly preserveResult: boolean
}

const initialWorlds: EditableWorld[] = [
  { key: 0, id: 'w0', atoms: '', position: { x: 90, y: 110 } },
  { key: 1, id: 'w1', atoms: 'p', position: { x: 390, y: 110 } },
]

const initialEdges: EditableEdge[] = [{ key: 0, from: 'w0', to: 'w1' }]
const storageKey = 'logic-game:sandbox:v1'
const campaignProgressKey = 'logic-game:campaign-progress:v2'
const legacyCampaignProgressKey = 'logic-game:campaign-progress:v1'
const campaignContentRevisionKey = 'logic-game:campaign-content-revision:v1'
const currentCampaignContentRevision = 2
const revisedCampaignLevelIds = new Set(['tutorial-v2-valuation'])
const campaignAssistanceKey = 'logic-game:campaign-assistance:v1'
const interfaceSettingsKey = 'logic-game:interface-settings:v1'
const workspaceTourKey = 'logic-game:workspace-tour:v1'
const workspaceTourSteps = [
  { title: 'Model map', body: 'The map shows worlds, their true atoms, and directed accessibility. This is where you inspect or build the Kripke model.' },
  { title: 'Task and editing panel', body: 'The task stays above the workspace. Available editing panels expose only the controls needed for the current task.' },
  { title: 'Evaluation and results', body: 'Evaluation explains whether the target is met and can reveal world-by-world semantic evidence.' },
  { title: 'Navigating the map', body: 'Drag empty map space to pan. Double-click it to create one world without zooming. A mouse wheel zooms under the pointer; two-finger touchpad scrolling pans in both directions; pinch zooms. Tidy creates a compact structural layout; Fit changes only the viewport.', mobileBody: 'Drag empty map space or use a two-finger gesture to pan, and pinch to zoom. Zoom and Fit model remain available in the map toolbar. On mobile, switch between the Model, Formula, and Result tabs.' },
] as const
type InterfaceDensity = 'comfortable' | 'compact'
interface InterfaceSettings { readonly density: InterfaceDensity; readonly showMinimap: boolean; readonly showDerivedEdges: boolean; readonly reduceMotion: boolean; readonly soundEffects: boolean; readonly leftPanelOpen: boolean; readonly rightPanelOpen: boolean }
const defaultInterfaceSettings: InterfaceSettings = { density: 'comfortable', showMinimap: true, showDerivedEdges: true, reduceMotion: false, soundEffects: false, leftPanelOpen: true, rightPanelOpen: true }
const loadInterfaceSettings = (): InterfaceSettings => {
  try {
    const stored = JSON.parse(localStorage.getItem(interfaceSettingsKey) ?? 'null') as Partial<InterfaceSettings> | null
    return stored ? {
      density: stored.density === 'compact' ? 'compact' : 'comfortable',
      showMinimap: stored.showMinimap !== false,
      showDerivedEdges: stored.showDerivedEdges !== false,
      reduceMotion: stored.reduceMotion === true,
      soundEffects: stored.soundEffects === true,
      leftPanelOpen: stored.leftPanelOpen !== false,
      rightPanelOpen: stored.rightPanelOpen !== false,
    } : defaultInterfaceSettings
  } catch { return defaultInterfaceSettings }
}
const explicitKeyFromFlowEdgeId = (id: string) => id.startsWith('explicit:') ? Number(id.slice(9)) : null
const defaultFrameRules: FrameRules = {
  reflexive: 'off',
  symmetric: 'off',
  transitive: 'off',
  euclidean: 'off',
  serial: 'off',
  irreflexive: 'off',
  acyclic: 'off',
}

interface AuthorStartSnapshot extends ModelSnapshot {
  readonly formulaSource: string
  readonly comparisonFormulaSource: string
  readonly targetTruth: boolean
  readonly evaluationScope: EvaluationScope
  readonly selectedCorrespondence: string
}
const levelPropertyNames = Object.keys(defaultFrameRules) as FramePropertyName[]

const correspondencePresets = [
  { id: 't', name: 'T — Reflexivity', formula: '□p → p', property: 'reflexive' as const },
  { id: 'd', name: 'D — Seriality', formula: '□p → ◇p', property: 'serial' as const },
  { id: 'b', name: 'B — Symmetry', formula: 'p → □◇p', property: 'symmetric' as const },
  { id: '4', name: '4 — Transitivity', formula: '□p → □□p', property: 'transitive' as const },
  { id: '5', name: '5 — Euclidean', formula: '◇p → □◇p', property: 'euclidean' as const },
]

interface SandboxDraft {
  readonly formulaSource: string
  readonly comparisonFormulaSource?: string
  readonly worlds: EditableWorld[]
  readonly edges: EditableEdge[]
  readonly evaluationWorld: string
  readonly targetTruth: boolean
  readonly frameProperties?: FrameProperties
  readonly frameRules?: FrameRules
  readonly evaluationScope?: EvaluationScope | 'world'
}

function loadDraft(): SandboxDraft | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const draft = JSON.parse(raw) as Partial<SandboxDraft>
    if (typeof draft.formulaSource !== 'string' || !Array.isArray(draft.worlds) || !Array.isArray(draft.edges)
      || typeof draft.evaluationWorld !== 'string' || typeof draft.targetTruth !== 'boolean') return null
    if (draft.worlds.some((world) => !world || typeof world !== 'object' || typeof world.id !== 'string' || typeof world.atoms !== 'string')) return null
    if (draft.edges.some((edge) => !edge || typeof edge !== 'object' || typeof edge.from !== 'string' || typeof edge.to !== 'string')) return null
    const normalizedWorlds = draft.worlds.map((world, index) => ({
      ...world,
      key: index,
      position: world.position && typeof world.position.x === 'number' && typeof world.position.y === 'number'
        ? world.position
        : { x: 90 + (index % 3) * 240, y: 90 + Math.floor(index / 3) * 150 },
    }))
    const normalizedIds = normalizedWorlds.map((world) => world.id.trim())
    if (normalizedIds.some((id) => !id) || new Set(normalizedIds).size !== normalizedIds.length) return null
    const worldIds = new Set(normalizedIds)
    const validRuleModes = new Set<FrameRuleMode>(['off', 'validate', 'enforce'])
    const enforceableRules = new Set(['reflexive', 'symmetric', 'transitive', 'euclidean'])
    const normalizedFrameRules = Object.fromEntries(Object.entries(draft.frameRules ?? {})
      .filter(([property, mode]) => property in defaultFrameRules && validRuleModes.has(mode as FrameRuleMode))
      .map(([property, mode]) => [property, mode === 'enforce' && !enforceableRules.has(property) ? 'validate' : mode])) as Partial<FrameRules>
    const validScopes = new Set(['pointed', 'model', 'frame', 'correspondence', 'world'])
    const normalizedEdges = draft.edges.filter((edge) => worldIds.has(edge.from.trim()) && worldIds.has(edge.to.trim()))
      .map((edge, index) => ({ ...edge, from: edge.from.trim(), to: edge.to.trim(), key: index }))
    if (validateEditableModel(normalizedWorlds, normalizedEdges).length > 0) return null
    return {
      ...draft,
      worlds: normalizedWorlds,
      edges: normalizedEdges,
      evaluationWorld: worldIds.has(draft.evaluationWorld.trim()) ? draft.evaluationWorld.trim() : normalizedIds[0] ?? '',
      frameRules: { ...defaultFrameRules, ...normalizedFrameRules },
      evaluationScope: typeof draft.evaluationScope === 'string' && validScopes.has(draft.evaluationScope)
        ? draft.evaluationScope as SandboxDraft['evaluationScope']
        : 'pointed',
    } as SandboxDraft
  } catch {
    return null
  }
}

interface HistoryEntry {
  readonly id: string
  readonly timestamp: string
  readonly mode: GameMode
  readonly levelId?: string
  readonly title: string
  readonly scope: EvaluationScope
  readonly success: boolean
  readonly worldCount: number
  readonly edgeCount: number
  readonly trueAtomCount?: number
  readonly semanticChanges?: number
  readonly bonusAchieved?: boolean
  readonly concept?: string
  readonly failureCategory?: AttemptFailureCategory
}

type AttemptFailureCategory = 'missing-answer' | 'construction' | 'frame-configuration' | 'frame-property' | 'objective' | 'required-answer' | 'syntax-or-model' | 'wrong-world' | 'missing-diamond-witness' | 'unwanted-diamond-witness' | 'box-counterexample' | 'vacuous-box' | 'model-global-counterexample' | 'frame-countervaluation' | 'frame-validity-quantification' | 'correspondence-mismatch'

const failureCategoryLabels: Readonly<Record<AttemptFailureCategory, string>> = {
  'missing-answer': 'Missing required answer',
  construction: 'Construction constraint',
  'frame-configuration': 'Frame-rule configuration',
  'frame-property': 'Relational property',
  objective: 'Semantic objective',
  'required-answer': 'Incorrect required answer',
  'syntax-or-model': 'Syntax or model data',
  'wrong-world': 'Truth at the wrong world',
  'missing-diamond-witness': 'Missing witness for diamond',
  'unwanted-diamond-witness': 'Unexpected witness for diamond',
  'box-counterexample': 'Counterexample successor for box',
  'vacuous-box': 'Vacuous truth of box',
  'model-global-counterexample': 'Model-global counterexample',
  'frame-countervaluation': 'Frame countervaluation',
  'frame-validity-quantification': 'All-valuations frame validity',
  'correspondence-mismatch': 'Formula/property mismatch',
}

interface GuestProfile {
  readonly id: string
  readonly createdAt: string
  readonly history: readonly HistoryEntry[]
  readonly solutionSignatures: Readonly<Record<string, readonly string[]>>
}

const guestProfileKey = 'logic-game:guest-profile:v1'
const createLocalId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

function loadGuestProfile(): GuestProfile {
  try {
    const stored = JSON.parse(localStorage.getItem(guestProfileKey) ?? 'null') as Partial<GuestProfile> | null
    if (!stored || typeof stored.id !== 'string' || typeof stored.createdAt !== 'string' || !Array.isArray(stored.history)) throw new Error('Invalid guest profile')
    return {
      id: stored.id,
      createdAt: stored.createdAt,
      history: stored.history.filter((entry): entry is HistoryEntry => Boolean(entry && typeof entry.id === 'string' && typeof entry.timestamp === 'string' && typeof entry.title === 'string' && typeof entry.success === 'boolean')).slice(0, 250),
      solutionSignatures: stored.solutionSignatures && typeof stored.solutionSignatures === 'object'
        ? Object.fromEntries(Object.entries(stored.solutionSignatures).filter(([, signatures]) => Array.isArray(signatures)).map(([levelId, signatures]) => [levelId, [...new Set((signatures as unknown[]).filter((signature): signature is string => typeof signature === 'string'))].slice(0, 25)]))
        : {},
    }
  } catch {
    return { id: createLocalId(), createdAt: new Date().toISOString(), history: [], solutionSignatures: {} }
  }
}

function loadCampaignProgress(): ReadonlySet<string> {
  try {
    const stored = JSON.parse(localStorage.getItem(campaignProgressKey) ?? localStorage.getItem(legacyCampaignProgressKey) ?? '[]')
    const storedContentRevision = Number(localStorage.getItem(campaignContentRevisionKey) ?? 1)
    const knownIds = new Set([...tutorialLevels, ...campaignTracks.flatMap((track) => track.levels), ...guidedCampaigns.flatMap((campaign) => campaign.levels)].map((level) => level.id))
    const legacyTutorialIds = new Set<string>(legacyTutorialLevelIds)
    // Old semantic tutorial completions have no safe one-to-one mapping to the
    // six interaction steps. Content revisions reopen only materially changed IDs.
    const migrated = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string'
      && !legacyTutorialIds.has(id)
      && knownIds.has(id)
      && (storedContentRevision >= currentCampaignContentRevision || !revisedCampaignLevelIds.has(id))) : []
    localStorage.setItem(campaignContentRevisionKey, String(currentCampaignContentRevision))
    return new Set(migrated)
  } catch {
    return new Set()
  }
}

function loadCampaignAssistance(): ReadonlySet<string> {
  try {
    const stored = JSON.parse(localStorage.getItem(campaignAssistanceKey) ?? '[]')
    return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [])
  } catch { return new Set() }
}

export function App({ initialView = 'home' }: { readonly initialView?: AppView } = {}) {
  const [initialDraft] = useState(loadDraft)
  const [initialInterfaceSettings] = useState(loadInterfaceSettings)
  const [gameMode, setGameMode] = useState<GameMode>('sandbox')
  const [learnProgress, setLearnProgress] = useState<LearnProgress>(loadLearnProgress)
  const [learnHintLevel, setLearnHintLevel] = useState(0)
  const [learnTransferActive, setLearnTransferActive] = useState(false)
  const [learnConceptOpen, setLearnConceptOpen] = useState(false)
  const [expandedLearnChapterId, setExpandedLearnChapterId] = useState<string | null>(null)
  const [utilityMenuOpen, setUtilityMenuOpen] = useState(false)
  const utilityMenuRef = useRef<HTMLDivElement>(null)
  const utilityMenuButtonRef = useRef<HTMLButtonElement>(null)
  const formulaInputRef = useRef<HTMLInputElement>(null)
  const verificationResultRef = useRef<HTMLDivElement>(null)
  const [customLevels, setCustomLevels] = useState<readonly GameLevel[]>([])
  const [customCampaignTitle, setCustomCampaignTitle] = useState('Custom campaign')
  const [customCampaignDescription, setCustomCampaignDescription] = useState('A user-authored sequence of modal logic missions.')
  const [authoredCampaignMissions, setAuthoredCampaignMissions] = useState<readonly ParsedCustomLevelFile[]>([])
  const [appView, setAppView] = useState<AppView>(initialView)
  const [campaignSection, setCampaignSection] = useState<CampaignSection>('challenges')
  const [campaignLevelIndex, setCampaignLevelIndex] = useState(0)
  const [campaignTrackIndex, setCampaignTrackIndex] = useState(0)
  const [playingTrackIndex, setPlayingTrackIndex] = useState<number | null>(null)
  const [guidedCampaignIndex, setGuidedCampaignIndex] = useState(0)
  const [guidedHintLevel, setGuidedHintLevel] = useState(0)
  const [referenceSolutionViewed, setReferenceSolutionViewed] = useState<ReadonlySet<string>>(loadCampaignAssistance)
  const [completedLevelIds, setCompletedLevelIds] = useState<ReadonlySet<string>>(loadCampaignProgress)
  const [guestProfile, setGuestProfile] = useState<GuestProfile>(loadGuestProfile)
  const [formulaSource, setFormulaSource] = useState(initialDraft?.formulaSource ?? '◇p')
  const [comparisonFormulaSource, setComparisonFormulaSource] = useState(initialDraft?.comparisonFormulaSource ?? '')
  const [worlds, setWorlds] = useState(initialDraft?.worlds ?? initialWorlds)
  const [edges, setEdges] = useState(initialDraft?.edges ?? initialEdges)
  const [edgeDraft, setEdgeDraft] = useState<EdgeDraft | null>(null)
  const [edgeEditErrors, setEdgeEditErrors] = useState<Readonly<Record<number, string>>>({})
  const [evaluationWorld, setEvaluationWorld] = useState(initialDraft?.evaluationWorld ?? 'w0')
  const [targetTruth, setTargetTruth] = useState(initialDraft?.targetTruth ?? true)
  const [evaluationScope, setEvaluationScope] = useState<EvaluationScope>(
    initialDraft?.evaluationScope === 'world' ? 'pointed' : initialDraft?.evaluationScope ?? 'pointed',
  )
  const [frameRules, setFrameRules] = useState<FrameRules>(() => {
    if (initialDraft?.frameRules) return { ...defaultFrameRules, ...initialDraft.frameRules }
    const legacy = initialDraft?.frameProperties
    return legacy ? {
      ...defaultFrameRules,
      reflexive: legacy.reflexive ? 'enforce' : 'off',
      symmetric: legacy.symmetric ? 'enforce' : 'off',
      transitive: legacy.transitive ? 'enforce' : 'off',
      euclidean: legacy.euclidean ? 'enforce' : 'off',
    } : defaultFrameRules
  })
  const [result, setResult] = useState<VerificationResult>(null)
  const [predictionAnswer, setPredictionAnswer] = useState('')
  const [traceStepIndex, setTraceStepIndex] = useState(0)
  const [levelTitle, setLevelTitle] = useState('My custom mission')
  const [levelInstruction, setLevelInstruction] = useState('Satisfy the configured objective.')
  const [levelLearningObjective, setLevelLearningObjective] = useState('Explore this modal construction.')
  const [levelConcept, setLevelConcept] = useState('User-authored modal logic objective')
  const [levelPrerequisites, setLevelPrerequisites] = useState('propositional connectives')
  const [levelDifficulty, setLevelDifficulty] = useState<NonNullable<GameLevel['estimatedDifficulty']>>('introductory')
  const [authorTemplateId, setAuthorTemplateId] = useState(tutorialLevels[0]?.id ?? '')
  const [authorPreview, setAuthorPreview] = useState<'desktop' | 'mobile'>('desktop')
  const [levelEditable, setLevelEditable] = useState<ReadonlySet<string>>(new Set(['worlds', 'valuations', 'edges', 'constraints', 'evaluation']))
  const [levelBounds, setLevelBounds] = useState({ minimumWorlds: '', maximumWorlds: '', minimumEdges: '', maximumEdges: '', maximumChanges: '' })
  const [levelRequiredProperties, setLevelRequiredProperties] = useState<ReadonlySet<FramePropertyName>>(new Set())
  const [levelForbiddenProperties, setLevelForbiddenProperties] = useState<ReadonlySet<FramePropertyName>>(new Set())
  const [levelPredictionKind, setLevelPredictionKind] = useState<'none' | 'truth' | 'counterexample-world' | 'frame-property'>('none')
  const [levelPredictionProperty, setLevelPredictionProperty] = useState<FramePropertyName>('reflexive')
  const [levelBonusMaximumEdges, setLevelBonusMaximumEdges] = useState('')
  const [levelRequiredEdges, setLevelRequiredEdges] = useState('')
  const [levelForbiddenEdges, setLevelForbiddenEdges] = useState('')
  const [levelRequiredAtoms, setLevelRequiredAtoms] = useState('')
  const [levelForbiddenAtoms, setLevelForbiddenAtoms] = useState('')
  const [levelStartSnapshot, setLevelStartSnapshot] = useState<AuthorStartSnapshot | null>(null)
  const [levelReferenceSolution, setLevelReferenceSolution] = useState<ReferenceSolution | null>(null)
  const [missionAuditFindings, setMissionAuditFindings] = useState<readonly MissionAuditFinding[]>([])
  const [authorStep, setAuthorStep] = useState(1)
  const [visitedAuthorSteps, setVisitedAuthorSteps] = useState<ReadonlySet<number>>(new Set([1]))
  const [authorStepErrors, setAuthorStepErrors] = useState<readonly string[]>([])

  useEffect(() => {
    if (evaluationScope !== 'model' && levelPredictionKind === 'counterexample-world') setLevelPredictionKind('none')
  }, [evaluationScope, levelPredictionKind])
  useEffect(() => {
    if (appView === 'workspace' && !learnConceptOpen && localStorage.getItem(workspaceTourKey) !== 'seen') {
      setWorkspaceTourStep(0)
      setShowWorkspaceTour(true)
    }
  }, [appView, learnConceptOpen])
  const [nextWorldKey, setNextWorldKey] = useState(() => Math.max(-1, ...worlds.map(({ key }) => key)) + 1)
  const [nextEdgeKey, setNextEdgeKey] = useState(() => Math.max(-1, ...edges.map(({ key }) => key)) + 1)
  const [selectedEdgeKey, setSelectedEdgeKey] = useState<number | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showDataManager, setShowDataManager] = useState(false)
  const [importSource, setImportSource] = useState('')
  const [dataMessage, setDataMessage] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [completionDismissed, setCompletionDismissed] = useState(false)
  const [guideTab, setGuideTab] = useState<GuideTab>('overview')
  const [showFrameRules, setShowFrameRules] = useState(false)
  const [selectedCorrespondence, setSelectedCorrespondence] = useState('')
  const [editorMode, setEditorMode] = useState<EditorMode>('edit')
  const [modelView, setModelView] = useState<'graph' | 'table'>('graph')
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState<'model' | 'formula' | 'result'>('model')
  const [showDerivedEdges, setShowDerivedEdges] = useState(initialInterfaceSettings.showDerivedEdges)
  const [showMinimap, setShowMinimap] = useState(initialInterfaceSettings.showMinimap)
  const [interfaceDensity, setInterfaceDensity] = useState<InterfaceDensity>(initialInterfaceSettings.density)
  const [reduceMotion, setReduceMotion] = useState(initialInterfaceSettings.reduceMotion)
  const [soundEffects, setSoundEffects] = useState(initialInterfaceSettings.soundEffects)
  const [leftPanelOpen, setLeftPanelOpen] = useState(initialInterfaceSettings.leftPanelOpen)
  const [rightPanelOpen, setRightPanelOpen] = useState(initialInterfaceSettings.rightPanelOpen)
  const resetInterfacePreferences = () => {
    setInterfaceDensity(defaultInterfaceSettings.density)
    setShowMinimap(defaultInterfaceSettings.showMinimap)
    setShowDerivedEdges(defaultInterfaceSettings.showDerivedEdges)
    setReduceMotion(defaultInterfaceSettings.reduceMotion)
    setSoundEffects(defaultInterfaceSettings.soundEffects)
    setLeftPanelOpen(defaultInterfaceSettings.leftPanelOpen)
    setRightPanelOpen(defaultInterfaceSettings.rightPanelOpen)
    try { localStorage.removeItem(interfaceSettingsKey) } catch { /* Preferences remain reset in memory. */ }
  }
  const [showWorkspaceTour, setShowWorkspaceTour] = useState(() => initialView === 'workspace' && localStorage.getItem(workspaceTourKey) !== 'seen')
  const [workspaceTourStep, setWorkspaceTourStep] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))
  const [selectedWorldKey, setSelectedWorldKey] = useState<number | null>(null)
  const [workspaceStatus, setWorkspaceStatus] = useState('')
  const [activeFrameWitness, setActiveFrameWitness] = useState<FramePropertyWitness | null>(null)
  const [hoveredWorldKey, setHoveredWorldKey] = useState<number | null>(null)
  const [collidingWorldKeys, setCollidingWorldKeys] = useState<ReadonlySet<number>>(new Set())
  const [expandedRelationPairKey, setExpandedRelationPairKey] = useState<string | null>(null)
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null)
  const graphCanvasRef = useRef<HTMLDivElement>(null)
  const historyPast = useRef<ModelHistoryEntry[]>([])
  const historyFuture = useRef<ModelHistoryEntry[]>([])
  const sandboxBeforeCampaign = useRef<SandboxDraft | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)

  const currentSnapshot = (): ModelSnapshot => ({
    worlds: structuredClone(worlds),
    edges: structuredClone(edges),
    evaluationWorld,
    frameRules: { ...frameRules },
  })

  const saveHistoryPoint = (preserveResultOrEvent?: unknown) => {
    const preserveResult = preserveResultOrEvent === true
    historyPast.current.push({ snapshot: currentSnapshot(), preserveResult })
    if (historyPast.current.length > 50) historyPast.current.shift()
    historyFuture.current = []
    setHistoryVersion((version) => version + 1)
  }

  const restoreSnapshot = (snapshot: ModelSnapshot, preserveResult = false) => {
    setWorlds(structuredClone(snapshot.worlds))
    setEdges(structuredClone(snapshot.edges))
    setEvaluationWorld(snapshot.evaluationWorld)
    setFrameRules({ ...snapshot.frameRules })
    setSelectedWorldKey(null)
    setSelectedEdgeKey(null)
    setExpandedRelationPairKey(null)
    setEdgeDraft(null)
    setEdgeEditErrors({})
    setActiveFrameWitness(null)
    setWorkspaceStatus('')
    setEdgeDraft(null)
    if (!preserveResult) setResult(null)
  }

  const clearGraphSelection = () => { setSelectedWorldKey(null); setSelectedEdgeKey(null); setExpandedRelationPairKey(null) }
  const selectWorld = (key: number) => { setSelectedWorldKey(key); setSelectedEdgeKey(null); setExpandedRelationPairKey(null) }
  const selectExplicitEdge = (key: number | null) => { setSelectedWorldKey(null); setSelectedEdgeKey(key); setExpandedRelationPairKey(null) }
  const selectReciprocalPair = (pairKey: string) => { setSelectedWorldKey(null); setSelectedEdgeKey(null); setExpandedRelationPairKey(pairKey) }

  const undo = () => {
    const previous = historyPast.current.pop()
    if (!previous) return
    historyFuture.current.push({ snapshot: currentSnapshot(), preserveResult: previous.preserveResult })
    restoreSnapshot(previous.snapshot, previous.preserveResult)
    setHistoryVersion((version) => version + 1)
  }

  const redo = () => {
    const next = historyFuture.current.pop()
    if (!next) return
    historyPast.current.push({ snapshot: currentSnapshot(), preserveResult: next.preserveResult })
    restoreSnapshot(next.snapshot, next.preserveResult)
    setHistoryVersion((version) => version + 1)
  }

  useEffect(() => {
    const updateFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', updateFullscreenState)
    return () => document.removeEventListener('fullscreenchange', updateFullscreenState)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      // Browsers may reject fullscreen when it is blocked by policy or embedding.
    }
  }

  useEffect(() => {
    if (gameMode !== 'sandbox') return
    const draft: SandboxDraft = { formulaSource, comparisonFormulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope }
    try { localStorage.setItem(storageKey, JSON.stringify(draft)) } catch { /* Persistence is optional in restricted browsers. */ }
  }, [formulaSource, comparisonFormulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope, gameMode])

  useEffect(() => {
    try { localStorage.setItem(campaignProgressKey, JSON.stringify([...completedLevelIds])) } catch { /* Progress remains available for this session. */ }
  }, [completedLevelIds])
  useEffect(() => {
    try { localStorage.setItem(campaignAssistanceKey, JSON.stringify([...referenceSolutionViewed])) } catch { /* Assistance state remains available for this session. */ }
  }, [referenceSolutionViewed])

  useEffect(() => {
    try { localStorage.setItem(learnProgressKey, JSON.stringify(learnProgress)) } catch { /* Course progress remains available for this session. */ }
  }, [learnProgress])

  useEffect(() => {
    try { localStorage.setItem(guestProfileKey, JSON.stringify(guestProfile)) } catch { /* History remains available for this session. */ }
  }, [guestProfile])

  useEffect(() => {
    if (gameMode !== 'sandbox') return
    const settings: InterfaceSettings = { density: interfaceDensity, showMinimap, showDerivedEdges, reduceMotion, soundEffects, leftPanelOpen, rightPanelOpen }
    try { localStorage.setItem(interfaceSettingsKey, JSON.stringify(settings)) } catch { /* Preferences remain available for this session. */ }
  }, [interfaceDensity, showMinimap, showDerivedEdges, reduceMotion, soundEffects, leftPanelOpen, rightPanelOpen, gameMode])

  useEffect(() => {
    if (!showHelp && !showFrameRules && !showDataManager) return
    const closeDialog = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setShowHelp(false)
      setShowFrameRules(false)
      setShowDataManager(false)
    }
    window.addEventListener('keydown', closeDialog)
    return () => window.removeEventListener('keydown', closeDialog)
  }, [showHelp, showFrameRules, showDataManager])

  useEffect(() => {
    const closeUtilityMenu = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !utilityMenuOpen) return
      setUtilityMenuOpen(false)
      utilityMenuButtonRef.current?.focus()
    }
    window.addEventListener('keydown', closeUtilityMenu)
    return () => window.removeEventListener('keydown', closeUtilityMenu)
  }, [utilityMenuOpen])

  useEffect(() => {
    if (!utilityMenuOpen) return
    utilityMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }, [utilityMenuOpen])

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (utilityMenuRef.current && !utilityMenuRef.current.contains(event.target as Node)) setUtilityMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  const usableWorldIds = useMemo(() => worlds.map(({ id }) => id.trim()), [worlds])

  const effectiveEdges = useMemo(
    () => applyFrameProperties(usableWorldIds, edges, {
      reflexive: frameRules.reflexive === 'enforce',
      symmetric: frameRules.symmetric === 'enforce',
      transitive: frameRules.transitive === 'enforce',
      euclidean: frameRules.euclidean === 'enforce',
    }),
    [usableWorldIds, edges, frameRules],
  )

  const frameRuleResults = useMemo(
    () => Object.entries(frameRules)
      .filter(([, mode]) => mode !== 'off')
      .map(([property]) => checkFrameProperty(usableWorldIds, effectiveEdges, property as FramePropertyName)),
    [frameRules, usableWorldIds, effectiveEdges],
  )
  const frameRuleConflicts = useMemo(() => findFrameRuleConflicts(frameRules, usableWorldIds.length), [frameRules, usableWorldIds.length])

  useEffect(() => { setActiveFrameWitness(null) }, [worlds, edges, evaluationWorld, frameRules])

  const explicitEdgeKeyByPair = useMemo(
    () => new Map(edges.map((edge) => [`${edge.from}\u0000${edge.to}`, edge.key])),
    [edges],
  )

  const evaluationTraceSteps = result && 'verdict' in result && result.verdict
    ? flattenEvaluationTraces([result.verdict.formula, result.verdict.relation, result.verdict.correspondence]
      .filter(Boolean).flatMap((section) => section?.evaluationTraces ?? []))
    : []
  const activeTraceEntry = evaluationTraceSteps[Math.min(traceStepIndex, Math.max(0, evaluationTraceSteps.length - 1))]
  const activeTrace = activeTraceEntry?.trace
  const traceWitnessWorld = activeTrace?.rule === 'possibility' && activeTrace.value
    ? activeTrace.children.find(({ value }) => value)?.worldId
    : undefined
  const traceCounterexampleWorld = activeTrace?.rule === 'necessity' && !activeTrace.value
    ? activeTrace.children.find(({ value }) => !value)?.worldId
    : undefined
  const traceRelatedWorlds = useMemo(() => new Set([
    activeTrace?.worldId,
    activeTraceEntry?.parent?.worldId,
    ...(activeTrace?.children.map(({ worldId }) => worldId) ?? []),
  ].filter((id): id is string => Boolean(id))), [activeTrace, activeTraceEntry?.parent])
  const traceCheckedEdges = useMemo(() => new Set([
    ...(activeTrace?.children.map(({ worldId }) => `${activeTrace.worldId}\u0000${worldId}`) ?? []),
    ...(activeTraceEntry?.parent && (activeTraceEntry.parent.rule === 'necessity' || activeTraceEntry.parent.rule === 'possibility')
      ? [`${activeTraceEntry.parent.worldId}\u0000${activeTrace?.worldId}`]
      : []),
  ]), [activeTrace, activeTraceEntry?.parent])
  const derivedPairKeys = useMemo(() => new Set(effectiveEdges
    .map(({ from, to }) => `${from}\u0000${to}`)
    .filter((pair) => !explicitEdgeKeyByPair.has(pair))), [effectiveEdges, explicitEdgeKeyByPair])
  const displayedEdges = useMemo(
    () => showDerivedEdges
      ? effectiveEdges
      : effectiveEdges.filter((edge) => {
        const pair = `${edge.from}\u0000${edge.to}`
        return explicitEdgeKeyByPair.has(pair) || traceCheckedEdges.has(pair)
      }),
    [effectiveEdges, explicitEdgeKeyByPair, showDerivedEdges, traceCheckedEdges],
  )
  const traceForcedDerivedPairKeys = useMemo(() => new Set([...traceCheckedEdges].filter((pair) => !showDerivedEdges && derivedPairKeys.has(pair))), [derivedPairKeys, showDerivedEdges, traceCheckedEdges])
  const reflexiveRelations = useMemo(
    () => buildReflexiveRelationPresentations(displayedEdges, explicitEdgeKeyByPair),
    [displayedEdges, explicitEdgeKeyByPair],
  )

  const activeMapLevel = gameMode === 'tutorial' ? tutorialLevels[campaignLevelIndex]
    : gameMode === 'learn' ? (learnTransferActive ? learnLessons[campaignLevelIndex]?.transferTask : undefined) ?? learnLessons[campaignLevelIndex]?.task
      : gameMode === 'campaign' ? campaignTracks[playingTrackIndex ?? campaignTrackIndex]?.levels[campaignLevelIndex]
        : gameMode === 'guidedCampaign' ? guidedCampaigns[guidedCampaignIndex]?.levels[campaignLevelIndex]
          : gameMode === 'custom' ? customLevels[campaignLevelIndex] : undefined
  const mapQuestionMode = activeMapLevel?.interactionMode === 'question'
  const graphEdgesEditable = !mapQuestionMode
    && editorMode === 'edit'
    && !(activeMapLevel && learnLessonByTaskId.has(activeMapLevel.id) && result?.kind === 'success')
    && (!activeMapLevel || activeMapLevel.editable.includes('edges'))
  const focusedWorldKey = hoveredWorldKey ?? selectedWorldKey
  const focusedWorldId = worlds.find((world) => world.key === focusedWorldKey)?.id.trim()
  const frameWitnessPresentation = useMemo(() => {
    const worldIds = new Set<string>()
    const premiseEdges = new Set<string>()
    let missingEdge: AccessibilityEdge | null = null
    const addEdge = (edge: AccessibilityEdge) => { worldIds.add(edge.from); worldIds.add(edge.to); premiseEdges.add(`${edge.from}\u0000${edge.to}`) }
    const witness = activeFrameWitness
    if (!witness) return { worldIds, premiseEdges, missingEdge }
    if (witness.kind === 'missing-reflexive' || witness.kind === 'irreflexive-loop' || witness.kind === 'missing-successor') worldIds.add(witness.world)
    else if (witness.kind === 'missing-symmetric') { addEdge(witness.edge); missingEdge = witness.missing }
    else if (witness.kind === 'missing-transitive' || witness.kind === 'missing-euclidean') { addEdge(witness.first); addEdge(witness.second); missingEdge = witness.missing }
    else witness.worlds.forEach((world, index) => { worldIds.add(world); if (index < witness.worlds.length - 1) premiseEdges.add(`${world}\u0000${witness.worlds[index + 1]}`) })
    if (missingEdge) { worldIds.add(missingEdge.from); worldIds.add(missingEdge.to) }
    return { worldIds, premiseEdges, missingEdge }
  }, [activeFrameWitness])

  const nodeBlueprints = useMemo<FlowNode[]>(() => worlds.map((world) => ({
    id: String(world.key),
    type: 'world',
    position: world.position,
    data: {
      isEvaluation: world.id.trim() === evaluationWorld,
      label: (
        <div className="node-label">
          <strong>{world.id || 'unnamed'}</strong>
          <span>{world.atoms.trim() || '∅'}</span>
          {(() => {
            const reflexive = reflexiveRelations.get(world.id.trim())
            if (!reflexive) return null
            const selected = reflexive.explicitKey !== undefined && reflexive.explicitKey === selectedEdgeKey
            const checked = traceCheckedEdges.has(`${world.id.trim()}\u0000${world.id.trim()}`)
            return <ReflexiveRelationBadge presentation={reflexive} selected={selected} checked={checked} editable={graphEdgesEditable} onSelect={selectExplicitEdge} />
          })()}
          {activeFrameWitness?.kind === 'missing-reflexive' && activeFrameWitness.world === world.id.trim() && <span className="frame-witness-ghost-reflexive" title="Missing for reflexivity">↻</span>}
          {activeTrace?.rule === 'atom' && activeTrace.worldId === world.id.trim() && <span className="trace-atom-badge">ATOM {activeTrace.formula} {activeTrace.value ? '✓' : '✕'}</span>}
          {world.id.trim() === traceWitnessWorld && <span className="trace-role-badge witness">WITNESS</span>}
          {world.id.trim() === traceCounterexampleWorld && <span className="trace-role-badge counterexample">COUNTEREXAMPLE</span>}
        </div>
      ),
    },
    className: [
      world.id.trim() === evaluationWorld ? 'evaluation-node' : '',
      world.key === selectedWorldKey ? 'selected-world-node' : '',
      mapQuestionMode && predictionAnswer === world.id.trim() ? 'question-answer-node' : '',
      world.id.trim() === activeTrace?.worldId ? 'trace-current-node' : '',
      world.id.trim() === traceWitnessWorld ? 'trace-witness-node' : '',
      world.id.trim() === traceCounterexampleWorld ? 'trace-counterexample-node' : '',
      activeTrace && !traceRelatedWorlds.has(world.id.trim()) ? 'trace-irrelevant-node' : '',
      frameWitnessPresentation.worldIds.has(world.id.trim()) ? 'frame-witness-node' : '',
    ].filter(Boolean).join(' '),
    ariaLabel: `${mapQuestionMode ? 'Answer option, ' : ''}World ${world.id || 'without a name'}, atoms ${world.atoms || 'none'}${reflexiveRelations.has(world.id.trim()) ? `, ${reflexiveRelations.get(world.id.trim())?.derived ? 'derived' : 'explicit'} reflexive accessibility` : ''}${mapQuestionMode && predictionAnswer === world.id.trim() ? ', selected' : ''}`,
    domAttributes: mapQuestionMode ? { 'aria-pressed': predictionAnswer === world.id.trim() } : undefined,
  })), [worlds, evaluationWorld, selectedWorldKey, selectedEdgeKey, reflexiveRelations, graphEdgesEditable, traceCheckedEdges, activeTrace, traceWitnessWorld, traceCounterexampleWorld, traceRelatedWorlds, mapQuestionMode, predictionAnswer, activeFrameWitness, frameWitnessPresentation.worldIds])

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodeBlueprints)

  useEffect(() => {
    setFlowNodes(nodeBlueprints)
  }, [nodeBlueprints, setFlowNodes])

  useEffect(() => {
    setFlowNodes((current) => applyCollisionClassNames(current, collidingWorldKeys) as FlowNode[])
  }, [collidingWorldKeys, setFlowNodes])

  const worldKeyById = useMemo(
    () => new Map(worlds.map((world) => [world.id.trim(), String(world.key)])),
    [worlds],
  )

  const relationPresentations = useMemo(
    () => buildRelationPresentations(displayedEdges, explicitEdgeKeyByPair),
    [displayedEdges, explicitEdgeKeyByPair],
  )

  useEffect(() => {
    if (expandedRelationPairKey && !relationPresentations.some(({ pairKey, kind }) => kind === 'bidirectional' && pairKey === expandedRelationPairKey)) {
      setExpandedRelationPairKey(null)
    }
  }, [expandedRelationPairKey, relationPresentations])

  const flowEdges = useMemo<FlowEdge[]>(() => {
    const directionId = (direction: RelationDirectionPresentation) => direction.explicitKey === undefined ? `derived:${direction.from}:${direction.to}` : `explicit:${direction.explicitKey}`
    const routeItems = relationPresentations.flatMap<RelationRouteItem>((presentation) => {
      if (presentation.kind === 'bidirectional' && presentation.reverse && expandedRelationPairKey === presentation.pairKey) {
        return [
          { id: directionId(presentation.forward), source: presentation.forward.from, target: presentation.forward.to, kind: 'expanded' },
          { id: directionId(presentation.reverse), source: presentation.reverse.from, target: presentation.reverse.to, kind: 'expanded' },
        ]
      }
      if (presentation.kind === 'bidirectional') return [{ id: `pair:${presentation.source}:${presentation.target}`, source: presentation.source, target: presentation.target, kind: 'reciprocal' }]
      return [{ id: directionId(presentation.forward), source: presentation.source, target: presentation.target, kind: 'single' }]
    })
    const routeLanes = assignRelationRouteLanes(routeItems, worlds.map((world) => ({ id: world.id.trim(), position: world.position })))
    const marker = (derived: boolean, reciprocal = false) => ({
      type: derived ? MarkerType.Arrow : MarkerType.ArrowClosed,
      color: derived ? '#7a4d26' : '#285f67',
      width: reciprocal ? RECIPROCAL_ARROWHEAD_SIZE : SINGLE_ARROWHEAD_SIZE,
      height: reciprocal ? RECIPROCAL_ARROWHEAD_SIZE : SINGLE_ARROWHEAD_SIZE,
    })
    const focusClasses = (presentation: RelationPresentation, selected: boolean) => {
      const incident = Boolean(focusedWorldId && (presentation.source === focusedWorldId || presentation.target === focusedWorldId))
      return [
        incident ? 'relation-focus' : '',
        focusedWorldId && !incident && !selected ? 'relation-dimmed' : '',
        selected ? 'relation-selected' : '',
      ]
    }
    const directionEdge = (presentation: RelationPresentation, direction: RelationDirectionPresentation, reversePair: boolean): FlowEdge | null => {
      const endpoints = resolveModalEdgeEndpoints(worldKeyById.get(direction.from), worldKeyById.get(direction.to))
      if (!endpoints) return null
      const editable = direction.explicitKey !== undefined && graphEdgesEditable
      const selected = direction.explicitKey === selectedEdgeKey
      const directionPair = `${direction.from}\u0000${direction.to}`
      const id = directionId(direction)
      const lane = routeLanes.get(id)
      return {
        id,
        source: endpoints.source,
        target: endpoints.target,
        type: 'modal',
        data: {
          reversePair,
          routeSign: 1,
          sourceOffset: lane?.sourceOffset,
          targetOffset: lane?.targetOffset,
          curveOffset: lane?.curveOffset,
          pairKey: presentation.pairKey,
          description: direction.derived ? `Accessibility from ${direction.from} to ${direction.to}, derived by an enforced frame rule` : `Accessibility from ${direction.from} to ${direction.to}, explicit`,
        },
        interactionWidth: 22,
        markerEnd: marker(direction.derived),
        selectable: editable,
        focusable: true,
        selected,
        ariaLabel: direction.derived ? `${direction.from} to ${direction.to}, derived by an enforced frame rule` : `${direction.from} to ${direction.to}, explicit`,
        className: [
          'model-edge', reversePair ? 'expanded-relation' : '', direction.derived ? 'derived-edge' : '', selected ? 'selected-edge' : '',
          ...focusClasses(presentation, selected),
          traceCheckedEdges.has(directionPair) ? 'trace-checked-edge' : '',
          traceForcedDerivedPairKeys.has(directionPair) ? 'trace-forced-derived-edge' : '',
          frameWitnessPresentation.premiseEdges.has(directionPair) ? 'frame-witness-premise-edge' : '',
          direction.to === traceWitnessWorld && activeTrace?.worldId === direction.from ? 'trace-witness-edge' : '',
          direction.to === traceCounterexampleWorld && activeTrace?.worldId === direction.from ? 'trace-counterexample-edge' : '',
          activeTrace && !traceCheckedEdges.has(directionPair) ? 'trace-irrelevant-edge' : '',
        ].filter(Boolean).join(' '),
      }
    }

    const normalEdges = relationPresentations.flatMap<FlowEdge>((presentation) => {
      if (presentation.kind === 'bidirectional' && expandedRelationPairKey !== presentation.pairKey) {
        const endpoints = resolveModalEdgeEndpoints(worldKeyById.get(presentation.source), worldKeyById.get(presentation.target))
        if (!endpoints || !presentation.reverse) return []
        const selected = presentation.forward.explicitKey === selectedEdgeKey || presentation.reverse.explicitKey === selectedEdgeKey
        const bothDerived = presentation.forward.derived && presentation.reverse.derived
        const checked = traceCheckedEdges.has(`${presentation.forward.from}\u0000${presentation.forward.to}`)
          || traceCheckedEdges.has(`${presentation.reverse.from}\u0000${presentation.reverse.to}`)
        const id = `pair:${presentation.source}:${presentation.target}`
        const lane = routeLanes.get(id)
        return [{
          id,
          source: endpoints.source,
          target: endpoints.target,
          type: 'modal',
          data: { pairKey: presentation.pairKey, description: describeRelationPresentation(presentation), sourceOffset: lane?.sourceOffset, targetOffset: lane?.targetOffset, curveOffset: lane?.curveOffset },
          interactionWidth: 24,
          markerEnd: marker(presentation.forward.derived, true),
          markerStart: marker(presentation.reverse.derived, true),
          selectable: true,
          focusable: true,
          ariaLabel: describeRelationPresentation(presentation),
          className: [
            'model-edge', 'bidirectional-edge', bothDerived ? 'derived-edge' : '',
            presentation.forward.derived !== presentation.reverse.derived ? 'mixed-relation' : '',
            ...focusClasses(presentation, selected), checked ? 'trace-checked-edge' : '', activeTrace && !checked ? 'trace-irrelevant-edge' : '',
            (frameWitnessPresentation.premiseEdges.has(`${presentation.forward.from}\u0000${presentation.forward.to}`) || frameWitnessPresentation.premiseEdges.has(`${presentation.reverse.from}\u0000${presentation.reverse.to}`)) ? 'frame-witness-premise-edge' : '',
          ].filter(Boolean).join(' '),
        }]
      }
      if (presentation.kind === 'bidirectional' && presentation.reverse) {
        return [directionEdge(presentation, presentation.forward, true), directionEdge(presentation, presentation.reverse, true)].filter((edge): edge is FlowEdge => Boolean(edge))
      }
      const edge = directionEdge(presentation, presentation.forward, false)
      return edge ? [edge] : []
    })
    const missing = frameWitnessPresentation.missingEdge
    if (!missing || missing.from === missing.to) return normalEdges
    const endpoints = resolveModalEdgeEndpoints(worldKeyById.get(missing.from), worldKeyById.get(missing.to))
    if (!endpoints) return normalEdges
    return [...normalEdges, {
      id: `frame-witness-missing:${missing.from}:${missing.to}`,
      source: endpoints.source,
      target: endpoints.target,
      type: 'modal',
      data: { description: `Missing relation from ${missing.from} to ${missing.to} for the selected frame-property witness` },
      markerEnd: { type: MarkerType.Arrow, color: '#a43f2d', width: SINGLE_ARROWHEAD_SIZE, height: SINGLE_ARROWHEAD_SIZE },
      selectable: false,
      focusable: false,
      className: 'model-edge frame-witness-missing-edge',
    }]
  }, [relationPresentations, expandedRelationPairKey, worldKeyById, worlds, selectedEdgeKey, focusedWorldId, traceCheckedEdges, traceForcedDerivedPairKeys, traceWitnessWorld, traceCounterexampleWorld, activeTrace, graphEdgesEditable, frameWitnessPresentation])

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
  const selectedTrack = campaignTracks[campaignTrackIndex]
  const playingTrack = campaignTracks[playingTrackIndex ?? campaignTrackIndex]
  const selectedGuidedCampaign = guidedCampaigns[guidedCampaignIndex]
  const learnTaskLevels = learnLessons.map(({ task }) => task)
  const activeLevels = gameMode === 'tutorial' ? tutorialLevels : gameMode === 'learn' ? learnTaskLevels : gameMode === 'campaign' ? playingTrack.levels : gameMode === 'guidedCampaign' ? selectedGuidedCampaign.levels : gameMode === 'custom' ? customLevels : []
  const activeLevel = gameMode === 'sandbox' ? null : activeMapLevel ?? null
  const customSequenceLabel = customLevels.length > 1 ? 'Custom campaign' : 'Custom mission'
  const tutorialCompleted = tutorialLevels.filter((level) => completedLevelIds.has(level.id)).length
  const nextTutorialIndex = tutorialLevels.findIndex((level) => !completedLevelIds.has(level.id))
  const introCompleted = learnProgress.completedLessonIds.length
  const playableLearningCompleted = tutorialCompleted + introCompleted
  const availableLearningTotal = tutorialLevels.length + learnLessons.length
  const selectedTrackCompleted = selectedTrack.levels.filter((level) => completedLevelIds.has(level.id)).length
  const nextSelectedLevelIndex = selectedTrack.levels.findIndex((level) => !completedLevelIds.has(level.id))
  const overallCampaignLevels = campaignTracks.reduce((total, track) => total + track.levels.length, 0)
  const overallCampaignCompleted = campaignTracks.reduce((total, track) => total + track.levels.filter((level) => completedLevelIds.has(level.id)).length, 0)
  const successfulAttempts = guestProfile.history.filter((entry) => entry.success).length
  const completedHistoryLevels = new Set(guestProfile.history.filter((entry) => entry.success && entry.levelId).map((entry) => entry.levelId)).size
  const distinctSolutions = Object.values(guestProfile.solutionSignatures).reduce((total, signatures) => total + signatures.length, 0)
  const activeDistinctSolutionCount = activeLevel ? guestProfile.solutionSignatures[activeLevel.id]?.length ?? 0 : 0
  const currentValuation = Object.fromEntries(worlds.map(({ id, atoms }) => [id.trim(), atoms.split(/[\s,]+/u).filter(Boolean)]))
  const formulaParseStatus = useMemo(() => {
    if (!formulaSource.trim()) return null
    try { parseFormula(formulaSource); return 'valid' as const } catch { return 'invalid' as const }
  }, [formulaSource])
  const insertFormulaSymbol = (symbol: string) => {
    const input = formulaInputRef.current
    const insertion = insertAtSelection(formulaSource, symbol, input?.selectionStart ?? formulaSource.length, input?.selectionEnd ?? formulaSource.length)
    setFormulaSource(insertion.value)
    setResult(null)
    setTimeout(() => { formulaInputRef.current?.focus(); formulaInputRef.current?.setSelectionRange(insertion.selectionStart, insertion.selectionEnd) }, 0)
  }
  const scopeComparison = (() => {
    const configuredWorld = activeLevel?.scopeComparison?.evaluationWorld ?? (activeLevel?.showScopeComparison ? evaluationWorld : undefined)
    if (!configuredWorld || !result || !formulaSource.trim() || usableWorldIds.length === 0) return null
    try {
      const formula = parseFormula(formulaSource)
      return (['pointed', 'model', 'frame'] as const).map((scope) => {
        const verdict = verifyObjective({ scope, targetTruth: true, evaluationWorld: configuredWorld }, {
          worldIds: usableWorldIds,
          edges: effectiveEdges,
          valuation: currentValuation,
          formula,
        }).formula
        return {
          scope,
          holds: verdict.holds,
          reason: scope === 'pointed'
            ? `${configuredWorld} ${verdict.holds ? 'satisfies' : 'does not satisfy'} the formula under the shown valuation.`
            : scope === 'model'
              ? verdict.holds ? 'Every world satisfies the formula under the shown valuation.' : 'At least one world fails under the shown valuation.'
              : verdict.holds ? 'Every world satisfies the formula under every valuation.' : 'Frame validity checks every valuation; a world and countervaluation refute it.',
        }
      })
    } catch {
      return null
    }
  })()
  const currentTrueAtomCount = Object.values(currentValuation).reduce((total, atoms) => total + atoms.length, 0)
  const activeBaseline = activeLevel ? {
    worldIds: activeLevel.worlds.map(({ id }) => id), explicitEdges: activeLevel.edges,
    valuation: Object.fromEntries(activeLevel.worlds.map(({ id, atoms }) => [id, atoms.split(/[\s,]+/u).filter(Boolean)])),
  } : undefined
  const currentSemanticChanges = activeBaseline ? countConstructionChanges({
    worldIds: usableWorldIds, explicitEdges: edges, effectiveEdges, valuation: currentValuation, baseline: activeBaseline,
  }) : undefined
  const frameValuationEstimate = useMemo(() => {
    if (evaluationScope !== 'frame' && evaluationScope !== 'correspondence') return null
    try {
      const atoms = new Set(collectAtoms(parseFormula(formulaSource)))
      if (comparisonFormulaSource.trim()) for (const atom of collectAtoms(parseFormula(comparisonFormulaSource))) atoms.add(atom)
      const slots = usableWorldIds.length * atoms.size
      return { atoms: atoms.size, valuations: 2 ** slots }
    } catch {
      return null
    }
  }, [evaluationScope, formulaSource, comparisonFormulaSource, usableWorldIds.length])
  const frameValuationLimitExceeded = Boolean(frameValuationEstimate && (!Number.isSafeInteger(frameValuationEstimate.valuations) || frameValuationEstimate.valuations > DEFAULT_MAXIMUM_VALUATIONS))
  const failureSummary = Object.entries(guestProfile.history.reduce<Partial<Record<AttemptFailureCategory, number>>>((counts, entry) => {
    if (entry.failureCategory) counts[entry.failureCategory] = (counts[entry.failureCategory] ?? 0) + 1
    return counts
  }, {})).sort(([, left], [, right]) => (right ?? 0) - (left ?? 0)) as [AttemptFailureCategory, number][]
  const conceptSummary = [...guestProfile.history.reduce<Map<string, { attempts: number; successes: number }>>((summary, entry) => {
    const concept = entry.concept ?? entry.scope
    const current = summary.get(concept) ?? { attempts: 0, successes: 0 }
    summary.set(concept, { attempts: current.attempts + 1, successes: current.successes + (entry.success ? 1 : 0) })
    return summary
  }, new Map()).entries()].sort(([, left], [, right]) => right.attempts - left.attempts).slice(0, 6)
  const courseLesson = activeLevel ? learnLessonByTaskId.get(activeLevel.id) : undefined
  const revealLearnHint = (index: number) => {
    if (!courseLesson) return
    const bounded = Math.max(1, Math.min(courseLesson.hints.length, index))
    setLearnHintLevel((current) => Math.max(current, bounded))
    setLearnProgress((current) => {
      const used = current.hintsUsed[courseLesson.id] ?? []
      if (used.includes(bounded)) return current
      return { ...current, hintsUsed: { ...current.hintsUsed, [courseLesson.id]: [...used, bounded] } }
    })
  }
  const isQuestionTask = activeLevel?.interactionMode === 'question'
  const previousSoundResultRef = useRef<VerificationResult>(null)
  useEffect(() => {
    if (result && result !== previousSoundResultRef.current) {
      playSound(result.kind === 'success' ? 'success' : 'failure', soundEffects)
    }
    previousSoundResultRef.current = result
  }, [result, soundEffects])
  useEffect(() => {
    if (result && result.kind !== 'error' && !isQuestionTask) verificationResultRef.current?.focus()
  }, [isQuestionTask, result])
  useEffect(() => {
    if (!isQuestionTask) return
    setModelView('graph')
    setSelectedWorldKey(null)
    setSelectedEdgeKey(null)
  }, [activeLevel?.id, isQuestionTask])
  const activeLevelFailureCount = activeLevel ? guestProfile.history.filter((entry) => entry.levelId === activeLevel.id && !entry.success).length : 0
  const relatedLearnLesson = courseLesson?.relatedLessonIds?.map((id) => learnLessons.find((lesson) => lesson.id === id)).find(Boolean)
  const semanticFeedbackLevel = result?.kind === 'failure' && activeLevel ? Math.max(1, Math.min(3, activeLevelFailureCount)) : 3
  const completionDialogOpen = Boolean(appView === 'workspace' && activeLevel && !courseLesson && result?.kind === 'success' && !completionDismissed)
  const anyDialogOpen = showHelp || showFrameRules || showDataManager || learnConceptOpen || showWorkspaceTour || completionDialogOpen
  useDialogFocus(anyDialogOpen, () => {
    if (showWorkspaceTour) { try { localStorage.setItem(workspaceTourKey, 'seen') } catch { /* Optional persistence. */ }; setShowWorkspaceTour(false) }
    else if (learnConceptOpen) setLearnConceptOpen(false)
    else if (completionDialogOpen) setCompletionDismissed(true)
    else { setShowHelp(false); setShowFrameRules(false); setShowDataManager(false) }
  })
  const activeLearnChapter = courseLesson ? learnCourse.chapters.find((chapter) => chapter.id === courseLesson.chapterId) : undefined
  const activeLearnChapterIndex = activeLearnChapter && courseLesson ? activeLearnChapter.lessons.findIndex((lesson) => lesson.id === courseLesson.id) : -1
  const activeLearnChapterCompleted = activeLearnChapter?.lessons.filter((lesson) => learnProgress.completedLessonIds.includes(lesson.id)).length ?? 0
  const nextLearnChapter = activeLearnChapter ? learnCourse.chapters[learnCourse.chapters.findIndex((chapter) => chapter.id === activeLearnChapter.id) + 1] : undefined
  const isGuidedMode = gameMode !== 'sandbox'
  const isHowToPlay = gameMode === 'tutorial'
  const isConstructionObjective = activeLevel?.objectiveKind === 'construction'
  const focusedIntroWorkspace = isHowToPlay || gameMode === 'learn'
  const presentation = activeLevel?.workspacePresentation
  const showFormulaPanel = !isGuidedMode
  const showWorldPanel = !isGuidedMode || Boolean(presentation?.worlds || presentation?.valuations || activeLevel?.editable.some((permission) => permission === 'worlds' || permission === 'valuations'))
  const showValuations = !isGuidedMode || Boolean(presentation?.valuations || activeLevel?.editable.includes('valuations'))
  const showEdgePanel = !isGuidedMode || Boolean(presentation?.edges || activeLevel?.editable.includes('edges'))
  const showEvaluationControl = !isQuestionTask && (!isGuidedMode || Boolean(presentation?.evaluation || activeLevel?.editable.includes('evaluation') || activeLevel?.scope === 'pointed'))
  const choosePredictionAnswer = (answer: string) => {
    setPredictionAnswer(answer)
    setResult(null)
    if (!courseLesson || !activeLevel?.prediction) return
    const expected = activeLevel.prediction.kind === 'frame-property' ? activeLevel.prediction.expectedProperty : activeLevel.prediction.expectedChoice
    const correct = activeLevel.prediction.kind === 'truth' || !expected ? undefined : answer === expected
    setLearnProgress((current) => ({
      ...current,
      predictionAnswers: { ...current.predictionAnswers, [courseLesson.id]: answer },
      predictionCorrectness: correct === undefined ? current.predictionCorrectness : { ...current.predictionCorrectness, [courseLesson.id]: correct },
    }))
  }
  const tutorialAllows = (control: import('./campaign').TutorialControl) => !isHowToPlay || Boolean(activeLevel?.tutorialControls?.includes(control))
  const completedLearnTask = Boolean(courseLesson && result?.kind === 'success')
  const taskIsLocked = Boolean(isQuestionTask || completedLearnTask)
  const canEditWorlds = !taskIsLocked && editorMode === 'edit' && (!activeLevel || activeLevel.editable.includes('worlds'))
  const canEditValuations = !taskIsLocked && editorMode === 'edit' && (!activeLevel || activeLevel.editable.includes('valuations'))
  const canEditEdges = !taskIsLocked && editorMode === 'edit' && (!activeLevel || activeLevel.editable.includes('edges'))
  const canEditConstraints = !taskIsLocked && (!activeLevel || activeLevel.editable.includes('constraints'))
  const canEditEvaluation = !taskIsLocked && (!activeLevel || activeLevel.editable.includes('evaluation'))
  const canUseHistory = !isHowToPlay || tutorialAllows('history')
  const tutorialAtomVocabulary = isHowToPlay ? activeLevel?.atomVocabulary : undefined

  useEffect(() => {
    const handleWorkspaceShortcut = (event: KeyboardEvent) => {
      if (appView !== 'workspace' || isTextEntryTarget(event.target) || showHelp || showFrameRules || showDataManager || showWorkspaceTour) return
      if (isQuestionTask && (event.key === 'Enter' || event.key === ' ')) {
        const nodeElement = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('.react-flow__node[data-id]') : null
        const world = nodeElement ? worlds.find(({ key }) => String(key) === nodeElement.dataset.id) : undefined
        if (world && (activeLevel?.prediction?.kind === 'world-choice' || activeLevel?.prediction?.kind === 'counterexample-world')) {
          event.preventDefault()
          choosePredictionAnswer(world.id.trim())
          return
        }
      }
      if (event.key === 'Escape') {
        clearGraphSelection()
        setActiveFrameWitness(null)
        return
      }
      const deleteSelection = resolveDeleteSelection({ key: event.key, target: event.target, selectedWorldKey, selectedEdgeKey, canEditWorlds, canEditEdges })
      if (deleteSelection) {
        event.preventDefault()
        if (deleteSelection.kind === 'world') removeWorld(deleteSelection.key)
        else deleteEdge(deleteSelection.key)
        return
      }
      if (event.altKey && evaluationTraceSteps.length > 0 && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault()
        setTraceStepIndex((current) => event.key === 'ArrowLeft' ? Math.max(0, current - 1) : Math.min(evaluationTraceSteps.length - 1, current + 1))
        return
      }
      if (!canUseHistory || !event.ctrlKey) return
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleWorkspaceShortcut)
    return () => window.removeEventListener('keydown', handleWorkspaceShortcut)
  })

  useEffect(() => {
    if (!activeLevel || result?.kind !== 'success' || completionDismissed) return
    const dismissCompletion = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCompletionDismissed(true)
    }
    window.addEventListener('keydown', dismissCompletion)
    return () => window.removeEventListener('keydown', dismissCompletion)
  }, [activeLevel, completionDismissed, result])

  const renameWorld = (key: number, nextId: string): string | null => {
    if (!canEditWorlds) return 'World names are locked in this task.'
    const index = worlds.findIndex((world) => world.key === key)
    if (index < 0) return 'This world no longer exists.'
    const error = validateWorldIdCandidate(worlds, index, nextId)
    if (error) return error
    const previous = worlds[index]
    const oldId = previous.id.trim()
    const newId = nextId.trim()
    if (oldId === newId && previous.id === newId) return null
    saveHistoryPoint()
    setWorlds((current) => current.map((world) => world.key === key ? { ...world, id: newId } : world))
    setEdges((current) => current.map((edge) => ({ ...edge, from: edge.from === oldId ? newId : edge.from, to: edge.to === oldId ? newId : edge.to })))
    if (evaluationWorld === oldId) setEvaluationWorld(newId)
    setResult(null)
    return null
  }

  const updateWorldAtoms = (key: number, value: string) => {
    if (!canEditValuations) return
    if (tutorialAtomVocabulary) value = value.split(/[\s,]+/u).filter((atom) => tutorialAtomVocabulary.includes(atom)).join(' ')
    setWorlds((current) => current.map((world) => world.key === key ? { ...world, atoms: value } : world))
    setResult(null)
  }

  const preferredWorldSpawn = (): WorldPosition => {
    if (selectedWorld) return { x: selectedWorld.position.x + WORLD_NODE_SIZE + 54, y: selectedWorld.position.y }
    const bounds = graphCanvasRef.current?.getBoundingClientRect()
    if (flowInstance && bounds) {
      const center = flowInstance.screenToFlowPosition({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 })
      return { x: center.x - WORLD_NODE_SIZE / 2, y: center.y - WORLD_NODE_SIZE / 2 }
    }
    return { x: 90, y: 90 }
  }

  const addWorld = (preferredPosition?: WorldPosition) => {
    if (!canEditWorlds) return
    saveHistoryPoint()
    const used = new Set(worlds.map(({ id }) => id))
    let number = worlds.length
    while (used.has(`w${number}`)) number += 1
    const spawnPosition = findFreeWorldPosition(worlds, preferredPosition ?? preferredWorldSpawn())
    setWorlds((current) => [...current, {
      key: nextWorldKey,
      id: `w${number}`,
      atoms: '',
      position: spawnPosition,
    }])
    setNextWorldKey((key) => key + 1)
    setResult(null)
    playSound('create', soundEffects)
  }

  const tidyModel = () => {
    if (worlds.length < 2) return
    // Layout intentionally uses explicit edges only.
    const positions = createTidyModelLayout(worlds, edges, evaluationWorld)
    saveHistoryPoint(true)
    setWorlds((current) => current.map((world) => ({ ...world, position: positions.get(world.key) ?? world.position })))
    setCollidingWorldKeys(new Set())
  }

  const handleMapWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!flowInstance || !(event.target instanceof Element) || event.target.closest('.react-flow__panel')) return
    if (!event.target.closest('.react-flow')) return
    const bounds = graphCanvasRef.current?.getBoundingClientRect()
    if (!bounds) return
    const handling = resolveMapWheelHandling(event, flowInstance.getViewport(), {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })
    if (handling.useNativePan || !handling.application) return
    event.preventDefault()
    event.stopPropagation()
    void flowInstance.setViewport(handling.application.viewport, { duration: 0 })
  }

  const removeWorld = (key: number) => {
    if (!canEditWorlds) return
    const deletion = deleteWorldFromEditableModel(worlds, edges, key, evaluationWorld)
    if (!deletion) return
    saveHistoryPoint()
    setWorlds(deletion.worlds as EditableWorld[])
    setEdges(deletion.edges as EditableEdge[])
    setEvaluationWorld(deletion.evaluationWorld)
    clearGraphSelection()
    setHoveredWorldKey(null)
    setCollidingWorldKeys(new Set())
    setEdgeDraft(null)
    setResult(null)
    setWorkspaceStatus(`Deleted ${deletion.removedWorldId}${deletion.incidentRelationCount ? ` and ${deletion.incidentRelationCount} incident explicit relation${deletion.incidentRelationCount === 1 ? '' : 's'}` : ''}. Undo is available.`)
  }

  const addEdge = () => {
    if (!canEditEdges) return
    setEdgeDraft({ from: '', to: '' })
  }

  const commitEdgeDraft = () => {
    if (!canEditEdges || !edgeDraft) return
    const error = validateExplicitEdgeCandidate(worlds, edges, edgeDraft.from, edgeDraft.to)
    if (error) { setEdgeDraft({ ...edgeDraft, error }); return }
    saveHistoryPoint()
    setEdges((current) => [...current, { key: nextEdgeKey, from: edgeDraft.from, to: edgeDraft.to }])
    setNextEdgeKey((key) => key + 1)
    setEdgeDraft(null)
    setResult(null)
    playSound('create', soundEffects)
  }

  const replaceEdgeEndpoint = (edgeKey: number, field: 'from' | 'to', nextWorldId: string): string | null => {
    if (!canEditEdges) return 'Relations are locked in this task.'
    const edgeIndex = edges.findIndex((edge) => edge.key === edgeKey)
    if (edgeIndex < 0) return 'This relation no longer exists.'
    const candidate = { ...edges[edgeIndex], [field]: nextWorldId }
    const error = validateExplicitEdgeCandidate(worlds, edges, candidate.from, candidate.to, edgeIndex)
    if (error) { setEdgeEditErrors((current) => ({ ...current, [edgeKey]: error })); return error }
    if (edges[edgeIndex][field] === nextWorldId) return null
    saveHistoryPoint()
    setEdges((current) => current.map((edge) => edge.key === edgeKey ? candidate : edge))
    setEdgeEditErrors((current) => { const next = { ...current }; delete next[edgeKey]; return next })
    setResult(null)
    return null
  }

  const connectWorlds = (connection: Connection) => {
    if (!canEditEdges) return
    const source = worlds.find(({ key }) => String(key) === connection.source)?.id.trim()
    const target = worlds.find(({ key }) => String(key) === connection.target)?.id.trim()
    if (!source || !target) return
    if (edges.some((edge) => edge.from === source && edge.to === target)) return
    saveHistoryPoint()
    setEdges((current) => [...current, { key: nextEdgeKey, from: source, to: target }])
    setNextEdgeKey((key) => key + 1)
    setResult(null)
    playSound('create', soundEffects)
  }

  const deleteEdge = (key: number) => {
    if (!canEditEdges) return
    const removed = edges.find((edge) => edge.key === key)
    if (!removed) return
    saveHistoryPoint()
    setEdges((current) => current.filter((edge) => edge.key !== key))
    clearGraphSelection()
    setResult(null)
    setWorkspaceStatus(`Deleted explicit relation ${removed.from} to ${removed.to}. Undo is available.`)
  }

  const selectEvaluationWorld = (worldId: string) => {
    if (!canEditEvaluation || !worldId) return
    saveHistoryPoint()
    setEvaluationWorld(worldId)
    setResult(null)
  }

  const loadLevel = (index: number, levels: readonly GameLevel[] = activeLevels) => {
    const level = levels[index]
    if (!level) return
    setCampaignLevelIndex(index)
    setFormulaSource(level.formula ?? '')
    setComparisonFormulaSource(level.comparisonFormula ?? '')
    setWorlds(level.worlds.map((world, key) => ({ ...world, key })))
    setEdges(level.edges.map((edge, key) => ({ ...edge, key })))
    setEvaluationWorld(level.evaluationWorld)
    setTargetTruth(level.targetTruth ?? true)
    setEvaluationScope(level.scope ?? 'pointed')
    setSelectedCorrespondence(level.correspondencePreset ?? '')
    setFrameRules({ ...defaultFrameRules, ...level.frameRules })
    setNextWorldKey(level.worlds.length)
    setNextEdgeKey(level.edges.length)
    setSelectedWorldKey(null)
    setSelectedEdgeKey(null)
    setHoveredWorldKey(null)
    setExpandedRelationPairKey(null)
    setLeftPanelOpen(true)
    setRightPanelOpen(false)
    setEditorMode('edit')
    setResult(null)
    setPredictionAnswer('')
    setCompletionDismissed(false)
    historyPast.current = []
    historyFuture.current = []
    setHistoryVersion((version) => version + 1)
  }

  useEffect(() => {
    try {
      const shared = readSharedJson()
      if (!shared) return
      const imported = JSON.parse(shared) as Record<string, unknown>
      const levels = imported.format === 'logic-model-builder-campaign'
        ? parseCustomCampaign(imported).missions.map(({ level }) => level)
        : [parseCustomLevelFile(imported)]
      sandboxBeforeCampaign.current = { formulaSource, comparisonFormulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope }
      setCustomLevels(levels)
      setGameMode('custom')
      setAppView('workspace')
      loadLevel(0, levels)
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : 'Could not open the shared mission.')
      setShowDataManager(true)
    }
    // A share fragment is an initial navigation instruction, not reactive app state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enterGuidedMode = (mode: 'tutorial' | 'campaign') => {
    if (gameMode === 'sandbox') {
      sandboxBeforeCampaign.current = { formulaSource, comparisonFormulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope }
    }
    setGameMode(mode)
    const levels = mode === 'tutorial' ? tutorialLevels : campaignTracks[campaignTrackIndex].levels
    loadLevel(0, levels)
  }

  const startGuidedLevel = (mode: 'tutorial' | 'campaign', index: number, trackIndex = campaignTrackIndex) => {
    if (gameMode === 'sandbox') {
      sandboxBeforeCampaign.current = { formulaSource, comparisonFormulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope }
    }
    if (mode === 'campaign') setCampaignTrackIndex(trackIndex)
    if (mode === 'campaign') setPlayingTrackIndex(trackIndex)
    setGameMode(mode)
    const levels = mode === 'tutorial' ? tutorialLevels : campaignTracks[trackIndex].levels
    loadLevel(index, levels)
    setAppView('workspace')
  }

  const startGuidedCampaign = (index = 0) => {
    const campaign = guidedCampaigns[index]
    if (!campaign) return
    if (gameMode === 'sandbox') sandboxBeforeCampaign.current = { formulaSource, comparisonFormulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope }
    setGuidedCampaignIndex(index)
    setGameMode('guidedCampaign')
    setGuidedHintLevel(1)
    const nextLevel = campaign.levels.findIndex((level) => !completedLevelIds.has(level.id))
    loadLevel(nextLevel < 0 ? 0 : nextLevel, campaign.levels)
    setAppView('workspace')
  }

  const startLearnLesson = (index: number) => {
    const lesson = learnLessons[index]
    if (!lesson) return
    if (gameMode === 'sandbox') sandboxBeforeCampaign.current = { formulaSource, comparisonFormulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope }
    setGameMode('learn')
    setLearnTransferActive(false)
    setLearnHintLevel(0)
    setPredictionAnswer(learnProgress.predictionAnswers[lesson.id] ?? '')
    setLearnProgress((current) => ({ ...current, currentLessonId: lesson.id, highestStageByLesson: { ...current.highestStageByLesson, [lesson.id]: Math.max(current.highestStageByLesson[lesson.id] ?? 0, 0) } }))
    loadLevel(index, learnTaskLevels)
    setLearnConceptOpen(true)
    setAppView('workspace')
  }

  const startLearnTransfer = (lessonId: string) => {
    const index = learnLessons.findIndex((lesson) => lesson.id === lessonId)
    const lesson = learnLessons[index]
    if (!lesson?.transferTask) return
    setGameMode('learn')
    setLearnTransferActive(true)
    setLearnHintLevel(0)
    const transferLevels = learnLessons.map((item) => item.id === lessonId ? { ...lesson.transferTask!, prediction: undefined } : item.task)
    loadLevel(index, transferLevels)
    setLearnConceptOpen(false)
    setAppView('workspace')
  }

  const restartControlsSection = () => {
    if (!window.confirm('Restart Learn the Controls from its first lesson? Existing attempt history will be kept.')) return
    const tutorialIds = new Set(tutorialLevels.map(({ id }) => id))
    setCompletedLevelIds((current) => new Set([...current].filter((id) => !tutorialIds.has(id))))
    startGuidedLevel('tutorial', 0)
  }

  const restartLearnChapter = (chapterId: string) => {
    const chapter = learnCourse.chapters.find(({ id }) => id === chapterId)
    if (!chapter?.lessons[0] || !window.confirm(`Restart ${chapter.title} from its first lesson? Existing attempt history will be kept.`)) return
    const lessonIds = new Set(chapter.lessons.map(({ id }) => id))
    setLearnProgress((current) => ({
      ...current,
      completedLessonIds: current.completedLessonIds.filter((id) => !lessonIds.has(id)),
      completedChapterIds: current.completedChapterIds.filter((id) => id !== chapter.id),
    }))
    startLearnLesson(learnLessons.findIndex(({ id }) => id === chapter.lessons[0].id))
  }

  const markWelcomeViewed = () => setLearnProgress((current) => current.welcomeViewed ? current : { ...current, welcomeViewed: true })

  const continueLearningPath = () => {
    if (!learnProgress.welcomeViewed) { setAppView('welcome'); return }
    if (nextTutorialIndex >= 0) { startGuidedLevel('tutorial', nextTutorialIndex); return }
    for (const chapter of learnCourse.chapters.filter((item) => item.lessons.length > 0)) {
      const lesson = chapter.lessons.find((item) => !learnProgress.completedLessonIds.includes(item.id))
      if (lesson) { startLearnLesson(learnLessons.findIndex((item) => item.id === lesson.id)); return }
    }
    setAppView('learn')
  }

  const returnToSandbox = () => {
    if (isGuidedMode) exitCampaign()
    setAppView('workspace')
  }

  const openWorkspaceTour = () => {
    setWorkspaceTourStep(0)
    setAppView('workspace')
    setShowWorkspaceTour(true)
    setUtilityMenuOpen(false)
  }

  const dismissWorkspaceTour = () => {
    try { localStorage.setItem(workspaceTourKey, 'seen') } catch { /* Tour may repeat when storage is unavailable. */ }
    setShowWorkspaceTour(false)
    setWorkspaceTourStep(0)
  }

  const applySandboxPreset = (preset: 'build' | 'evaluate' | 'frame') => {
    if (preset === 'build') {
      setEditorMode('edit')
      setRightPanelOpen(true)
      setLeftPanelOpen(false)
      return
    }
    if (preset === 'evaluate') {
      setEditorMode('evaluate')
      setLeftPanelOpen(true)
      setTimeout(() => formulaInputRef.current?.focus(), 0)
      return
    }
    setEditorMode('edit')
    setLeftPanelOpen(true)
    setShowFrameRules(true)
  }

  const selectCampaignTrack = (index: number) => {
    setCampaignTrackIndex(index)
    setPlayingTrackIndex(index)
    loadLevel(0, campaignTracks[index].levels)
  }

  const exitCampaign = () => {
    const draft = sandboxBeforeCampaign.current
    setGameMode('sandbox')
    const settings = loadInterfaceSettings()
    setLeftPanelOpen(settings.leftPanelOpen)
    setRightPanelOpen(settings.rightPanelOpen)
    if (!draft) return
    setFormulaSource(draft.formulaSource)
    setComparisonFormulaSource(draft.comparisonFormulaSource ?? '')
    setWorlds(draft.worlds)
    setEdges(draft.edges)
    setEvaluationWorld(draft.evaluationWorld)
    setTargetTruth(draft.targetTruth)
    setFrameRules({ ...defaultFrameRules, ...draft.frameRules })
    setEvaluationScope(draft.evaluationScope === 'world' ? 'pointed' : draft.evaluationScope ?? 'pointed')
    setNextWorldKey(Math.max(-1, ...draft.worlds.map(({ key }) => key)) + 1)
    setNextEdgeKey(Math.max(-1, ...draft.edges.map(({ key }) => key)) + 1)
    setSelectedCorrespondence('')
    setResult(null)
  }

  const resetSandbox = () => {
    if (gameMode !== 'sandbox') {
      loadLevel(campaignLevelIndex)
      return
    }
    if (!window.confirm('Reset the sandbox? The current model will be replaced.')) return
    saveHistoryPoint()
    setFormulaSource('◇p')
    setWorlds(initialWorlds)
    setEdges(initialEdges)
    setEvaluationWorld('w0')
    setTargetTruth(true)
    setFrameRules(defaultFrameRules)
    setEvaluationScope('pointed')
    setComparisonFormulaSource('')
    setSelectedCorrespondence('')
    setNextWorldKey(2)
    setNextEdgeKey(1)
    setSelectedEdgeKey(null)
    setResult(null)
  }

  const loadCorrespondencePreset = (presetId: string) => {
    setSelectedCorrespondence(presetId)
    const preset = correspondencePresets.find(({ id }) => id === presetId)
    if (!preset) return
    saveHistoryPoint()
    setFormulaSource(preset.formula)
    setComparisonFormulaSource('')
    setEvaluationScope('correspondence')
    setTargetTruth(true)
    setResult(null)
  }

  const recordAttempt = (success: boolean, bonusAchieved?: boolean, failureCategory?: AttemptFailureCategory) => {
    const entry: HistoryEntry = {
      id: createLocalId(), timestamp: new Date().toISOString(), mode: gameMode,
      levelId: activeLevel?.id, title: activeLevel?.title ?? 'Sandbox verification',
      scope: evaluationScope, success, worldCount: worlds.length,
      edgeCount: new Set(edges.map(({ from, to }) => `${from}\u0000${to}`)).size,
      trueAtomCount: currentTrueAtomCount,
      semanticChanges: currentSemanticChanges,
      bonusAchieved,
      concept: activeLevel?.concept ?? `${evaluationScope} sandbox`,
      failureCategory: success ? undefined : failureCategory,
    }
    setGuestProfile((current) => ({ ...current, history: [entry, ...current.history].slice(0, 250) }))
    if (gameMode === 'guidedCampaign' && !success) setGuidedHintLevel((current) => Math.min(3, current + 1))
    if (courseLesson) {
      setLearnProgress((current) => {
        const completedLessonIds = success && !learnTransferActive && !current.completedLessonIds.includes(courseLesson.id) ? [...current.completedLessonIds, courseLesson.id] : current.completedLessonIds
        const chapter = learnCourse.chapters.find(({ id }) => id === courseLesson.chapterId)
        const completedChapterIds = chapter && chapter.lessons.length > 0 && chapter.lessons.every((lesson) => completedLessonIds.includes(lesson.id)) && !current.completedChapterIds.includes(chapter.id) ? [...current.completedChapterIds, chapter.id] : current.completedChapterIds
        return {
          ...current,
          completedLessonIds,
          completedChapterIds,
          attemptsByLesson: { ...current.attemptsByLesson, [courseLesson.id]: (current.attemptsByLesson[courseLesson.id] ?? 0) + 1 },
          successfulAttemptsByLesson: success ? { ...current.successfulAttemptsByLesson, [courseLesson.id]: (current.successfulAttemptsByLesson[courseLesson.id] ?? 0) + 1 } : current.successfulAttemptsByLesson,
          transferCompletedLessonIds: success && learnTransferActive && !current.transferCompletedLessonIds.includes(courseLesson.id) ? [...current.transferCompletedLessonIds, courseLesson.id] : current.transferCompletedLessonIds,
          completedAt: success && !learnTransferActive ? { ...current.completedAt, [courseLesson.id]: new Date().toISOString() } : current.completedAt,
          highestStageByLesson: { ...current.highestStageByLesson, [courseLesson.id]: Math.max(current.highestStageByLesson[courseLesson.id] ?? 0, success ? 4 : 3) },
        }
      })
    }
  }

  const verify = () => {
    try {
      setCompletionDismissed(false)
      setTraceStepIndex(0)
      const missingScopePrediction = activeLevel?.prediction?.kind === 'scope-truth' && predictionAnswer.split(',').filter(Boolean).length !== 3
      if (activeLevel?.prediction && activeLevelFailureCount === 0 && (!predictionAnswer || missingScopePrediction)) {
        setResult({ kind: 'failure', message: 'Make a prediction first', detail: activeLevel.prediction.prompt })
        recordAttempt(false, undefined, 'missing-answer')
        return
      }
      const ids = worlds.map(({ id }) => id.trim())
      const integrityIssues = validateEditableModel(worlds, edges)
      if (integrityIssues.length > 0) throw new Error('The editable model contains an invalid world name or explicit relation. Repair it before verification.')
      if (ids.length === 0) throw new Error('Add at least one world before verification.')
      if (ids.some((id) => !id)) throw new Error('Every world must have a name.')
      if (new Set(ids).size !== ids.length) throw new Error('World names must be unique.')
      if (evaluationScope === 'pointed' && !ids.includes(evaluationWorld)) throw new Error('Select an existing evaluation world.')

      const valuations = Object.fromEntries(worlds.map(({ id, atoms }) => [
        id.trim(),
        atoms.split(/[\s,]+/u).map((value) => value.trim()).filter(Boolean),
      ]))
      const explicitEdges: AccessibilityEdge[] = edges.map(({ from, to }) => ({ from, to }))
      const normalizedEdges: AccessibilityEdge[] = effectiveEdges.map(({ from, to }) => ({ from, to }))
      const constraintInput = {
        worldIds: ids,
        explicitEdges,
        effectiveEdges: normalizedEdges,
        valuation: valuations,
        baseline: activeLevel ? {
          worldIds: activeLevel.worlds.map(({ id }) => id),
          explicitEdges: activeLevel.edges,
          valuation: Object.fromEntries(activeLevel.worlds.map(({ id, atoms }) => [id, atoms.split(/[\s,]+/u).filter(Boolean)])),
        } : undefined,
      }
      const constraintViolation = activeLevel?.constraints && checkConstructionConstraints(constraintInput, activeLevel.constraints)[0]
      if (constraintViolation) {
        setResult({ kind: 'failure', message: 'Construction constraint not met', detail: constraintViolation })
        recordAttempt(false, undefined, 'construction')
        return
      }

      const requiredRule = Object.entries(activeLevel?.requiredFrameRules ?? {})
        .find(([property, mode]) => frameRules[property as FramePropertyName] !== mode)
      if (requiredRule) {
        const [property, mode] = requiredRule
        setResult({ kind: 'failure', message: 'Frame constraint not configured', detail: `Set ${property} to ${mode}.` })
        recordAttempt(false, undefined, 'frame-configuration')
        return
      }

      const failedRule = frameRuleResults.find((result) => !result.holds)
      if (failedRule) {
        setResult({
          kind: 'failure',
          message: `The frame is not ${failedRule.property}.`,
          detail: failedRule.violations[0] ?? 'The selected frame rule is violated.',
        })
        recordAttempt(false, undefined, 'frame-property')
        return
      }

      const preset = correspondencePresets.find(({ id }) => id === selectedCorrespondence)
      const comparisonFormula = comparisonFormulaSource.trim() ? parseFormula(comparisonFormulaSource) : undefined
      const verdict = isConstructionObjective
        ? verifyConstructionObjective(activeLevel?.structuralObjective ?? {}, { evaluationWorld })
        : verifyObjective({
          scope: evaluationScope,
          targetTruth,
          evaluationWorld,
          correspondenceProperty: preset?.property,
          comparisonTarget: activeLevel?.comparisonTarget,
        }, {
          worldIds: ids,
          edges: normalizedEdges,
          valuation: valuations,
          formula: parseFormula(formulaSource),
          comparisonFormula,
        })
      const bonusViolations = verdict.success && activeLevel?.bonusConstraints
        ? checkConstructionConstraints(constraintInput, activeLevel.bonusConstraints)
        : []
      const prediction = !isConstructionObjective && activeLevel?.prediction && predictionAnswer
        ? (() => {
            const correct = activeLevel.prediction.kind === 'truth'
              ? predictionAnswer === String(verdict.formula.holds)
              : activeLevel.prediction.kind === 'counterexample-world'
                ? Boolean(verdict.formula.truthByWorld?.some(({ worldId, value }) => worldId === predictionAnswer && !value))
                : activeLevel.prediction.kind === 'world-choice'
                  ? predictionAnswer === activeLevel.prediction.expectedChoice
                  : activeLevel.prediction.kind === 'frame-property'
                  ? predictionAnswer === activeLevel.prediction.expectedProperty
                  : predictionAnswer === activeLevel.prediction.expectedChoice
            return {
              correct,
              detail: correct
                ? 'Your prediction matched the semantic evaluation.'
                : activeLevel.prediction.kind === 'truth'
                  ? `You predicted ${predictionAnswer}, but the formula evaluated as ${verdict.formula.holds}.`
                  : activeLevel.prediction.kind === 'counterexample-world'
                    ? `${predictionAnswer} is not a counterexample world under the evaluated valuation.`
                    : activeLevel.prediction.kind === 'world-choice'
                      ? `${predictionAnswer} is not the accessible witness required here.`
                      : activeLevel.prediction.kind === 'frame-property'
                      ? `${predictionAnswer} is not the required relational property.`
                      : activeLevel.prediction.kind === 'scope-truth'
                        ? 'At least one of your local, global, or frame-valid predictions did not match.'
                      : activeLevel.prediction.kind === 'countervaluation'
                        ? `${predictionAnswer} is not the countervaluation that refutes the formula.`
                        : activeLevel.prediction.kind === 'statement-choice'
                          ? 'That interpretation is not correct for this model.'
                        : `${predictionAnswer} is not the required candidate model.`,
            }
          })()
        : undefined
      const predictionRequiredAndWrong = Boolean(activeLevel?.prediction?.mustBeCorrect && prediction && !prediction.correct)
      const overallSuccess = verdict.success && !predictionRequiredAndWrong
      const objectiveFailure = predictionRequiredAndWrong ? 'required-answer' : verdict.success ? undefined : classifyObjectiveFailure(verdict, evaluationScope, targetTruth, evaluationWorld)
      setResult({
        kind: overallSuccess ? 'success' : 'failure',
        message: predictionRequiredAndWrong ? 'Required answer incorrect' : verdict.headline,
        detail: verdict.formula.summary,
        diagnostic: objectiveFailure ? courseLesson?.diagnosticFeedback?.[objectiveFailure] : undefined,
        verdict,
        bonus: verdict.success && activeLevel?.bonusConstraints ? {
          achieved: bonusViolations.length === 0,
          detail: bonusViolations.length === 0 ? 'Optional bonus challenge achieved.' : `Bonus challenge not achieved: ${bonusViolations[0]}`,
        } : undefined,
        prediction,
      })
      recordAttempt(
        overallSuccess,
        overallSuccess && activeLevel?.bonusConstraints ? bonusViolations.length === 0 : undefined,
        objectiveFailure,
      )
      if (overallSuccess && activeLevel) {
        setCompletedLevelIds((current) => new Set([...current, activeLevel.id]))
        try {
          const signature = canonicalModelSignature({ worldIds: ids, edges: normalizedEdges, valuation: valuations, evaluationWorld }, {
            includeValuation: evaluationScope === 'pointed' || evaluationScope === 'model',
            preserveEvaluationWorld: evaluationScope === 'pointed',
          })
          setGuestProfile((current) => {
            const existing = current.solutionSignatures[activeLevel.id] ?? []
            return existing.includes(signature) ? current : {
              ...current,
              solutionSignatures: { ...current.solutionSignatures, [activeLevel.id]: [...existing, signature].slice(0, 25) },
            }
          })
        } catch { /* Diversity tracking is optional for models above the canonicalization limit. */ }
      }
    } catch (error) {
      setResult({ kind: 'error', message: error instanceof Error ? error.message : 'Verification failed.' })
      recordAttempt(false, undefined, 'syntax-or-model')
      if (error instanceof FormulaSyntaxError) {
        setLeftPanelOpen(true)
        setTimeout(() => {
          formulaInputRef.current?.focus()
          formulaInputRef.current?.setSelectionRange(error.position, Math.min(error.position + 1, formulaSource.length))
        }, 0)
      }
    }
  }

  const serializedModel = () => JSON.stringify({
    format: 'logic-model-builder',
    version: 1,
    formula: formulaSource,
    comparisonFormula: comparisonFormulaSource.trim() || undefined,
    scope: evaluationScope,
    targetTruth,
    evaluationWorld,
    correspondencePreset: selectedCorrespondence,
    worlds: worlds.map(({ id, atoms, position }) => ({ id, atoms, position })),
    edges: edges.map(({ from, to }) => ({ from, to })),
    frameRules,
  }, null, 2)

  const currentAuthorSnapshot = (): AuthorStartSnapshot => ({
    ...currentSnapshot(), formulaSource, comparisonFormulaSource, targetTruth, evaluationScope, selectedCorrespondence,
  })

  const customLevelFromSandbox = (): GameLevel => {
    const start = levelStartSnapshot ?? currentAuthorSnapshot()
    const numericBound = (value: string) => value.trim() === '' ? undefined : Number(value)
    const worldIds = start.worlds.map(({ id }) => id.trim())
    const constraints = {
      minimumWorlds: numericBound(levelBounds.minimumWorlds), maximumWorlds: numericBound(levelBounds.maximumWorlds),
      minimumEdges: numericBound(levelBounds.minimumEdges), maximumEdges: numericBound(levelBounds.maximumEdges),
      maximumChanges: numericBound(levelBounds.maximumChanges),
      requiredProperties: [...levelRequiredProperties], forbiddenProperties: [...levelForbiddenProperties],
      requiredEdges: parseAuthoredEdges(levelRequiredEdges, worldIds), forbiddenEdges: parseAuthoredEdges(levelForbiddenEdges, worldIds),
      requiredAtoms: parseAuthoredAtoms(levelRequiredAtoms, worldIds), forbiddenAtoms: parseAuthoredAtoms(levelForbiddenAtoms, worldIds),
    }
    assertCompatibleAuthoredConstraints(constraints)
    return {
    id: `custom-${levelTitle.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '') || 'mission'}`,
    chapter: 'Custom mission',
    title: levelTitle.trim() || 'Custom mission',
    concept: levelConcept.trim() || 'User-authored modal logic objective',
    conceptTags: levelConcept.split(',').map((tag) => tag.trim()).filter(Boolean),
    prerequisites: levelPrerequisites.split(',').map((item) => item.trim()).filter(Boolean),
    estimatedDifficulty: levelDifficulty,
    learningObjective: levelLearningObjective.trim() || undefined,
    instruction: levelInstruction.trim() || 'Satisfy the configured objective.',
    formula: start.formulaSource,
    comparisonFormula: start.comparisonFormulaSource.trim() || undefined,
    scope: start.evaluationScope,
    targetTruth: start.targetTruth,
    evaluationWorld: start.evaluationWorld,
    correspondencePreset: start.selectedCorrespondence as GameLevel['correspondencePreset'] || undefined,
    worlds: start.worlds.map(({ id, atoms, position }) => ({ id: id.trim(), atoms, position })),
    edges: start.edges.map(({ from, to }) => ({ from, to })),
    frameRules: start.frameRules,
    constraints,
    bonusConstraints: levelBonusMaximumEdges.trim() === '' ? undefined : { maximumEdges: Number(levelBonusMaximumEdges) },
    prediction: levelPredictionKind === 'none' ? undefined : {
      kind: levelPredictionKind,
      prompt: levelPredictionKind === 'truth' ? `Will ${start.formulaSource} satisfy the configured semantic target?` : levelPredictionKind === 'counterexample-world' ? `Which world will falsify ${start.formulaSource}?` : 'Which relational property is the intended answer?',
      expectedProperty: levelPredictionKind === 'frame-property' ? levelPredictionProperty : undefined,
      propertyChoices: levelPredictionKind === 'frame-property' ? levelPropertyNames : undefined,
      mustBeCorrect: levelPredictionKind === 'frame-property' ? true : undefined,
    },
    editable: [...levelEditable] as GameLevel['editable'],
    }
  }

  const serializedCustomLevel = () => serializeCustomLevel(customLevelFromSandbox(), levelReferenceSolution ?? undefined)

  const captureMissionStart = () => {
    setLevelStartSnapshot(currentAuthorSnapshot())
    setLevelReferenceSolution(null)
    setDataMessage('Mission start captured. Close this dialog, construct a solution, then capture it here.')
  }

  const captureReferenceSolution = () => {
    try {
      if (!levelStartSnapshot) throw new Error('Capture the mission start before capturing its solution.')
      const solution: ReferenceSolution = {
        worlds: worlds.map(({ id, atoms, position }) => ({ id: id.trim(), atoms, position })),
        edges: edges.map(({ from, to }) => ({ from, to })), evaluationWorld, frameRules,
      }
      assertValidReferenceSolution(customLevelFromSandbox(), solution)
      setLevelReferenceSolution(solution)
      setDataMessage('Valid reference solution captured. Players will still begin from the captured mission start.')
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : 'Could not capture the reference solution.')
    }
  }

  const restoreCapturedMissionStart = () => {
    if (!levelStartSnapshot) return
    if (!window.confirm('Restore the captured mission start in the workspace? Unsaved workspace changes will be replaced.')) return
    setFormulaSource(levelStartSnapshot.formulaSource)
    setComparisonFormulaSource(levelStartSnapshot.comparisonFormulaSource)
    setTargetTruth(levelStartSnapshot.targetTruth)
    setEvaluationScope(levelStartSnapshot.evaluationScope)
    setSelectedCorrespondence(levelStartSnapshot.selectedCorrespondence)
    restoreSnapshot(levelStartSnapshot)
    setNextWorldKey(Math.max(-1, ...levelStartSnapshot.worlds.map(({ key }) => key)) + 1)
    setNextEdgeKey(Math.max(-1, ...levelStartSnapshot.edges.map(({ key }) => key)) + 1)
    setDataMessage('Captured mission start restored in the workspace.')
    setShowDataManager(false)
  }

  const playtestCustomMission = () => {
    try {
      if (!levelStartSnapshot) throw new Error('Capture the mission start before playtesting.')
      const contents = serializedCustomLevel()
      const level = parseCustomLevelFile(JSON.parse(contents))
      sandboxBeforeCampaign.current = { formulaSource, comparisonFormulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope }
      setCustomLevels([level])
      setGameMode('custom')
      loadLevel(0, [level])
      setAppView('workspace')
      setShowDataManager(false)
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : 'Could not start the custom mission playtest.')
    }
  }

  const serializedProfile = () => JSON.stringify({
    format: 'logic-model-builder-profile', version: 1,
    contentRevision: currentCampaignContentRevision,
    guest: guestProfile,
    completedLevelIds: [...completedLevelIds],
  }, null, 2)

  const openDataManager = () => {
    setImportSource(serializedModel())
    setDataMessage('')
    setShowDataManager(true)
  }

  const resetSavedProgress = () => {
    if (!window.confirm('Reset all tutorial and campaign progress?')) return
    setCompletedLevelIds(new Set())
    setReferenceSolutionViewed(new Set())
    setLearnProgress(emptyLearnProgress())
    setDataMessage('Tutorial, course, and campaign progress was reset.')
  }

  const resetSavedSandbox = () => {
    if (!window.confirm('Reset the sandbox to its initial model?')) return
    setGameMode('sandbox')
    setFormulaSource('◇p')
    setWorlds(initialWorlds)
    setEdges(initialEdges)
    setEvaluationWorld('w0')
    setTargetTruth(true)
    setEvaluationScope('pointed')
    setComparisonFormulaSource('')
    setFrameRules(defaultFrameRules)
    setNextWorldKey(2)
    setNextEdgeKey(1)
    setResult(null)
    sandboxBeforeCampaign.current = null
    setDataMessage('The sandbox was reset.')
  }

  const importModel = () => {
    try {
      const imported = JSON.parse(importSource) as Record<string, unknown>
      if (imported.format === 'logic-model-builder-profile' && imported.version === 1) {
        const guest = imported.guest as Partial<GuestProfile> | undefined
        if (!guest || typeof guest.id !== 'string' || typeof guest.createdAt !== 'string' || !Array.isArray(guest.history)) throw new Error('Invalid guest profile backup.')
        const history = guest.history.filter((entry): entry is HistoryEntry => Boolean(entry && typeof entry.id === 'string' && typeof entry.timestamp === 'string' && typeof entry.title === 'string' && typeof entry.success === 'boolean')).slice(0, 250)
        const knownIds = new Set([...tutorialLevels, ...campaignTracks.flatMap((track) => track.levels), ...guidedCampaigns.flatMap((campaign) => campaign.levels)].map((level) => level.id))
        const importedContentRevision = typeof imported.contentRevision === 'number' ? imported.contentRevision : 1
        const progress = Array.isArray(imported.completedLevelIds) ? imported.completedLevelIds.filter((id): id is string => typeof id === 'string'
          && knownIds.has(id)
          && (importedContentRevision >= currentCampaignContentRevision || !revisedCampaignLevelIds.has(id))) : []
        const rawSolutions = guest.solutionSignatures && typeof guest.solutionSignatures === 'object' ? guest.solutionSignatures : {}
        const solutionSignatures = Object.fromEntries(Object.entries(rawSolutions).filter(([, signatures]) => Array.isArray(signatures)).map(([levelId, signatures]) => [levelId, [...new Set((signatures as unknown[]).filter((signature): signature is string => typeof signature === 'string'))].slice(0, 25)]))
        setGuestProfile({ id: guest.id, createdAt: guest.createdAt, history, solutionSignatures })
        setCompletedLevelIds(new Set(progress))
        setShowDataManager(false)
        return
      }
      if (imported.format === 'logic-model-builder-campaign') {
        const campaign = parseCustomCampaign(imported)
        const levels = campaign.missions.map(({ level }) => level)
        if (gameMode === 'sandbox') sandboxBeforeCampaign.current = { formulaSource, comparisonFormulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope }
        setCustomLevels(levels)
        setCustomCampaignTitle(campaign.title)
        setGameMode('custom')
        setAppView('workspace')
        loadLevel(0, levels)
        setShowDataManager(false)
        return
      }
      if (imported.format === 'logic-model-builder-level') {
        const importedLevel = parseCustomLevelFile(imported)
        if (gameMode === 'sandbox') sandboxBeforeCampaign.current = { formulaSource, comparisonFormulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope }
        setCustomLevels([importedLevel])
        setGameMode('custom')
        setAppView('workspace')
        loadLevel(0, [importedLevel])
        setShowDataManager(false)
        return
      }
      if (imported.format !== 'logic-model-builder' || imported.version !== 1) throw new Error('Unsupported model format or version.')
      if (typeof imported.formula !== 'string') throw new Error('The imported formula is missing.')
      parseFormula(imported.formula)
      if (!Array.isArray(imported.worlds) || imported.worlds.length === 0) throw new Error('The imported model must contain at least one world.')
      const importedWorlds = imported.worlds.map((item, key) => {
        if (!item || typeof item !== 'object') throw new Error('Invalid world data.')
        const world = item as Record<string, unknown>
        if (typeof world.id !== 'string' || !world.id.trim() || typeof world.atoms !== 'string') throw new Error('Every imported world needs a name and atom list.')
        if (world.atoms.split(/[\s,]+/u).filter(Boolean).some((atom) => !/^[A-Za-z][A-Za-z0-9_]*$/u.test(atom))) throw new Error(`Invalid atom list at ${world.id}.`)
        const position = world.position as { x?: unknown; y?: unknown } | undefined
        return { key, id: world.id.trim(), atoms: world.atoms, position: {
          x: typeof position?.x === 'number' ? position.x : 90 + (key % 3) * 240,
          y: typeof position?.y === 'number' ? position.y : 90 + Math.floor(key / 3) * 150,
        } }
      })
      const ids = importedWorlds.map(({ id }) => id)
      if (new Set(ids).size !== ids.length) throw new Error('Imported world names must be unique.')
      if (!Array.isArray(imported.edges)) throw new Error('Invalid relation data.')
      const importedEdges = imported.edges.map((item, key) => {
        if (!item || typeof item !== 'object') throw new Error('Invalid relation data.')
        const edge = item as Record<string, unknown>
        if (typeof edge.from !== 'string' || typeof edge.to !== 'string' || !ids.includes(edge.from) || !ids.includes(edge.to)) throw new Error('An imported relation references an unknown world.')
        return { key, from: edge.from, to: edge.to }
      })
      const scope = ['pointed', 'model', 'frame', 'correspondence'].includes(String(imported.scope)) ? imported.scope as EvaluationScope : 'pointed'
      const importedEvaluationWorld = typeof imported.evaluationWorld === 'string' && ids.includes(imported.evaluationWorld) ? imported.evaluationWorld : ids[0]
      const rawRules = imported.frameRules && typeof imported.frameRules === 'object' ? imported.frameRules as Record<string, unknown> : {}
      const importedRules = Object.fromEntries(Object.keys(defaultFrameRules).map((property) => {
        const mode = rawRules[property]
        const canEnforce = ['reflexive', 'symmetric', 'transitive', 'euclidean'].includes(property)
        return [property, mode === 'validate' || (mode === 'enforce' && canEnforce) ? mode : 'off']
      })) as FrameRules
      setGameMode('sandbox')
      setAppView('workspace')
      setFormulaSource(imported.formula)
      const importedComparison = typeof imported.comparisonFormula === 'string' ? imported.comparisonFormula.trim() : ''
      if (importedComparison) parseFormula(importedComparison)
      setComparisonFormulaSource(importedComparison)
      setWorlds(importedWorlds)
      setEdges(importedEdges)
      setEvaluationWorld(importedEvaluationWorld)
      setEvaluationScope(scope)
      setTargetTruth(typeof imported.targetTruth === 'boolean' ? imported.targetTruth : true)
      setFrameRules(importedRules)
      setSelectedCorrespondence(typeof imported.correspondencePreset === 'string' && correspondencePresets.some(({ id }) => id === imported.correspondencePreset) ? imported.correspondencePreset : '')
      setNextWorldKey(importedWorlds.length)
      setNextEdgeKey(importedEdges.length)
      setResult(null)
      setShowDataManager(false)
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : 'Could not import the model.')
    }
  }

  const downloadModel = () => {
    downloadJson(serializedModel(), 'kripke-model.json')
  }

  const duplicateBuiltInMission = () => {
    const templates = [...tutorialLevels, ...campaignTracks.flatMap((track) => track.levels), ...guidedCampaigns.flatMap((campaign) => campaign.levels)]
    const source = templates.find(({ id }) => id === authorTemplateId)
    if (!source) return
    const duplicatedWorlds = source.worlds.map((world, key) => ({ ...world, key }))
    const duplicatedEdges = source.edges.map((edge, key) => ({ ...edge, key }))
    const duplicatedRules = { ...defaultFrameRules, ...source.frameRules }
    setFormulaSource(source.formula ?? '')
    setComparisonFormulaSource(source.comparisonFormula ?? '')
    setWorlds(duplicatedWorlds)
    setEdges(duplicatedEdges)
    setEvaluationWorld(source.evaluationWorld)
    setEvaluationScope(source.scope ?? 'pointed')
    setTargetTruth(source.targetTruth ?? true)
    setFrameRules(duplicatedRules)
    setLevelTitle(`${source.title} copy`)
    setLevelInstruction(source.instruction)
    setLevelLearningObjective(source.learningObjective ?? '')
    setLevelConcept(source.concept)
    setLevelPrerequisites(source.prerequisites?.join(', ') ?? '')
    setLevelDifficulty(source.estimatedDifficulty ?? 'intermediate')
    setLevelEditable(new Set(source.editable))
    setLevelBounds({
      minimumWorlds: source.constraints?.minimumWorlds?.toString() ?? '', maximumWorlds: source.constraints?.maximumWorlds?.toString() ?? '',
      minimumEdges: source.constraints?.minimumEdges?.toString() ?? '', maximumEdges: source.constraints?.maximumEdges?.toString() ?? '', maximumChanges: source.constraints?.maximumChanges?.toString() ?? '',
    })
    setLevelRequiredProperties(new Set(source.constraints?.requiredProperties ?? []))
    setLevelForbiddenProperties(new Set(source.constraints?.forbiddenProperties ?? []))
    setLevelRequiredEdges(source.constraints?.requiredEdges?.map(({ from, to }) => `${from} -> ${to}`).join(', ') ?? '')
    setLevelForbiddenEdges(source.constraints?.forbiddenEdges?.map(({ from, to }) => `${from} -> ${to}`).join(', ') ?? '')
    const atomText = (values?: Readonly<Record<string, readonly string[]>>) => values ? Object.entries(values).map(([world, atoms]) => `${world}: ${atoms.join(' ')}`).join('; ') : ''
    setLevelRequiredAtoms(atomText(source.constraints?.requiredAtoms))
    setLevelForbiddenAtoms(atomText(source.constraints?.forbiddenAtoms))
    setLevelStartSnapshot({ worlds: duplicatedWorlds, edges: duplicatedEdges, evaluationWorld: source.evaluationWorld, frameRules: duplicatedRules, formulaSource: source.formula ?? '', comparisonFormulaSource: source.comparisonFormula ?? '', targetTruth: source.targetTruth ?? true, evaluationScope: source.scope ?? 'pointed', selectedCorrespondence: source.correspondencePreset ?? '' })
    setLevelReferenceSolution(null)
    setMissionAuditFindings([])
    setDataMessage(`Duplicated “${source.title}”. Capture a new reference solution before export.`)
    setShowDataManager(true)
  }

  const runMissionAudit = (): boolean => {
    try {
      const findings = auditMission(customLevelFromSandbox(), levelReferenceSolution ?? undefined)
      setMissionAuditFindings(findings)
      const errors = findings.filter(({ severity }) => severity === 'error')
      setDataMessage(errors.length ? `Mission audit found ${errors.length} blocking issue(s).` : 'Mission audit passed. Review any warnings before sharing.')
      return errors.length === 0
    } catch (error) {
      setMissionAuditFindings([{ severity: 'error', check: 'Mission configuration', detail: error instanceof Error ? error.message : 'The mission cannot be audited.' }])
      setDataMessage(error instanceof Error ? error.message : 'The mission cannot be audited.')
      return false
    }
  }

  const validateAuthorStep = (step: number): readonly string[] => {
    if (step === 1) return [
      !levelTitle.trim() && 'Enter a mission title.',
      !levelInstruction.trim() && 'Enter a learner-facing instruction.',
      !levelLearningObjective.trim() && 'Enter a learning objective.',
      !levelConcept.trim() && 'Add at least one concept tag.',
    ].filter((message): message is string => Boolean(message))
    if (step === 2) return levelStartSnapshot ? [] : ['Capture the initial model before continuing.']
    if (step === 3) {
      const errors: string[] = []
      try { parseFormula(formulaSource) } catch (error) { errors.push(error instanceof Error ? error.message : 'Enter a valid formula.') }
      const snapshot = levelStartSnapshot ?? currentAuthorSnapshot()
      if (!snapshot.worlds.some(({ id }) => id.trim() === evaluationWorld)) errors.push('Select an evaluation world that exists in the captured start.')
      return errors
    }
    if (step === 4) return levelEditable.size > 0 ? [] : ['Unlock at least one player control.']
    if (step === 5) {
      try { customLevelFromSandbox(); return [] } catch (error) { return [error instanceof Error ? error.message : 'The constraints are invalid.'] }
    }
    if (step === 7) return [
      !levelStartSnapshot && 'Capture the initial model first.',
      !levelReferenceSolution && 'Capture and verify a reference solution.',
    ].filter((message): message is string => Boolean(message))
    return []
  }

  const goToAuthorStep = (step: number) => {
    if (!visitedAuthorSteps.has(step) && step !== authorStep) return
    setAuthorStep(step)
    setAuthorStepErrors([])
  }

  const advanceAuthorStep = () => {
    const errors = validateAuthorStep(authorStep)
    if (errors.length > 0) { setAuthorStepErrors(errors); return }
    if (authorStep === 8 && !runMissionAudit()) { setAuthorStepErrors(['Resolve the blocking audit findings before export/share.']); return }
    const next = Math.min(9, authorStep + 1)
    setVisitedAuthorSteps((current) => new Set([...current, next]))
    setAuthorStep(next)
    setAuthorStepErrors([])
  }

  const authorCanExport = missionAuditFindings.length > 0 && !missionAuditFindings.some(({ severity }) => severity === 'error')

  const downloadCustomLevel = () => {
    try {
      if (!runMissionAudit()) return
      const contents = serializedCustomLevel()
      parseCustomLevelFile(JSON.parse(contents))
      downloadJson(contents, `${customLevelFromSandbox().id}.json`)
      setDataMessage('Custom mission exported.')
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : 'Could not export the custom mission.')
    }
  }

  const addMissionToCustomCampaign = () => {
    try {
      if (!runMissionAudit()) return
      const mission = parseCustomLevelPackage(JSON.parse(serializedCustomLevel()))
      if (authoredCampaignMissions.some(({ level }) => level.id === mission.level.id)) throw new Error(`The campaign already contains mission id “${mission.level.id}”. Change the mission title before adding another version.`)
      setAuthoredCampaignMissions((current) => [...current, mission])
      setDataMessage(`Added “${mission.level.title}” to the custom campaign.`)
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : 'Could not add the mission to the campaign.')
    }
  }

  const downloadCustomCampaign = () => {
    try {
      const contents = serializeCustomCampaign(customCampaignTitle, customCampaignDescription, authoredCampaignMissions)
      parseCustomCampaign(JSON.parse(contents))
      const filename = `${customCampaignTitle.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '') || 'custom-campaign'}.json`
      downloadJson(contents, filename)
      setDataMessage('Custom campaign exported.')
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : 'Could not export the custom campaign.')
    }
  }

  const generateMissionShareLink = () => {
    try {
      if (!runMissionAudit()) return
      const contents = serializedCustomLevel()
      parseCustomLevelPackage(JSON.parse(contents))
      setShareLink(createShareUrl(contents))
      setDataMessage('Share link generated. Anyone opening it will start this mission locally in their browser.')
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : 'Could not generate the mission link.')
    }
  }

  const generateCampaignShareLink = () => {
    try {
      const contents = serializeCustomCampaign(customCampaignTitle, customCampaignDescription, authoredCampaignMissions)
      parseCustomCampaign(JSON.parse(contents))
      setShareLink(createShareUrl(contents))
      setDataMessage('Campaign share link generated.')
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : 'Could not generate the campaign link.')
    }
  }

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setDataMessage('Share link copied to the clipboard.')
    } catch {
      setDataMessage('Clipboard access was unavailable. Select and copy the visible link manually.')
    }
  }

  const downloadFile = (contents: string, filename: string, type: string) => {
    const url = URL.createObjectURL(new Blob([contents], { type }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const downloadJson = (contents: string, filename: string) => downloadFile(contents, filename, 'application/json')

  const downloadEducatorResults = () => {
    const csv = createEducatorCsv(guestProfile.id, guestProfile.history)
    downloadFile(csv, `logic-model-builder-results-${guestProfile.id.slice(0, 8)}.csv`, 'text/csv;charset=utf-8')
  }

  const clearLocalHistory = () => {
    if (!window.confirm('Clear this guest profile history? Learning progress will remain unchanged.')) return
    setGuestProfile((current) => ({ ...current, history: [] }))
  }

  const returnToGuidedBrowser = () => {
    if (gameMode === 'learn' || gameMode === 'tutorial') setAppView('learn')
    else if (gameMode === 'guidedCampaign') { setCampaignSection('challenges'); setAppView('campaigns') }
    else if (gameMode === 'custom') {
      exitCampaign()
      setAppView('workspace')
    }
    else {
      setCampaignTrackIndex(playingTrackIndex ?? campaignTrackIndex)
      setCampaignSection('practice')
      setAppView('campaigns')
    }
  }

  const goBack = () => {
    if (appView === 'workspace') {
      if (isGuidedMode) returnToGuidedBrowser()
      else setAppView('home')
      return
    }
    if (appView === 'welcome') setAppView('learn')
    else if (appView === 'tutorial' || appView === 'campaigns' || appView === 'practice' || appView === 'create') setAppView('home')
    else setAppView('home')
  }

  const activeGuideTabs: readonly (readonly [GuideTab, string])[] = guideTab === 'objectives' || guideTab === 'controls'
    ? [['controls', 'Controls'], ['objectives', 'Objectives & constraints']]
    : [['theory', 'Frames & models'], ['operators', 'Box & diamond'], ['scopes', 'Semantic scopes'], ['relations', 'Relations & axioms'], ['glossary', 'Glossary']]

  const nextIncompleteLearnLesson = learnLessons.find((lesson) => !learnProgress.completedLessonIds.includes(lesson.id))
  const nextLearningTitle = !learnProgress.welcomeViewed
    ? 'Welcome to Modal Logic'
    : nextTutorialIndex >= 0
      ? tutorialLevels[nextTutorialIndex].title
      : nextIncompleteLearnLesson?.title
  const missionHeaderMode: MissionHeaderMode = gameMode === 'guidedCampaign' ? 'campaign' : gameMode === 'campaign' ? 'practice' : gameMode === 'custom' ? 'custom' : 'learn'
  const questionFeedback = isQuestionTask && result && 'prediction' in result && result.prediction
    ? { correct: result.prediction.correct, detail: buildQuestionFeedback({ attemptCount: activeLevelFailureCount + (result.prediction.correct ? 0 : 1), detail: result.prediction.detail, correct: result.prediction.correct, lesson: courseLesson }) }
    : undefined
  const missionSectionTitle = courseLesson && activeLearnChapter
    ? activeLearnChapter.title
    : isHowToPlay
      ? 'Learn the Controls'
      : gameMode === 'guidedCampaign'
        ? selectedGuidedCampaign.title
        : gameMode === 'campaign'
          ? playingTrack.title
          : gameMode === 'custom'
            ? customSequenceLabel
            : activeLevel?.chapter ?? ''
  const missionProgressLabel = courseLesson && activeLearnChapter
    ? `Lesson ${activeLearnChapterIndex + 1} of ${activeLearnChapter.lessons.length}`
    : isHowToPlay
      ? `Lesson ${campaignLevelIndex + 1} of ${tutorialLevels.length}`
      : `Mission ${campaignLevelIndex + 1} of ${activeLevels.length}`
  const missionNavigationUnit = focusedIntroWorkspace ? 'lesson' : 'mission'
  const hasMissionDetails = Boolean(activeLevel && (
    activeLevel.briefing
    || activeLevel.learningObjective
    || activeLevel.workspacePresentation?.visibleConstraints?.length
    || activeLevel.targetAnalysis?.length
    || activeLevel.hints?.length
    || activeLevel.referenceSolution
    || courseLesson?.hints.length
    || activeLevel.formula
  ))
  const backLabel = appView !== 'workspace'
    ? 'Back'
    : gameMode === 'learn' || gameMode === 'tutorial'
      ? 'Back to Learn'
      : gameMode === 'guidedCampaign'
        ? 'Back to Campaigns'
        : gameMode === 'campaign'
          ? 'Back to Practice'
          : gameMode === 'custom'
            ? 'Return to sandbox'
            : 'Back to Home'

  return (
    <div className={`page-shell density-${interfaceDensity} ${reduceMotion ? 'force-reduced-motion' : ''} ${gameMode === 'custom' && authorPreview === 'mobile' ? 'author-preview-mobile' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <div className="brand">{appView !== 'home' && <button className="back-button" type="button" onClick={goBack} aria-label={backLabel === 'Back' ? 'Go back' : backLabel}>← <span>{backLabel}</span></button>}<span className="brand-mark">◇</span><strong>Logic Model Builder</strong><nav className="product-nav" aria-label="Global navigation"><button className={appView === 'home' ? 'active' : ''} type="button" onClick={() => setAppView('home')}>Home</button><button className={appView === 'learn' || appView === 'welcome' || (appView === 'workspace' && (gameMode === 'learn' || gameMode === 'tutorial')) ? 'active' : ''} type="button" onClick={() => setAppView('learn')}>Learn</button><button className={appView === 'campaigns' || (appView === 'workspace' && (gameMode === 'guidedCampaign' || gameMode === 'campaign')) ? 'active' : ''} type="button" onClick={() => setAppView('campaigns')}>Campaigns</button><button className={appView === 'workspace' && gameMode === 'sandbox' ? 'active' : ''} type="button" onClick={returnToSandbox}>Sandbox</button><button className={appView === 'guide' ? 'active' : ''} type="button" onClick={() => { setGuideTab('overview'); setAppView('guide') }}>Modal Logic Guide</button></nav></div>
        <div className="topbar-actions">
          {appView === 'workspace' && <button type="button" className="text-button" onClick={resetSandbox}>{isGuidedMode ? `Restart ${missionNavigationUnit}` : 'Reset model'}</button>}
          {appView === 'workspace' && <button type="button" className="help-button" aria-label="Open Modal Logic Guide" onClick={() => { setGuideTab('controls'); setShowHelp(true) }}>Guide</button>}
          {document.fullscreenEnabled && <button type="button" className="icon-button fullscreen-button" aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} aria-pressed={isFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={() => void toggleFullscreen()}>⛶</button>}
          <div className="utility-menu" ref={utilityMenuRef}><button ref={utilityMenuButtonRef} type="button" className="text-button" aria-haspopup="menu" aria-controls="utility-menu" aria-expanded={utilityMenuOpen} onClick={() => setUtilityMenuOpen((open) => !open)}>More</button>{utilityMenuOpen && <div id="utility-menu" role="menu" className="utility-menu-popover" onKeyDown={(event) => { const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')]; const index = items.indexOf(document.activeElement as HTMLElement); if (event.key === 'Escape') { event.preventDefault(); setUtilityMenuOpen(false); requestAnimationFrame(() => utilityMenuButtonRef.current?.focus()); return } if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length; items[next]?.focus() }}>{appView === 'workspace' && <button type="button" role="menuitem" onClick={openWorkspaceTour}>Workspace tour</button>}<button type="button" role="menuitem" onClick={() => { setAppView('create'); setUtilityMenuOpen(false) }}>Create</button><button type="button" role="menuitem" onClick={() => { setAppView('profile'); setUtilityMenuOpen(false) }}>Profile</button><button type="button" role="menuitem" onClick={() => { openDataManager(); setUtilityMenuOpen(false) }}>Data</button><button type="button" role="menuitem" onClick={() => { setAppView('settings'); setUtilityMenuOpen(false) }}>Settings</button><a role="menuitem" href="https://github.com/Chrasts/Modal_Logic_Educational_Game" target="_blank" rel="noreferrer">GitHub</a></div>}</div>
        </div>
      </header>

      <main id="main-content" className="main-content" tabIndex={-1}>

      {appView !== 'workspace' && gameMode !== 'sandbox' && activeLevel && <aside className="resume-session-banner" aria-label="Current guided session"><span>Current {gameMode === 'learn' || gameMode === 'tutorial' ? 'lesson' : 'mission'} in progress: <strong>{activeLevel.title}</strong></span><button type="button" className="secondary-button" onClick={() => setAppView('workspace')}>Resume</button></aside>}

      {appView === 'home' && (
        <HomeView completed={playableLearningCompleted} total={availableLearningTotal} nextTitle={nextLearningTitle} onLearn={continueLearningPath} onCampaigns={() => setAppView('campaigns')} onSandbox={returnToSandbox} onProfile={() => setAppView('profile')} onSettings={() => setAppView('settings')} onData={openDataManager} />
      )}

      {appView === 'practice' && (
        <section className="content-screen campaign-screen" aria-labelledby="practice-screen-title">
          <div className="screen-hero compact"><div><p className="eyebrow">Non-linear skill practice</p><h1 id="practice-screen-title">Practice Library</h1><p>Choose any collection to rehearse a specific semantic objective or model-building technique. These are not guided campaigns.</p></div><div className="collection-progress"><strong>{overallCampaignCompleted}/{overallCampaignLevels}</strong><span>practice missions complete</span><div className="progress-meter"><i style={{ width: `${overallCampaignCompleted / overallCampaignLevels * 100}%` }} /></div></div></div>
          <div className="campaign-browser">
            <aside className="track-list" aria-label="Practice collection list">{campaignTracks.map((track, index) => { const completed = track.levels.filter((level) => completedLevelIds.has(level.id)).length; return <button type="button" className={campaignTrackIndex === index ? 'active' : ''} onClick={() => setCampaignTrackIndex(index)} key={track.id}><strong>{track.title}</strong><span>{completed}/{track.levels.length} complete</span></button> })}</aside>
            <div className="track-detail"><div className="track-heading"><div><p className="eyebrow">Practice collection · {selectedTrackCompleted}/{selectedTrack.levels.length} complete</p><h2>{selectedTrack.title}</h2><p>{selectedTrack.description}</p></div><button type="button" className="primary-action" onClick={() => startGuidedLevel('campaign', nextSelectedLevelIndex < 0 ? 0 : nextSelectedLevelIndex, campaignTrackIndex)}>{selectedTrackCompleted === 0 ? 'Start practice' : selectedTrackCompleted === selectedTrack.levels.length ? 'Replay collection' : 'Continue practice'}</button></div><div className="level-browser">{selectedTrack.levels.map((level, index) => <article className={completedLevelIds.has(level.id) ? 'complete' : ''} key={level.id}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{level.title}</h3><p>{level.concept}</p></div><b>{completedLevelIds.has(level.id) ? 'Complete' : 'Not completed'}</b><button type="button" onClick={() => gameMode === 'campaign' && playingTrackIndex === campaignTrackIndex && campaignLevelIndex === index ? setAppView('workspace') : startGuidedLevel('campaign', index, campaignTrackIndex)}>{gameMode === 'campaign' && playingTrackIndex === campaignTrackIndex && campaignLevelIndex === index ? 'Resume' : completedLevelIds.has(level.id) ? 'Replay' : 'Practice'}</button></article>)}</div></div>
          </div>
        </section>
      )}

      {appView === 'learn' && (
        <section className="content-screen learn-course-screen" aria-labelledby="learn-course-title">
          <div className="screen-hero compact"><div><p className="eyebrow">Your recommended learning path</p><h1 id="learn-course-title">Learn Modal Logic</h1><p>Welcome, learn the controls, then work through finite Kripke semantics one section at a time.</p>{playableLearningCompleted < availableLearningTotal && <button type="button" className="primary-action" onClick={continueLearningPath}>{playableLearningCompleted === 0 ? 'Start Learning' : 'Continue Learning'}</button>}</div><div className="collection-progress" role="status"><strong>{playableLearningCompleted}/{availableLearningTotal}</strong><span>{playableLearningCompleted === availableLearningTotal ? 'course complete' : 'available tasks complete'}</span><div className="progress-meter"><i style={{ width: `${playableLearningCompleted / availableLearningTotal * 100}%` }} /></div></div></div>
          <div className="learn-chapter-list">
            <article><div><p className="eyebrow">{learnProgress.welcomeViewed ? 'Viewed' : 'Not viewed'}</p><h2>Welcome to Modal Logic</h2><p>Possible worlds, accessibility, possibility, necessity, and how guided tasks work.</p></div><button type="button" className={learnProgress.welcomeViewed ? 'secondary-button' : 'primary-action'} onClick={() => setAppView('welcome')}>{learnProgress.welcomeViewed ? 'Replay introduction' : 'Open introduction'}</button></article>
            <article className={`${tutorialCompleted === tutorialLevels.length ? 'complete ' : ''}${expandedLearnChapterId === 'controls' ? 'expanded' : ''}`}>
              <div><p className="eyebrow">{tutorialCompleted === tutorialLevels.length ? 'Completed' : 'Available'}</p><h2>Learn the Controls</h2><p>Use the shared model editor before beginning semantic lessons.</p><small>{tutorialCompleted}/{tutorialLevels.length} lessons</small>{expandedLearnChapterId === 'controls' && <div className="chapter-lesson-outline"><ol>{tutorialLevels.map((level, index) => {
                const lessonComplete = completedLevelIds.has(level.id)
                const lessonCurrent = !lessonComplete && index === nextTutorialIndex
                return <li className={lessonComplete ? 'complete' : lessonCurrent ? 'current' : ''} key={level.id}><span><b>{level.title}</b><small>{lessonComplete ? 'Completed' : lessonCurrent ? 'Current' : 'Unfinished'}</small></span><button type="button" className={lessonComplete ? 'secondary-button' : 'text-button'} onClick={() => startGuidedLevel('tutorial', index)}>{lessonComplete ? 'Replay' : 'Open'}</button></li>
              })}</ol></div>}</div>
              <div className="chapter-actions"><button type="button" className={tutorialCompleted === tutorialLevels.length ? 'secondary-button' : 'primary-action'} onClick={() => startGuidedLevel('tutorial', nextTutorialIndex < 0 ? 0 : nextTutorialIndex)}>{tutorialCompleted === tutorialLevels.length ? 'Replay section' : tutorialCompleted > 0 ? 'Continue' : 'Start'}</button><button type="button" className="text-button" aria-expanded={expandedLearnChapterId === 'controls'} onClick={() => setExpandedLearnChapterId((current) => current === 'controls' ? null : 'controls')}>{expandedLearnChapterId === 'controls' ? 'Hide lessons' : 'View lessons'}</button>{tutorialCompleted > 0 && tutorialCompleted < tutorialLevels.length && <button type="button" className="text-button" onClick={restartControlsSection}>Restart section</button>}</div>
            </article>
            {learnCourse.chapters.map((chapter) => {
              const completed = chapter.lessons.filter((lesson) => learnProgress.completedLessonIds.includes(lesson.id)).length
              const chapterComplete = completed === chapter.lessons.length && chapter.lessons.length > 0
              const available = chapter.lessons.length > 0
              const currentIndex = learnLessons.findIndex((lesson) => lesson.chapterId === chapter.id && !learnProgress.completedLessonIds.includes(lesson.id))
              const expanded = expandedLearnChapterId === chapter.id
              return <article className={`${chapterComplete ? 'complete ' : ''}${expanded ? 'expanded' : ''}`} key={chapter.id}>
                <div><p className="eyebrow">{chapter.lessons.length === 0 ? 'Coming later' : chapterComplete ? 'Completed' : 'Available'}</p><h2>{chapter.title}</h2><p>{chapter.description}</p>{chapter.prerequisiteChapterIds.length > 0 && <p className="chapter-prerequisites">Recommended after: {chapter.prerequisiteChapterIds.map((id) => learnCourse.chapters.find((candidate) => candidate.id === id)?.title ?? id).join(', ')}</p>}{available && <small>{completed}/{chapter.lessons.length} lessons</small>}{expanded && <div className="chapter-lesson-outline"><ol>{chapter.lessons.map((lesson) => {
                  const lessonComplete = learnProgress.completedLessonIds.includes(lesson.id)
                  const lessonCurrent = learnProgress.currentLessonId === lesson.id || (!chapterComplete && learnLessons[currentIndex]?.id === lesson.id)
                  return <li className={lessonComplete ? 'complete' : lessonCurrent ? 'current' : ''} key={lesson.id}><span><b>{lesson.title}</b><small>{lessonComplete ? 'Completed' : lessonCurrent ? 'Current' : 'Unfinished'}</small></span><button type="button" className={lessonComplete ? 'secondary-button' : 'text-button'} onClick={() => startLearnLesson(learnLessons.findIndex(({ id }) => id === lesson.id))}>{lessonComplete ? 'Replay' : 'Open'}</button></li>
                })}</ol>{chapterComplete && <div className="chapter-recap"><strong>Section recap</strong><ul>{chapter.completionSummary.map((item) => <li key={item}>{item}</li>)}</ul>{chapter.recapQuestions && <ChapterRecapQuestions questions={chapter.recapQuestions} />}{chapter.nextPreview && <p>{chapter.nextPreview}</p>}</div>}</div>}</div>
                {available ? <div className="chapter-actions"><button type="button" className={chapterComplete ? 'secondary-button' : 'primary-action'} onClick={() => startLearnLesson(currentIndex < 0 ? learnLessons.findIndex((lesson) => lesson.chapterId === chapter.id) : currentIndex)}>{chapterComplete ? 'Replay section' : completed > 0 ? 'Continue' : 'Start'}</button><button type="button" className="text-button" aria-expanded={expanded} onClick={() => setExpandedLearnChapterId((current) => current === chapter.id ? null : chapter.id)}>{expanded ? 'Hide lessons' : 'View lessons'}</button>{!chapterComplete && completed > 0 && <button type="button" className="text-button" onClick={() => restartLearnChapter(chapter.id)}>Restart section</button>}</div> : <span className="chapter-coming">Coming later</span>}
              </article>
            })}
          </div>
        </section>
      )}
      {appView === 'welcome' && <ModalLogicWelcome onBegin={() => { markWelcomeViewed(); startGuidedLevel('tutorial', nextTutorialIndex < 0 ? 0 : nextTutorialIndex) }} onSkip={() => { markWelcomeViewed(); startGuidedLevel('tutorial', nextTutorialIndex < 0 ? 0 : nextTutorialIndex) }} onBack={() => setAppView('learn')} />}
      {appView === 'settings' && (
        <section className="content-screen settings-screen" aria-labelledby="settings-title">
          <div className="screen-hero compact"><div><p className="eyebrow">Local preferences</p><h1 id="settings-title" className="clean-display">Settings</h1><p>These display preferences are stored only in this browser and do not change modal semantics or mission rules.</p></div></div>
          <div className="settings-grid">
            <article><h2>Workspace density</h2><p>Comfortable spacing favors reading; compact spacing keeps more controls visible.</p><div className="settings-choice"><button type="button" className={interfaceDensity === 'comfortable' ? 'active' : ''} aria-pressed={interfaceDensity === 'comfortable'} onClick={() => setInterfaceDensity('comfortable')}>Comfortable</button><button type="button" className={interfaceDensity === 'compact' ? 'active' : ''} aria-pressed={interfaceDensity === 'compact'} onClick={() => setInterfaceDensity('compact')}>Compact</button></div></article>
            <article><h2>Map display</h2><label><input type="checkbox" checked={showMinimap} onChange={(event) => setShowMinimap(event.target.checked)} /> Show minimap</label><label><input type="checkbox" checked={showDerivedEdges} onChange={(event) => setShowDerivedEdges(event.target.checked)} /> Show derived relations</label><p>Display only. Enforced derived relations still affect verification when hidden.</p></article>
            <article><h2>Motion</h2><label><input type="checkbox" checked={reduceMotion} onChange={(event) => setReduceMotion(event.target.checked)} /> Reduce interface animation</label><p>The operating-system reduced-motion preference is respected independently.</p></article>
            <article><h2>Sound</h2><label><input type="checkbox" checked={soundEffects} onChange={(event) => setSoundEffects(event.target.checked)} /> Sound effects</label><p>Short create and verification cues only. Sound is off by default; there is no background music.</p></article>
            <article><h2>Window</h2><p>Fullscreen is available directly from the global toolbar when the browser and embedding policy support it.</p></article>
            <article><h2>Privacy</h2><p>Models, formulas, settings, and study history stay in this browser. They are not automatically sent anywhere. This build uses no analytics SDK or tracking cookies; explicit exports and share links contain only the data you choose to share.</p><button type="button" className="secondary-button" onClick={openDataManager}>Manage local data</button></article>
            <article><h2>Reset preferences</h2><p>Restore comfortable density, minimap and derived relations on, motion override and sound off, and both workspace panels open. Learning and model data are untouched.</p><button type="button" className="secondary-button" onClick={resetInterfacePreferences}>Reset interface preferences</button></article>
          </div>
        </section>
      )}

      {appView === 'tutorial' && (
        <section className="content-screen tutorial-screen" aria-labelledby="tutorial-screen-title">
          <div className="screen-hero"><div><p className="eyebrow">Learn Modal Logic · controls</p><h1 id="tutorial-screen-title">Learn the Controls</h1><p>{tutorialLevels.length} short steps teach the basic workspace controls: worlds, valuations, directed arrows, and the evaluation world.</p></div><div className="hero-action"><strong>{tutorialCompleted}/{tutorialLevels.length}</strong><span>steps complete</span><div className="progress-meter" aria-label={`${tutorialCompleted} of ${tutorialLevels.length} tutorial steps complete`}><i style={{ width: `${tutorialCompleted / tutorialLevels.length * 100}%` }} /></div><button type="button" className="primary-action" onClick={() => startGuidedLevel('tutorial', nextTutorialIndex < 0 ? 0 : nextTutorialIndex)}>{tutorialCompleted === tutorialLevels.length ? 'Replay controls' : tutorialCompleted > 0 ? 'Continue controls' : 'Start controls'}</button></div></div>
          <div className="screen-note"><strong>How it works</strong><span>Each step opens the shared workspace with only the required controls unlocked. Progress is stored in this browser.</span></div>
          <div className="level-browser">{tutorialLevels.map((level, index) => <article className={completedLevelIds.has(level.id) ? 'complete' : ''} key={level.id}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{level.title}</h2><p>{level.concept}</p></div><b>{completedLevelIds.has(level.id) ? 'Complete' : 'Not completed'}</b><button type="button" onClick={() => startGuidedLevel('tutorial', index)}>{gameMode === 'tutorial' && campaignLevelIndex === index ? 'Continue' : 'Play'}</button></article>)}</div>
        </section>
      )}

      {appView === 'campaigns' && (
        <section className="content-screen campaign-screen" aria-labelledby="campaign-screen-title">
          <div className="screen-hero compact"><div><p className="eyebrow">Challenges and practice</p><h1 id="campaign-screen-title">Campaigns</h1><p>Choose longer challenges or focused practice collections.</p><div className="learn-callout"><strong>New to modal logic?</strong><button type="button" className="secondary-button" onClick={() => setAppView('learn')}>Open Learn</button></div></div></div>
          <div className="campaign-section-tabs" role="tablist" aria-label="Campaign sections" onKeyDown={(event) => handleTabListKeyDown(event, ['challenges', 'practice'], campaignSection, setCampaignSection)}>
            {([['challenges', 'General Challenges'], ['practice', 'Practice Library']] as const).map(([section, label]) => <button key={section} type="button" role="tab" tabIndex={campaignSection === section ? 0 : -1} aria-selected={campaignSection === section} aria-controls={`campaign-${section}`} className={campaignSection === section ? 'active' : ''} onClick={() => setCampaignSection(section)}>{label}</button>)}
          </div>
          {campaignSection === 'challenges' && <section className="campaign-block" id="campaign-challenges" role="tabpanel" aria-labelledby="challenges-block-title"><div className="track-heading"><div><p className="eyebrow">Longer guided campaigns</p><h2 id="challenges-block-title">General Challenges</h2><p>Combine skills after completing the corresponding introductory ideas. Recommendations are not locks.</p></div></div><div className="learn-chapter-list">{guidedCampaigns.map((campaign, index) => { const completed = campaign.levels.filter((level) => completedLevelIds.has(level.id)).length; return <article className={completed === campaign.levels.length ? 'complete' : ''} key={campaign.id}><div><p className="eyebrow">Recommended after: {campaign.recommendedAfter}</p><h3>{campaign.title}</h3><p>{campaign.description}</p><small>{completed}/{campaign.levels.length} missions · {campaign.difficulty} · {campaign.estimatedTime}</small></div><button type="button" className="primary-action" onClick={() => startGuidedCampaign(index)}>{completed === campaign.levels.length ? 'Replay campaign' : completed ? 'Continue campaign' : 'Start campaign'}</button></article> })}</div></section>}
          {campaignSection === 'practice' && <section className="campaign-block" id="campaign-practice" role="tabpanel" aria-labelledby="practice-block-title"><div className="track-heading"><div><p className="eyebrow">Non-linear targeted exercises</p><h2 id="practice-block-title">Practice Library</h2><p>Choose a collection to rehearse a particular semantic objective or construction technique.</p></div><div className="collection-progress"><strong>{overallCampaignCompleted}/{overallCampaignLevels}</strong><span>practice missions complete</span></div></div><div className="learn-chapter-list">{campaignTracks.map((track, index) => { const completed = track.levels.filter((level) => completedLevelIds.has(level.id)).length; return <article className={completed === track.levels.length ? 'complete' : ''} key={track.id}><div><p className="eyebrow">Practice collection</p><h3>{track.title}</h3><p>{track.description}</p><small>{completed}/{track.levels.length} missions</small></div><button type="button" className="secondary-button" onClick={() => { setCampaignTrackIndex(index); setAppView('practice') }}>{completed === track.levels.length ? 'Replay collection' : completed ? 'Continue practice' : 'Open collection'}</button></article> })}</div></section>}
        </section>
      )}

      {appView === 'create' && (
        <section className="content-screen create-screen" aria-labelledby="create-screen-title">
          <div className="screen-hero compact"><div><p className="eyebrow">Authoring tools</p><h1 id="create-screen-title">Create</h1><p>Author a custom mission or package missions into a shareable custom campaign. Your content remains separate from Learn, General Challenges, and Practice Library.</p></div></div>
          <div className="home-actions play-actions"><article className="featured"><span>Custom mission</span><h2>Build a constrained objective</h2><p>Capture a starting model, configure its objective and constraints, then verify a reference solution.</p><button type="button" className="primary-action" onClick={openDataManager}>Open creation studio</button></article><article><span>Duplicate a built-in mission</span><h2>Start from a proven structure</h2><p>Copy content into the studio without changing the built-in original. The copy must receive its own reference solution.</p><select aria-label="Built-in mission template" value={authorTemplateId} onChange={(event) => setAuthorTemplateId(event.target.value)}>{[...tutorialLevels, ...campaignTracks.flatMap((track) => track.levels), ...guidedCampaigns.flatMap((campaign) => campaign.levels)].map((level) => <option value={level.id} key={level.id}>{level.chapter} · {level.title}</option>)}</select><button type="button" className="secondary-button" onClick={duplicateBuiltInMission}>Duplicate into studio</button></article><article><span>Custom campaign</span><h2>Package missions</h2><p>Combine authored missions, download a JSON package, or create a browser-shareable link.</p><button type="button" className="secondary-button" onClick={openDataManager}>Manage custom campaigns</button></article></div>
        </section>
      )}

      {appView === 'guide' && (
        <section className="content-screen guide-screen" aria-labelledby="guide-screen-title">
          <div className="screen-hero compact"><div><p className="eyebrow">Reference manual</p><h1 id="guide-screen-title" className="clean-display">Modal Logic Guide</h1><p>Look up formal Kripke semantics, modal operators, objectives, relations, controls, and terminology. Guided teaching remains in Learn.</p></div>{isGuidedMode && <button type="button" className="secondary-button" onClick={() => setAppView('workspace')}>Return to current mission</button>}</div>
          <div className="guide-actions"><button type="button" className="secondary-button" onClick={() => setAppView('welcome')}>Replay Welcome to Modal Logic</button><button type="button" className="secondary-button" onClick={() => startGuidedLevel('tutorial', 0)}>Replay Learn the Controls</button><button type="button" className="secondary-button" onClick={openWorkspaceTour}>Replay workspace tour</button><button type="button" className="secondary-button" onClick={() => setAppView('learn')}>Open Learn</button><button type="button" className="secondary-button" onClick={returnToSandbox}>Try in Sandbox</button></div>
          {guideTab !== 'overview' && <div className="guide-local-nav"><button type="button" className="guide-overview-back" onClick={() => setGuideTab('overview')}>← Guide overview</button><div className="guide-path-label">{guideTab === 'objectives' || guideTab === 'controls' ? 'How to play' : 'Formal semantics'}</div></div>}
          {guideTab !== 'overview' && <div className="guide-tabs" role="tablist" aria-label="Guide sections" onKeyDown={(event) => handleTabListKeyDown(event, activeGuideTabs.map(([tab]) => tab), guideTab, setGuideTab)}>{activeGuideTabs.map(([tab, label]) => <button type="button" role="tab" tabIndex={guideTab === tab ? 0 : -1} aria-selected={guideTab === tab} className={guideTab === tab ? 'active' : ''} onClick={() => setGuideTab(tab)} key={tab}>{label}</button>)}</div>}
          <div className="guide-page-grid">
            {guideTab === 'overview' && <div className="learn-paths guide-wide" aria-label="Learning paths">
              <button type="button" className="learn-path formal" onClick={() => setGuideTab('theory')}><span>01 · Mathematical reference</span><strong>Formal Modal Semantics</strong><p>Kripke frames and models, satisfaction, modal clauses, semantic scopes, and frame properties.</p><b>Open formal guide →</b></button>
              <button type="button" className="learn-path gameplay" onClick={() => setGuideTab('controls')}><span>02 · Game and interface</span><strong>Controls and Objectives</strong><p>Quickly look up map gestures, model editing, relation display, objectives, and local data.</p><b>Open controls reference →</b></button>
            </div>}
            {guideTab === 'theory' && <><article><h2>Kripke frame</h2><p><strong>F = ⟨W,R⟩</strong>, where W is a non-empty set of worlds and <strong>R ⊆ W × W</strong> is the accessibility relation.</p></article><article><h2>Valuation</h2><p><strong>ν: Prop → ℘(W)</strong> assigns each propositional atom the worlds at which it is true.</p></article><article><h2>Kripke model</h2><p><strong>M = ⟨W,R,ν⟩</strong>. A pointed model additionally singles out an evaluation world w.</p></article><article><h2>Satisfaction</h2><p><strong>M,w ⊨ φ</strong> means that φ is true at w in M. Boolean connectives retain their classical truth conditions at each world.</p></article></>}
            {guideTab === 'operators' && <><article><h2>Necessity</h2><p><strong>M,w ⊨ □φ</strong> iff for every v, if wRv then M,v ⊨ φ.</p></article><article><h2>Possibility</h2><p><strong>M,w ⊨ ◇φ</strong> iff there is some v such that wRv and M,v ⊨ φ.</p><StaticKripkeDiagram compact ariaLabel="Possibility witness example" evaluationWorld="w0" worlds={[{ id: 'w0', atoms: '' }, { id: 'w1', atoms: 'p' }]} edges={[{ from: 'w0', to: 'w1' }]} /></article><article><h2>Vacuous truth</h2><p>If w has no successors, □φ is true and ◇φ is false. Necessity does not require a witness; possibility does.</p></article><article><h2>Nested modalities</h2><p>In □◇p, the game checks every immediate successor and then looks from each of them for a further p-successor.</p></article></>}
            {guideTab === 'scopes' && <><article><h2>Pointed truth</h2><p><strong>M,w ⊨ φ</strong>: evaluate one selected world under the displayed valuation.</p></article><article><h2>Model-global truth</h2><p><strong>M ⊨ φ</strong>: φ must hold at every world of the displayed model while ν remains fixed.</p></article><article><h2>Frame validity</h2><p><strong>F ⊨ φ</strong>: φ must hold at every world under every valuation on the displayed finite frame.</p></article><article><h2>Counterexamples</h2><p>A pointed or global failure identifies a world. Failure of frame validity additionally supplies a countervaluation.</p></article></>}
            {guideTab === 'relations' && <><article><h2>Frame properties</h2><p>Reflexive, symmetric, transitive, serial, Euclidean, irreflexive, and acyclic describe the accessibility relation, not the current valuation.</p></article><article><h2>Validate and enforce</h2><p>Validate reports whether a relation has a property. Enforce derives the closure needed for supported properties and displays derived edges separately.</p></article><article><h2>Modal axioms</h2><p>T, D, B, 4, and 5 are modal axiom schemas. Their validity characterizes familiar classes of frames.</p></article><article><h2>Instance comparison</h2><p>The Correspondence Lab compares both sides on one finite frame. Agreement there illustrates a theorem; it is not itself a general proof.</p></article></>}
            {guideTab === 'controls' && <><MapControlsReference onReplayTour={openWorkspaceTour} /><article><h2>Local data</h2><p>Data exports or imports model JSON and resets the saved sandbox or learning progress independently.</p></article></>}
            {guideTab === 'objectives' && <><article><h2>Objective scopes</h2><p>Pointed, model-global, frame-validity, and correspondence objectives use different semantic quantification.</p></article><article><h2>Construction constraints</h2><p>Levels can bound size, require or forbid edges and atoms, and require or exclude frame properties.</p></article><article><h2>Locked inputs</h2><p>Formulas, worlds, valuations, relations, evaluation worlds, and constraint controls may be fixed.</p></article><article><h2>Optional bonuses</h2><p>Some missions evaluate an additional construction challenge only after the primary objective succeeds.</p></article></>}
            {guideTab === 'glossary' && <><article><h2>World</h2><p>An element of W representing a possible state. Worlds may share the same valuation while differing structurally.</p></article><article><h2>Successor</h2><p>v is a successor of w when wRv. Arrow direction matters.</p></article><article><h2>Valuation</h2><p>The assignment ν of propositional atoms to sets of worlds.</p></article><article><h2>Countervaluation</h2><p>A valuation witnessing that a formula is not valid on a frame.</p></article><article><h2>Explicit edge</h2><p>An accessibility pair stored directly in the construction.</p></article><article><h2>Derived edge</h2><p>An edge added by an enforced relational closure rather than drawn explicitly.</p></article></>}
          </div>
        </section>
      )}

      {appView === 'profile' && (
        <section className="content-screen profile-screen" aria-labelledby="profile-title">
          <div className="screen-hero compact"><div><p className="eyebrow">Local guest</p><h1 id="profile-title" className="clean-display">Profile and history</h1><p>This anonymous profile belongs to this browser only. No IP address, fingerprint, e-mail, or other personal identifier is collected.</p></div><div className="profile-actions"><button type="button" className="primary-action" onClick={() => downloadJson(serializedProfile(), 'logic-model-builder-profile.json')}>Download profile</button><button type="button" className="secondary-button" onClick={openDataManager}>Import backup</button></div></div>
          <div className="profile-summary"><article><span>Guest ID</span><strong>{guestProfile.id.slice(0, 8)}</strong><small>Created {new Date(guestProfile.createdAt).toLocaleDateString()}</small></article><article><span>Attempts</span><strong>{guestProfile.history.length}</strong><small>{successfulAttempts} successful verifications</small></article><article><span>Unique tasks solved</span><strong>{completedHistoryLevels}</strong><small>{completedLevelIds.size} task{completedLevelIds.size === 1 ? '' : 's'} in saved progress</small></article><article><span>Distinct solutions</span><strong>{distinctSolutions}</strong><small>Up to isomorphism within each mission</small></article></div>
          <div className="educator-export"><div><p className="eyebrow">Educator tools</p><h2>Export local results</h2><p>Download anonymous attempt-level data for a spreadsheet or learning review. The file contains this guest ID, mission context, outcomes, failure categories, and construction metrics; it never leaves this browser unless you share it.</p></div><button type="button" className="secondary-button" onClick={downloadEducatorResults} disabled={guestProfile.history.length === 0}>Download results CSV</button></div>
          {(conceptSummary.length > 0 || failureSummary.length > 0) && <div className="profile-insights">
            <article><p className="eyebrow">Concepts</p><h2>Practice by concept</h2>{conceptSummary.length ? <ul>{conceptSummary.map(([concept, counts]) => <li key={concept}><span>{concept}</span><b>{counts.successes}/{counts.attempts}</b></li>)}</ul> : <p>No classified attempts yet.</p>}</article>
            <article><p className="eyebrow">Diagnostics</p><h2>Failure categories</h2>{failureSummary.length ? <ul>{failureSummary.map(([category, count]) => <li key={category}><span>{failureCategoryLabels[category]}</span><b>{count}</b></li>)}</ul> : <p>No classified failures yet.</p>}</article>
          </div>}
          <div className="history-heading"><div><p className="eyebrow">Recent activity</p><h2>Verification history</h2></div>{guestProfile.history.length > 0 && <button type="button" className="danger-button" onClick={clearLocalHistory}>Clear history</button>}</div>
          {guestProfile.history.length === 0 ? <div className="profile-empty"><strong>No attempts recorded yet</strong><span>Verify an objective in the sandbox, tutorial, or a campaign. Up to 250 recent attempts are kept locally.</span></div> : <div className="history-list">{guestProfile.history.map((entry) => <article key={entry.id}><time dateTime={entry.timestamp}>{new Date(entry.timestamp).toLocaleString()}</time><div><strong>{entry.title}</strong><span>{entry.mode} · {entry.scope} · {entry.worldCount} worlds · {entry.edgeCount} explicit edges{entry.trueAtomCount !== undefined ? ` · ${entry.trueAtomCount} true atoms` : ''}{entry.semanticChanges !== undefined ? ` · ${entry.semanticChanges} changes` : ''}</span></div><b className={entry.success ? 'success' : 'failure'}>{entry.success ? 'Success' : 'Failed'}</b>{entry.bonusAchieved !== undefined && <em>{entry.bonusAchieved ? 'Bonus' : 'No bonus'}</em>}</article>)}</div>}
        </section>
      )}

      {appView === 'workspace' && activeLevel && (
        <MissionHeader
          mode={missionHeaderMode}
          sectionTitle={missionSectionTitle}
          itemTitle={activeLevel.title}
          progressLabel={missionProgressLabel}
          objective={activeLevel.instruction}
          state={completedLearnTask ? 'completed' : isQuestionTask ? 'question' : 'active'}
          content={completedLearnTask && courseLesson ? <div className="mission-complete-content" role="status"><strong>{learnTransferActive ? 'Transfer complete' : courseLesson.title}</strong><p>{courseLesson.successExplanation}</p>{courseLesson.commonMistake && <small><b>Common mistake:</b> {courseLesson.commonMistake}</small>}{!nextLearnChapter && activeLearnChapterIndex === activeLearnChapter!.lessons.length - 1 && <div className="course-next-links"><span>Course complete. Continue with:</span><button type="button" onClick={() => { setCampaignSection('challenges'); setAppView('campaigns') }}>Campaigns</button><button type="button" onClick={() => { exitCampaign(); setAppView('workspace') }}>Sandbox</button><button type="button" onClick={() => setAppView('guide')}>Guide</button></div>}</div>
            : isQuestionTask ? <div className="mission-question-content"><p>{activeLevel.instruction}</p><QuestionTaskPanel level={activeLevel} answer={predictionAnswer} feedback={questionFeedback} onAnswer={choosePredictionAnswer} /></div>
              : undefined}
          previouslyCompleted={completedLevelIds.has(activeLevel.id)}
          taskSteps={isHowToPlay ? activeLevel.taskSteps : undefined}
          actions={<>
            {completedLearnTask && courseLesson ? <>
              {!learnTransferActive && courseLesson.transferTask && <button type="button" className="secondary-button" onClick={() => startLearnTransfer(courseLesson.id)}>Try optional transfer</button>}
              {(activeLearnChapterIndex < activeLearnChapter!.lessons.length - 1 || nextLearnChapter?.lessons[0]) && <button type="button" className="verify-button" onClick={() => { const lesson = activeLearnChapterIndex < activeLearnChapter!.lessons.length - 1 ? activeLearnChapter!.lessons[activeLearnChapterIndex + 1] : nextLearnChapter!.lessons[0]; startLearnLesson(learnLessons.findIndex(({ id }) => id === lesson.id)) }}>Next lesson</button>}
              <button type="button" onClick={() => setAppView('learn')}>Back to Learn overview</button>
              <button type="button" onClick={() => loadLevel(campaignLevelIndex)}>Replay lesson</button>
            </> : <>
              <button type="button" disabled={courseLesson ? activeLearnChapterIndex === 0 : campaignLevelIndex === 0} onClick={() => courseLesson ? startLearnLesson(learnLessons.findIndex((lesson) => lesson.id === activeLearnChapter!.lessons[activeLearnChapterIndex - 1].id)) : loadLevel(campaignLevelIndex - 1)}>Previous {missionNavigationUnit}</button>
              <button type="button" className="verify-button" onClick={verify} disabled={(isQuestionTask && !predictionAnswer) || (!isConstructionObjective && frameValuationLimitExceeded)}>{isQuestionTask ? 'Confirm answer' : 'Check task'}</button>
              <button type="button" disabled={!completedLevelIds.has(activeLevel.id) || (courseLesson ? activeLearnChapterIndex === activeLearnChapter!.lessons.length - 1 : campaignLevelIndex === activeLevels.length - 1)} onClick={() => courseLesson ? startLearnLesson(learnLessons.findIndex((lesson) => lesson.id === activeLearnChapter!.lessons[activeLearnChapterIndex + 1].id)) : loadLevel(campaignLevelIndex + 1)}>Next {missionNavigationUnit}</button>
            </>}
          </>}
          details={hasMissionDetails ? <div className="mission-detail-sections">
            {courseLesson && <section><strong>Concept</strong><button type="button" className="secondary-button" onClick={() => setLearnConceptOpen(true)}>Review concept</button></section>}
            {activeLevel.formula && <section><strong>Target formula</strong><code>{activeLevel.formula}</code>{activeLevel.comparisonFormula && <code>{activeLevel.comparisonFormula}</code>}</section>}
            {activeLevel.briefing && <section><strong>{isHowToPlay ? 'Control help' : courseLesson ? 'Lesson details' : 'Mission details'}</strong><p>{activeLevel.briefing}</p></section>}
            {activeLevel.learningObjective && <section><strong>Learning objective</strong><p>{activeLevel.learningObjective}</p></section>}
            {(courseLesson?.chapterId === 'semantic-scopes' || activeLevel.scopeComparison) && <section className="scope-definition-card"><strong>Three semantic scopes</strong><p><b>Pointed · M,w ⊨ φ:</b> one selected world under the displayed valuation.</p><p><b>Model-global · M ⊨ φ:</b> every world under the current displayed valuation.</p><p><b>Frame-valid · F ⊨ φ:</b> every world under every valuation on the fixed frame.</p></section>}
            {activeLevel.workspacePresentation?.visibleConstraints?.length && <section><strong>Remember</strong><p>{activeLevel.workspacePresentation.visibleConstraints.join(' ')}</p></section>}
            {activeLevel.targetAnalysis && <section><strong>Analyse the target</strong>{activeLevel.targetAnalysis.map((item) => <p key={item}>{item}</p>)}</section>}
            {courseLesson?.hints && <section className="mission-hints"><strong>Lesson hints</strong><ProgressiveHints hints={courseLesson.hints} revealed={learnHintLevel} onReveal={revealLearnHint} /></section>}
            {activeLevel.hints && <section className="mission-hints"><strong>Strategic hints</strong><div>{activeLevel.hints.map((hint, index) => <button type="button" key={hint} disabled={index + 1 > guidedHintLevel} onClick={() => setGuidedHintLevel((level) => Math.max(level, index + 1))}>Hint {index + 1}</button>)}</div>{guidedHintLevel > 0 && <p>{activeLevel.hints[guidedHintLevel - 1]}</p>}</section>}
            {activeLevel.referenceSolution && <section className="reference-solution"><strong>Reference solution</strong><p>One validated construction, revealed separately from ordinary hints.</p>{(guidedHintLevel >= 3 || guestProfile.history.filter((entry) => entry.levelId === activeLevel.id && !entry.success).length >= 3) ? <><button type="button" className="secondary-button" onClick={() => { if (window.confirm('Showing the reference solution will reveal one complete construction. You can still complete the mission, but it will be recorded as assisted.')) setReferenceSolutionViewed((current) => new Set([...current, activeLevel.id])) }}>Show reference solution</button>{referenceSolutionViewed.has(activeLevel.id) && <code>Worlds: {activeLevel.referenceSolution.worlds.map((world) => `${world.id}${world.atoms ? `:{${world.atoms}}` : ':∅'}`).join(' · ')}<br />Edges: {activeLevel.referenceSolution.edges.map((edge) => `${edge.from} → ${edge.to}`).join(' · ') || '∅'}</code>}</> : <p>Available after Hint 3 or three unsuccessful attempts.</p>}</section>}
          </div> : undefined}
        />
      )}

      {appView === 'workspace' && <section className={`workspace mobile-tab-${mobileWorkspaceTab} ${isGuidedMode ? 'guided-workspace' : ''} ${evaluationScope === 'frame' ? 'frame-scope' : ''} ${showWorldPanel && !showEdgePanel ? 'world-panel-only' : ''} ${showEdgePanel && !showWorldPanel ? 'edge-panel-only' : ''} ${!leftPanelOpen ? 'left-collapsed' : ''} ${!rightPanelOpen ? 'right-collapsed' : ''}`} aria-label="Kripke model editor">
        <MobileWorkspaceTabs activeTab={mobileWorkspaceTab} showFormula={showFormulaPanel} onChange={setMobileWorkspaceTab} />
        {showFormulaPanel && <div className="panel formula-panel">
          <div className="panel-heading">
            <span className="step">01</span>
            <div><h2>Formula and goal</h2><p>Unicode and text notation</p></div>
          </div>
          <label className="field">
            <span>Modal formula</span>
            <input ref={formulaInputRef} aria-label="Modal formula" disabled={isGuidedMode} value={formulaSource} onChange={(event) => { setFormulaSource(event.target.value); setResult(null) }} spellCheck={false} />
            {formulaParseStatus && <small className={`parse-status ${formulaParseStatus}`}>Formula {formulaParseStatus}</small>}
          </label>
          {!isGuidedMode && !formulaSource.trim() && <div className="empty-card"><strong>No formula yet</strong><span>Enter an atom such as p, or start with □p / ◇p, then Verify.</span><button type="button" onClick={() => { setFormulaSource('p'); setTimeout(() => formulaInputRef.current?.focus(), 0) }}>Use p</button></div>}
          <label className="field comparison-formula">
            <span>Comparison formula <small>optional</small></span>
            <input aria-label="Comparison formula" disabled={isGuidedMode} value={comparisonFormulaSource} placeholder="e.g. box p" onChange={(event) => { setComparisonFormulaSource(event.target.value); if (event.target.value.trim() && evaluationScope === 'correspondence') setEvaluationScope('frame'); setResult(null) }} spellCheck={false} />
          </label>
          <div className="symbol-row" aria-label="Insert symbol">
            {['¬', '∧', '∨', '→', '□', '◇'].map((symbol) => (
              <button key={symbol} type="button" disabled={isGuidedMode} className="symbol-button" aria-label={`Insert ${symbol}`} onClick={() => insertFormulaSymbol(symbol)}>{symbol}</button>
            ))}
          </div>
          <label className="field scope-picker">
            <span>Semantic target</span>
            <select disabled={isGuidedMode} aria-label="Semantic target" value={evaluationScope} onChange={(event) => { setEvaluationScope(event.target.value as EvaluationScope); setResult(null) }}>
              <option value="pointed">Pointed model — selected world, current valuation</option>
              <option value="model">Model — all worlds, current valuation</option>
              <option value="frame">Frame — all worlds and all valuations</option>
              <option value="correspondence" disabled={Boolean(comparisonFormulaSource.trim())}>Correspondence — formula validity vs. relation</option>
            </select>
          </label>
          {evaluationScope !== 'correspondence' ? (
            <fieldset className="target-choice">
              <legend>Construction goal</legend>
              <label><input type="radio" disabled={isGuidedMode} checked={targetTruth} onChange={() => { setTargetTruth(true); setResult(null) }} /> {comparisonFormulaSource.trim() ? 'Make formulas equivalent' : evaluationScope === 'frame' ? 'Make valid on frame' : 'Make formula true'}</label>
              <label><input type="radio" disabled={isGuidedMode} checked={!targetTruth} onChange={() => { setTargetTruth(false); setResult(null) }} /> {comparisonFormulaSource.trim() ? 'Make formulas differ' : evaluationScope === 'frame' ? 'Find countervaluation' : 'Build a counterexample'}</label>
            </fieldset>
          ) : <p className="objective-explainer">Compare validity under every valuation with a characteristic property of the accessibility relation.</p>}
          <label className={`field correspondence-picker ${evaluationScope === 'correspondence' ? 'active' : ''}`}>
            <span>Correspondence lab</span>
            <select disabled={isGuidedMode} value={selectedCorrespondence} onChange={(event) => loadCorrespondencePreset(event.target.value)}>
              <option value="">Choose a modal axiom</option>
              {correspondencePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
            </select>
          </label>
          {selectedCorrespondence && <p className="correspondence-note">Compare frame validity with the selected relational property. Finite examples provide evidence; they do not replace the general correspondence proof.</p>}
          <p className="notation">Precedence: ¬ □ ◇ &gt; ∧ &gt; ∨ &gt; →. Alternatives: !, &amp;, |, -&gt;, box, diamond.</p>
        </div>}

        <div className="panel graph-panel">
          <div className="panel-heading">
            <span className="step">02</span>
            <div><h2>Visual model</h2><p>Drag from the world where an arrow begins and release on its destination; handle position does not set direction</p></div>
            {!isQuestionTask && <div className="model-view-switch" role="group" aria-label="Model view"><button type="button" className={modelView === 'graph' ? 'active' : ''} aria-pressed={modelView === 'graph'} onClick={() => setModelView('graph')}>Graph</button><button type="button" className={modelView === 'table' ? 'active' : ''} aria-pressed={modelView === 'table'} onClick={() => setModelView('table')}>Table</button></div>}
          </div>
          <div className="graph-canvas" ref={graphCanvasRef} onWheelCapture={handleMapWheel}>
            {modelView === 'graph' ? <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={worldNodeTypes}
              edgeTypes={modalEdgeTypes}
              connectionMode={ConnectionMode.Loose}
              onInit={setFlowInstance}
              onNodesChange={onNodesChange}
              nodesDraggable={canEditWorlds}
              nodesConnectable={canEditEdges}
              edgesFocusable
              nodesFocusable
              onNodeDragStart={() => { if (canEditWorlds) { saveHistoryPoint(true); setCollidingWorldKeys(new Set()) } }}
              onNodeDrag={(_event, node) => setCollidingWorldKeys(findOverlappingWorldKeys(worlds, Number(node.id), node.position))}
              onNodeDragStop={(_event, node) => { setWorlds((current) => commitWorldPosition(current, Number(node.id), node.position) as EditableWorld[]); setCollidingWorldKeys(new Set()) }}
              onNodeMouseEnter={(_event, node) => setHoveredWorldKey(Number(node.id))}
              onNodeMouseLeave={() => setHoveredWorldKey(null)}
              onNodeClick={(_event, node) => {
                const selectedWorld = worlds.find(({ key }) => key === Number(node.id))
                if (selectedWorld && isQuestionTask && (activeLevel?.prediction?.kind === 'world-choice' || activeLevel?.prediction?.kind === 'counterexample-world')) choosePredictionAnswer(selectedWorld.id.trim())
                else selectWorld(Number(node.id))
              }}
              onConnect={connectWorlds}
              isValidConnection={(connection) => {
                if (!canEditEdges || !connection.source || !connection.target) return false
                const source = worlds.find(({ key }) => String(key) === connection.source)?.id.trim()
                const target = worlds.find(({ key }) => String(key) === connection.target)?.id.trim()
                return Boolean(source && target && !validateExplicitEdgeCandidate(worlds, edges, source, target))
              }}
              onEdgeClick={(_event, edge) => {
                const pairKey = (edge.data as { pairKey?: string } | undefined)?.pairKey
                if (edge.id.startsWith('pair:') && pairKey) {
                  selectReciprocalPair(pairKey)
                  return
                }
                const explicitKey = explicitKeyFromFlowEdgeId(edge.id)
                selectExplicitEdge(canEditEdges ? explicitKey : null)
              }}
              onEdgesDelete={(deleted) => deleted.forEach(({ id }) => {
                const key = explicitKeyFromFlowEdgeId(id)
                if (key !== null) deleteEdge(key)
              })}
              onPaneClick={(event) => {
                clearGraphSelection()
                setActiveFrameWitness(null)
                if (shouldCreateWorldFromPaneClick({ detail: event.detail, canEditWorlds, pointerType: 'pointerType' in event ? String(event.pointerType) : 'mouse' }) && flowInstance) {
                  const position = flowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
                  addWorld({ x: position.x - WORLD_NODE_SIZE / 2, y: position.y - WORLD_NODE_SIZE / 2 })
                }
              }}
              deleteKeyCode={null}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              minZoom={MAP_MIN_ZOOM}
              maxZoom={MAP_MAX_ZOOM}
              {...modelMapInteractionProps}
              colorMode="light"
            >
              <Panel position="top-left" className="map-toolbar">
                {!focusedIntroWorkspace && <div className="workspace-presets" aria-label="Workspace presets"><button type="button" className={editorMode === 'edit' && rightPanelOpen ? 'active' : ''} onClick={() => applySandboxPreset('build')}>◇ Model · Build</button><button type="button" className={editorMode === 'evaluate' ? 'active' : ''} onClick={() => applySandboxPreset('evaluate')}>φ Formula · Evaluate</button><button type="button" onClick={() => applySandboxPreset('frame')}>R Frame rules</button></div>}
                {(!focusedIntroWorkspace || Boolean(presentation?.worlds)) && tutorialAllows('worlds') && <button type="button" onClick={() => addWorld()} disabled={!canEditWorlds}>+ World</button>}
                <button type="button" className={!leftPanelOpen ? 'panel-toggle active' : 'panel-toggle'} onClick={() => setLeftPanelOpen((open) => !open)} aria-label="Toggle Evaluation panel" aria-pressed={leftPanelOpen} title="Toggle Evaluation panel">◧ Evaluation</button>
                {(showWorldPanel || showEdgePanel) && <button type="button" className={!rightPanelOpen ? 'panel-toggle active' : 'panel-toggle'} onClick={() => setRightPanelOpen((open) => !open)} aria-label="Toggle Model panel" aria-pressed={rightPanelOpen} title="Toggle Model panel">◨ Model</button>}
                {canUseHistory && <><button type="button" onClick={undo} disabled={historyPast.current.length === 0} aria-label="Undo" title="Undo">↶</button><button type="button" onClick={redo} disabled={historyFuture.current.length === 0} aria-label="Redo" title="Redo">↷</button></>}
                <button type="button" onClick={() => void flowInstance?.zoomIn()} disabled={!flowInstance} aria-label="Zoom in" title="Zoom in">+</button>
                <button type="button" onClick={() => void flowInstance?.zoomOut()} disabled={!flowInstance} aria-label="Zoom out" title="Zoom out">−</button>
                <button type="button" onClick={() => void flowInstance?.fitView({ padding: 0.25 })} disabled={!flowInstance || worlds.length === 0}>Fit model</button>
                <button type="button" onClick={tidyModel} disabled={worlds.length < 2 || (gameMode !== 'sandbox' && !canEditWorlds)}>Tidy model</button>
                {!focusedIntroWorkspace && <button type="button" aria-label={`${showDerivedEdges ? 'Hide' : 'Show'} derived`} className={!showDerivedEdges ? 'muted' : ''} onClick={() => setShowDerivedEdges((show) => !show)}>{showDerivedEdges ? 'Hide' : 'Show'} derived ({derivedPairKeys.size})</button>}
                {!focusedIntroWorkspace && <button type="button" className="frame-rules-button" onClick={() => setShowFrameRules(true)}>Frame rules{frameRuleResults.length ? ` (${frameRuleResults.length})` : ''}</button>}
                {selectedEdgeKey !== null && <button type="button" className="delete-edge-button" disabled={!canEditEdges} onClick={() => deleteEdge(selectedEdgeKey)}>Delete edge</button>}
                {editorMode === 'evaluate' && <button type="button" className="toolbar-verify" onClick={verify}>Verify</button>}
              </Panel>
              <Panel position="bottom-center" className="trace-legend" aria-label="Model state legend"><details><summary>Legend</summary><div><span><i className="selected" />SELECTED</span><span><i className="current" />CURRENT WORLD</span>{traceWitnessWorld && <span><i className="witness" />WITNESS</span>}{traceCounterexampleWorld && <span><i className="counterexample" />COUNTEREXAMPLE</span>}<span><i className="explicit-edge" />EXPLICIT EDGE</span>{derivedPairKeys.size > 0 && <span><i className="derived" />DERIVED EDGE</span>}{relationPresentations.some(({ kind }) => kind === 'bidirectional') && <span><i className="two-way" />TWO-WAY</span>}<span><i className="reflexive" />EXPLICIT ↻</span>{[...reflexiveRelations.values()].some(({ derived }) => derived) && <span><i className="reflexive derived-reflexive" />DERIVED ↻</span>}{activeTrace && <><span><i className="checked" />CHECKED</span><span><i className="irrelevant" />IRRELEVANT</span></>}</div></details></Panel>
              {!showDerivedEdges && derivedPairKeys.size > 0 && <Panel position="bottom-right" className="derived-hidden-note">{derivedPairKeys.size} derived relation{derivedPairKeys.size === 1 ? '' : 's'} hidden. <span>Display only — verification still uses enforced relations.</span></Panel>}
              {traceForcedDerivedPairKeys.size > 0 && <Panel position="top-center" className="trace-derived-note">A hidden derived relation is temporarily shown because the current trace uses it.</Panel>}
              {workspaceStatus && <Panel position="top-center" className="workspace-live-status"><span aria-live="polite">{workspaceStatus}</span></Panel>}
              {activeTrace?.rule === 'necessity' && activeTrace.children.length === 0 && <Panel position="top-center" className="vacuous-trace-note"><b>0 successors</b><span>□ is vacuously true: there is no counterexample branch.</span></Panel>}
              {worlds.length === 0 && (
                <Panel position="top-center" className="empty-graph-state">
                  <strong>Start with a world</strong><span>Then connect worlds to define accessibility.</span>
                  <button type="button" onClick={() => addWorld()} disabled={!canEditWorlds}>Add first world</button>
                </Panel>
              )}
              {selectedWorld && (
                <Panel position="bottom-left" className="world-inspector">
                  <div className="inspector-heading"><strong>{selectedWorld.id || 'Unnamed world'}</strong><button type="button" onClick={() => setSelectedWorldKey(null)} aria-label="Close world inspector">×</button></div>
                  {canEditWorlds && <label><span>Name</span><WorldIdInput value={selectedWorld.id} ariaLabel={`Name of world ${selectedWorld.id}`} onCommit={(value) => renameWorld(selectedWorld.key, value)} /></label>}
                  {showValuations && tutorialAllows('valuations') && <label><span>True atoms</span><input disabled={!canEditValuations} value={selectedWorld.atoms} onFocus={saveHistoryPoint} onChange={(event) => updateWorldAtoms(selectedWorld.key, event.target.value)} /></label>}
                  <div className="inspector-actions">
                  {showEvaluationControl && tutorialAllows('evaluation') && <button type="button" onClick={() => selectEvaluationWorld(selectedWorld.id.trim())} disabled={!selectedWorld.id.trim() || !canEditEvaluation}>Set as evaluation world</button>}
                  {canEditWorlds && <button type="button" className="danger" onClick={() => removeWorld(selectedWorld.key)}>Delete</button>}
                </div>
                {canEditEdges && <label className="connect-world"><span>Connect to…</span><select aria-label={`Connect ${selectedWorld.id} to world`} defaultValue="" onChange={(event) => { const target = worlds.find(({ id }) => id.trim() === event.target.value); if (target) connectWorlds({ source: String(selectedWorld.key), target: String(target.key), sourceHandle: null, targetHandle: null }); event.currentTarget.value = '' }}><option value="">Choose a world</option>{worlds.filter(({ id }) => id.trim()).map(({ id }) => <option key={id} value={id.trim()}>{id.trim()}</option>)}</select></label>}
              </Panel>
              )}
              <Background color="#b9b6aa" gap={24} size={1} />
              {showMinimap && <MiniMap
                pannable
                zoomable
                nodeComponent={MiniMapWithRelations}
                nodeColor={(node) => node.data.isEvaluation === true ? '#14647a' : '#7a4d26'}
                nodeStrokeColor="#f8f7f1"
                nodeStrokeWidth={2}
                nodeBorderRadius={50}
                maskColor="rgba(236, 233, 223, .62)"
                ariaLabel="Model overview and viewport control"
              />}
            </ReactFlow> : <div className="model-table-wrap"><table className="model-table"><caption>Keyboard-accessible model view. Changes are synchronized with the graph.</caption><thead><tr><th>World</th><th>Atoms</th><th>Effective successors</th><th>Actions</th></tr></thead><tbody>{worlds.map((world) => <tr key={world.key} className={world.id.trim() === activeTrace?.worldId ? 'current' : ''}><td><WorldIdInput ariaLabel={`Table world ${world.id || world.key}`} disabled={!canEditWorlds} value={world.id} onCommit={(value) => renameWorld(world.key, value)} /></td><td><input aria-label={`Atoms at ${world.id || world.key}`} disabled={!canEditValuations} value={world.atoms} placeholder="none" onFocus={saveHistoryPoint} onChange={(event) => updateWorldAtoms(world.key, event.target.value)} /></td><td><div className="successor-chips">{effectiveEdges.filter(({ from }) => from === world.id.trim()).map(({ from, to }) => { const derived = !explicitEdgeKeyByPair.has(`${from}\u0000${to}`); return <span key={`${from}:${to}`} className={derived ? 'derived' : 'explicit'} aria-label={`${to}, ${derived ? 'derived' : 'explicit'}`}>{to}<small>{derived ? 'derived' : 'explicit'}</small></span> })}{!effectiveEdges.some(({ from }) => from === world.id.trim()) && 'none'}</div></td><td><button type="button" onClick={() => selectEvaluationWorld(world.id.trim())} disabled={!world.id.trim() || !canEditEvaluation}>Evaluate here</button>{canEditWorlds && <button type="button" className="danger" onClick={() => removeWorld(world.key)}>Delete</button>}</td></tr>)}</tbody></table>{worlds.length === 0 && <div className="empty-card"><strong>No worlds yet</strong><span>Add the first world to populate both views.</span><button type="button" onClick={() => addWorld()} disabled={!canEditWorlds}>Add first world</button></div>}</div>}
          </div>
        </div>

        {showWorldPanel && <div className="panel model-panel">
          <div className="panel-heading">
            <span className="step">03</span>
            <div><h2>Worlds and valuations</h2><p>Separate atoms with spaces or commas</p></div>
          </div>
          <div className="world-list">
            {worlds.length === 0 && <div className="empty-card"><strong>No worlds yet</strong><span>Add a world to start building a model.</span></div>}
            {worlds.map((world, index) => (
              <div className="world-row" key={world.key} onClick={() => selectWorld(world.key)}>
                <span className="world-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                {canEditWorlds || !focusedIntroWorkspace ? <label><span>World</span><WorldIdInput ariaLabel={`World ${world.id || index + 1}`} disabled={!canEditWorlds} value={world.id} onCommit={(value) => renameWorld(world.key, value)} /></label> : <span className="readonly-world"><small>World</small>{world.id}</span>}
                {showValuations && tutorialAllows('valuations') && <label className="atoms-field"><span>True atoms</span><input disabled={!canEditValuations} value={world.atoms} placeholder={isHowToPlay ? 'p' : 'p, q'} onFocus={saveHistoryPoint} onChange={(event) => updateWorldAtoms(world.key, event.target.value)} /></label>}
                {canEditWorlds && <button type="button" className="remove-button" onClick={() => removeWorld(world.key)} aria-label={`Delete world ${world.id}`}>×</button>}
              </div>
            ))}
          </div>
          {(!focusedIntroWorkspace || Boolean(presentation?.worlds)) && tutorialAllows('worlds') && <button type="button" className="secondary-button" onClick={() => addWorld()} disabled={!canEditWorlds}>+ Add world</button>}
        </div>}

        {showEdgePanel && <div className="panel edge-panel">
          <div className="panel-heading">
            <span className="step">04</span>
            <div><h2>Accessibility</h2></div>
          </div>
          <div className="edge-list">
            {edges.length === 0 && <p className="empty-state">The model has no explicit edges.</p>}
            {edges.map((edge) => (
              <div className="edge-row" key={edge.key} onClick={() => selectExplicitEdge(edge.key)}>
                <span className="edge-mark" aria-hidden="true">R</span>
                <select disabled={!canEditEdges} aria-label="Edge source world" value={edge.from} onChange={(event) => { replaceEdgeEndpoint(edge.key, 'from', event.target.value) }}>
                  {usableWorldIds.map((id) => <option key={id}>{id}</option>)}
                </select>
                <span className="relation-arrow" aria-hidden="true">→</span>
                <select disabled={!canEditEdges} aria-label="Edge target world" value={edge.to} onChange={(event) => { replaceEdgeEndpoint(edge.key, 'to', event.target.value) }}>
                  {usableWorldIds.map((id) => <option key={id}>{id}</option>)}
                </select>
                <button type="button" className="remove-button" disabled={!canEditEdges} onClick={() => deleteEdge(edge.key)} aria-label="Delete edge">×</button>
                {edgeEditErrors[edge.key] && <small className="field-error" role="alert">{edgeEditErrors[edge.key]}</small>}
              </div>
            ))}
            {edgeDraft && <div className="edge-row edge-draft-row">
              <span className="edge-mark" aria-hidden="true">R</span>
              <select aria-label="New relation source world" value={edgeDraft.from} onChange={(event) => setEdgeDraft({ from: event.target.value, to: edgeDraft.to })}><option value="">Choose source</option>{usableWorldIds.map((id) => <option key={id}>{id}</option>)}</select>
              <span className="relation-arrow" aria-hidden="true">→</span>
              <select aria-label="New relation target world" value={edgeDraft.to} onChange={(event) => setEdgeDraft({ from: edgeDraft.from, to: event.target.value })}><option value="">Choose destination</option>{usableWorldIds.map((id) => <option key={id}>{id}</option>)}</select>
              <button type="button" className="secondary-button" disabled={!edgeDraft.from || !edgeDraft.to} onClick={commitEdgeDraft}>Add relation</button>
              <button type="button" className="text-button" onClick={() => setEdgeDraft(null)}>Cancel</button>
              {edgeDraft.error && <small className="field-error" role="alert">{edgeDraft.error}</small>}
            </div>}
          </div>
          {derivedPairKeys.size > 0 && (
            <p className="derived-summary">+ {derivedPairKeys.size} edge{derivedPairKeys.size === 1 ? '' : 's'} derived from frame properties. {showDerivedEdges ? 'Shown' : 'Hidden'} for display only — verification always uses enforced relations.</p>
          )}
          <button type="button" className="secondary-button" onClick={addEdge} disabled={worlds.length === 0 || !canEditEdges || edgeDraft !== null}>+ Add edge</button>
        </div>}

        <div className="panel verify-panel">
          <div className="panel-heading">
            <span className="step">05</span>
            <div><h2>Verification</h2></div>
          </div>
          {isGuidedMode && comparisonFormulaSource.trim() && <div className="formula-comparison-chips" aria-label="Formula comparison"><span><small>Formula A</small><code>{formulaSource}</code></span><span><small>Formula B</small><code>{comparisonFormulaSource}</code></span></div>}
          {!isConstructionObjective && <div className="objective-summary">
            <span>Active target</span>
            <strong>{evaluationScope === 'pointed' ? 'Pointed model' : evaluationScope === 'model' ? 'Model-global truth' : evaluationScope === 'frame' ? 'Frame validity' : 'Formula–relation correspondence'}</strong>
            <small>{evaluationScope === 'pointed' ? 'One world · current valuation' : evaluationScope === 'model' ? 'Every world · current valuation' : evaluationScope === 'frame' ? 'Every world · every valuation' : 'Frame validity ↔ relational property'}</small>
          </div>}
          {!isConstructionObjective && frameValuationEstimate && <div className={`valuation-cost ${frameValuationLimitExceeded ? 'limit' : ''}`} role="status"><span>Frame search</span><strong>{frameValuationEstimate.valuations.toLocaleString('en-US')} valuations</strong><small>{usableWorldIds.length} worlds × {frameValuationEstimate.atoms} atoms · limit {DEFAULT_MAXIMUM_VALUATIONS.toLocaleString('en-US')}</small>{frameValuationLimitExceeded && <em>Reduce the number of worlds or distinct atoms before verification.</em>}</div>}
          {!isConstructionObjective && evaluationScope === 'frame' && <p className="frame-valuation-note"><strong>Frame validity checks every world under every valuation.</strong> Atoms shown on the graph are one example, not the only valuation used.</p>}
          {scopeComparison && <div className="scope-comparison" aria-label="Scope comparison results"><span>Side-by-side semantics</span>{scopeComparison.map(({ scope, holds, reason }) => <div key={scope}><strong>{scope === 'pointed' ? 'Pointed truth' : scope === 'model' ? 'Model-global truth' : 'Frame validity'}</strong><b className={holds ? 'true' : 'false'}>{holds ? 'PASS' : 'FAIL'}</b><small>{reason}</small></div>)}</div>}
          {showEvaluationControl && (isConstructionObjective || evaluationScope === 'pointed') && <label className="field">
            <span>Evaluation world</span>
            <select disabled={(!isConstructionObjective && evaluationScope !== 'pointed') || !canEditEvaluation} value={evaluationWorld} onChange={(event) => selectEvaluationWorld(event.target.value)}>
              <option value="">Select a world</option>{usableWorldIds.map((id) => <option key={id}>{id}</option>)}
            </select>
          </label>}
          {evaluationScope === 'pointed' && !usableWorldIds.includes(evaluationWorld) && <div className="empty-card"><strong>Choose an evaluation world</strong><span>Pointed truth needs one existing world. Select it above or from the synchronized model table.</span></div>}
          {activeLevel?.prediction && !isQuestionTask && (
            <div className="prediction-panel">
              <span>{activeLevel.prediction.kind === 'world-choice' ? 'Choose before verification' : 'Predict before verification'}</span>
              <strong>{activeLevel.prediction.prompt}</strong>
              {activeLevel.prediction.kind === 'truth'
                ? <div className="prediction-choice"><button type="button" className={predictionAnswer === 'true' ? 'active' : ''} aria-pressed={predictionAnswer === 'true'} onClick={() => { setPredictionAnswer('true'); setResult(null) }}>True</button><button type="button" className={predictionAnswer === 'false' ? 'active' : ''} aria-pressed={predictionAnswer === 'false'} onClick={() => { setPredictionAnswer('false'); setResult(null) }}>False</button></div>
                : activeLevel.prediction.kind === 'scope-truth'
                  ? <div className="scope-prediction" aria-label="Scope truth prediction">{(['Local', 'Global', 'Frame-valid'] as const).map((label, index) => { const values = predictionAnswer.split(','); return <div key={label}><span>{label}</span><button type="button" className={values[index] === 'true' ? 'active' : ''} aria-pressed={values[index] === 'true'} onClick={() => { const next = [...values]; next[index] = 'true'; setPredictionAnswer([0, 1, 2].map((key) => next[key] ?? '').join(',')); setResult(null) }}>True</button><button type="button" className={values[index] === 'false' ? 'active' : ''} aria-pressed={values[index] === 'false'} onClick={() => { const next = [...values]; next[index] = 'false'; setPredictionAnswer([0, 1, 2].map((key) => next[key] ?? '').join(',')); setResult(null) }}>False</button></div> })}</div>
                : activeLevel.prediction.kind === 'counterexample-world'
                  ? <select aria-label="Predicted counterexample world" value={predictionAnswer} onChange={(event) => { setPredictionAnswer(event.target.value); setResult(null) }}><option value="">Select a world</option>{usableWorldIds.map((id) => <option key={id}>{id}</option>)}</select>
                  : activeLevel.prediction.kind === 'world-choice'
                    ? <select aria-label="Witness world answer" value={predictionAnswer} onChange={(event) => { setPredictionAnswer(event.target.value); setResult(null) }}><option value="">Select a world</option>{(activeLevel.prediction.worldChoices ?? usableWorldIds).map((id) => <option key={id}>{id}</option>)}</select>
                    : activeLevel.prediction.kind === 'frame-property'
                    ? <select aria-label="Relational property answer" value={predictionAnswer} onChange={(event) => { setPredictionAnswer(event.target.value); setResult(null) }}><option value="">Select a property</option>{(activeLevel.prediction.propertyChoices ?? levelPropertyNames).map((property) => <option key={property}>{property}</option>)}</select>
                    : activeLevel.prediction.kind === 'countervaluation'
                      ? <div className="countervaluation-choices" role="radiogroup" aria-label="Countervaluation answer">{activeLevel.prediction.countervaluationChoices?.map((choice) => <button type="button" role="radio" aria-checked={predictionAnswer === choice.id} className={predictionAnswer === choice.id ? 'active' : ''} key={choice.id} onClick={() => { setPredictionAnswer(choice.id); setResult(null) }}><b>{choice.id}</b>{Object.entries(choice.valuation).map(([world, atoms]) => <code key={world}>{world}: {atoms.length ? `{${atoms.join(', ')}}` : '∅'}</code>)}</button>)}</div>
                      : activeLevel.prediction.kind === 'statement-choice'
                        ? <div className="statement-choice-grid" role="radiogroup" aria-label="Statement answer">{activeLevel.prediction.statementChoices?.map((choice) => <button type="button" role="radio" aria-checked={predictionAnswer === choice.id} className={predictionAnswer === choice.id ? 'active' : ''} key={choice.id} onClick={() => choosePredictionAnswer(choice.id)}>{choice.label}</button>)}</div>
                        : <div className="model-choice-grid" role="radiogroup" aria-label="Candidate model answer">{activeLevel.prediction.modelChoices?.map((choice) => <button type="button" role="radio" aria-checked={predictionAnswer === choice.id} className={predictionAnswer === choice.id ? 'active' : ''} key={choice.id} onClick={() => { setPredictionAnswer(choice.id); setResult(null) }}><strong>Model {choice.id}</strong><span>Evaluation: {choice.evaluationWorld}</span><div>{choice.worlds.map((world) => <code key={world.id}>{world.id}: {world.atoms.trim() ? `{${world.atoms.split(/[\s,]+/u).filter(Boolean).join(', ')}}` : '∅'}</code>)}</div><small>R = {choice.edges.length ? `{${choice.edges.map(({ from, to }) => `(${from},${to})`).join(', ')}}` : '∅'}</small></button>)}</div>}
            </div>
          )}
          {!isGuidedMode && <button type="button" className="verify-button" onClick={verify} disabled={!isConstructionObjective && frameValuationLimitExceeded}>Verify objective</button>}
          {!isQuestionTask ? <div ref={verificationResultRef} tabIndex={-1} className={`result ${result?.kind ?? ''}`} role={result ? result.kind === 'error' ? 'alert' : 'status' : undefined} aria-live={result?.kind === 'error' ? 'assertive' : 'polite'} aria-atomic="true">
            <strong>{result?.message ?? 'The verification result will appear here.'}</strong>
            {result && 'detail' in result && !result.verdict && <span>{result.detail}</span>}
            {result && 'diagnostic' in result && result.diagnostic && <p className="course-diagnostic"><strong>Lesson note:</strong> {result.diagnostic} {courseLesson && <button type="button" className="text-button" onClick={() => setLearnConceptOpen(true)}>Review concept</button>}</p>}
            {result?.kind === 'failure' && courseLesson && activeLevelFailureCount >= 3 && <LearnRecoveryActions relatedTitle={relatedLearnLesson?.title} onReview={() => setLearnConceptOpen(true)} onHint={() => revealLearnHint(Math.min(learnHintLevel + 1, 3))} onRelated={relatedLearnLesson ? () => startLearnLesson(learnLessons.findIndex(({ id }) => id === relatedLearnLesson.id)) : undefined} />}
            {result && 'verdict' in result && result.verdict && (
              <div className="verdict-sections">
                {semanticFeedbackLevel === 1 && <p className="feedback-disclosure"><strong>Feedback level 1 · Try again.</strong> The objective is not met. Recheck the target scope and the part of the model relevant to the formula.</p>}
                {semanticFeedbackLevel === 2 && <p className="feedback-disclosure"><strong>Feedback level 2 · Diagnostic hint.</strong> The failing semantic section is identified below. A full world-by-world trace unlocks after another unsuccessful attempt.</p>}
                {[result.verdict.formula, result.verdict.relation, result.verdict.correspondence].filter(Boolean).map((section) => section && (
                  <div className={`verdict-section ${section.holds ? 'pass' : 'fail'}`} key={section.label}>
                    <div><span>{section.label}</span><b>{section.holds ? 'Pass' : 'Fail'}</b></div>
                    {semanticFeedbackLevel >= 2 && <strong>{section.summary}</strong>}
                    {semanticFeedbackLevel >= 3 && <small>{section.detail}</small>}
                    {semanticFeedbackLevel >= 3 && section.witnessValuation && <div className="valuation-diagnostic"><span>Countervaluation</span>{Object.entries(section.witnessValuation).map(([world, atoms]) => <code key={world}>{world}: {atoms.length ? `{${atoms.join(', ')}}` : '∅'}</code>)}</div>}
                    {semanticFeedbackLevel >= 3 && section.truthByWorld && <div className="truth-diagnostic"><span>{section.witnessValuation ? 'Truth under countervaluation' : 'Truth by world'}</span><div>{section.truthByWorld.map(({ worldId, value }) => <code className={value ? 'true' : 'false'} key={worldId}>{worldId} <b>{value ? 'T' : 'F'}</b></code>)}</div></div>}
                    {semanticFeedbackLevel >= 3 && section.evaluationTraces && <div className="evaluation-diagnostic"><EvaluationDiagnostics traces={section.evaluationTraces} /><div className="semantic-debugger-heading"><span>Evaluation tree · semantic debugger</span><small>formula → subformula → world → rule → truth</small></div>{evaluationTraceSteps.length > 0 && <div className="trace-stepper"><button type="button" disabled={traceStepIndex <= 0} onClick={() => setTraceStepIndex((step) => Math.max(0, step - 1))}>Previous step</button><span>Step {Math.min(traceStepIndex + 1, evaluationTraceSteps.length)} of {evaluationTraceSteps.length}</span><button type="button" disabled={traceStepIndex >= evaluationTraceSteps.length - 1} onClick={() => setTraceStepIndex((step) => Math.min(evaluationTraceSteps.length - 1, step + 1))}>Next step</button><small>Alt + ← / →</small></div>}{activeTrace && <div className="active-trace-summary"><code>{activeTrace.formula}</code><span>at <b>{activeTrace.worldId}</b></span><span>rule: <b>{activeTrace.rule}</b></span><strong>{activeTrace.value ? 'TRUE' : 'FALSE'}</strong></div>}{section.evaluationTraces.map((trace, index) => <EvaluationTree trace={trace} root={section.evaluationTraces?.length === 1} activeTrace={activeTrace} onSelect={(selected) => { const step = evaluationTraceSteps.findIndex(({ trace: candidate }) => candidate === selected); if (step >= 0) setTraceStepIndex(step) }} key={`${trace.worldId}:${index}`} />)}</div>}
                  </div>
                ))}
              </div>
            )}
            {result && 'bonus' in result && result.bonus && <div className={`bonus-result ${result.bonus.achieved ? 'achieved' : ''}`}><strong>{result.bonus.achieved ? 'Bonus achieved' : 'Optional bonus'}</strong><span>{result.bonus.detail}</span></div>}
            {result && 'prediction' in result && result.prediction && <div className={`prediction-result ${result.prediction.correct ? 'correct' : 'incorrect'}`}><strong>{result.prediction.correct ? 'Prediction correct' : 'Prediction incorrect'}</strong><span>{result.prediction.detail}</span></div>}
          </div> : <p className="question-result-note">Answer feedback appears in the Question panel above.</p>}
        </div>
      </section>}

      {appView === 'workspace' && activeLevel && !courseLesson && result?.kind === 'success' && !completionDismissed && (
        <div className="dialog-backdrop completion-backdrop" role="presentation">
          <section className="completion-dialog" role="dialog" aria-modal="true" aria-labelledby="completion-title">
            <div className="completion-mark" aria-hidden="true">✓</div>
            <p className="eyebrow">{courseLesson || isHowToPlay ? 'Task complete' : campaignLevelIndex === activeLevels.length - 1 ? `${gameMode === 'custom' ? customSequenceLabel : gameMode === 'guidedCampaign' ? 'Campaign complete' : 'Practice collection complete'}` : 'Objective verified'}</p>
            <h2 id="completion-title">{courseLesson || isHowToPlay || campaignLevelIndex < activeLevels.length - 1 || (gameMode === 'custom' && customLevels.length === 1) ? 'Task complete' : gameMode === 'custom' ? `${customSequenceLabel} complete` : 'Sequence complete'}</h2>
            <p><strong>{activeLevel.title}</strong> is now recorded as complete. You can continue immediately or return to the {focusedIntroWorkspace ? 'Learn overview' : 'mission overview'}.</p>
            {(gameMode === 'guidedCampaign' || isHowToPlay) && activeLevel.successDebrief && <p className="completion-common-mistake"><strong>What this shows:</strong> {activeLevel.successDebrief}</p>}
            {gameMode === 'guidedCampaign' && referenceSolutionViewed.has(activeLevel.id) && <p className="completion-common-mistake"><strong>Assisted completion:</strong> You viewed a reference construction before completing this mission.</p>}
            {!focusedIntroWorkspace && <><p className="solution-diversity">Distinct solutions recorded for this mission: <strong>{activeDistinctSolutionCount}</strong>.</p><div className="completion-metrics" aria-label="Construction metrics"><span><b>{worlds.length}</b> worlds</span><span><b>{new Set(edges.map(({ from, to }) => `${from}\u0000${to}`)).size}</b> explicit edges</span><span><b>{currentTrueAtomCount}</b> true atoms</span>{currentSemanticChanges !== undefined && <span><b>{currentSemanticChanges}</b> changes from start</span>}</div></>}
            {result.prediction && <p className={`completion-prediction ${result.prediction.correct ? 'correct' : 'incorrect'}`}><strong>{result.prediction.correct ? 'Prediction correct.' : 'Prediction incorrect.'}</strong> {result.prediction.detail}</p>}
            {result.bonus && <p className={`completion-bonus ${result.bonus.achieved ? 'achieved' : ''}`}>{result.bonus.detail}</p>}
            <div className="completion-progress"><span>{activeLevels.filter((level) => completedLevelIds.has(level.id)).length}/{activeLevels.length} complete</span><div className="progress-meter"><i style={{ width: `${activeLevels.filter((level) => completedLevelIds.has(level.id)).length / activeLevels.length * 100}%` }} /></div></div>
            <div className="completion-actions">
              {campaignLevelIndex < activeLevels.length - 1 ? <button type="button" className="primary-action" autoFocus onClick={() => loadLevel(campaignLevelIndex + 1)}>{isHowToPlay ? 'Next lesson' : 'Next mission'}</button> : <button type="button" className="primary-action" autoFocus onClick={isHowToPlay ? continueLearningPath : returnToGuidedBrowser}>{isHowToPlay ? 'Continue to Truth at a World' : gameMode === 'custom' ? 'Return to sandbox' : gameMode === 'guidedCampaign' ? 'Back to Campaigns' : 'Back to Practice'}</button>}
              <button type="button" className="secondary-button" onClick={() => loadLevel(campaignLevelIndex)}>{focusedIntroWorkspace ? 'Replay' : 'Replay mission'}</button>
              {campaignLevelIndex < activeLevels.length - 1 && <button type="button" className="text-button" onClick={returnToGuidedBrowser}>Back to overview</button>}
            </div>
            <button type="button" className="completion-close" onClick={() => setCompletionDismissed(true)}>Keep exploring this model</button>
          </section>
        </div>
      )}

      {appView === 'workspace' && courseLesson && learnConceptOpen && (
        <div className="dialog-backdrop concept-backdrop" role="presentation" onMouseDown={() => setLearnConceptOpen(false)}>
          <section className="help-dialog lesson-concept-dialog" role="dialog" aria-modal="true" aria-labelledby="lesson-concept-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-heading"><div><p className="eyebrow">Learn Modal Logic · Lesson {activeLearnChapterIndex + 1}</p><h2 id="lesson-concept-title">{courseLesson.title}</h2></div><button type="button" className="dialog-close" onClick={() => setLearnConceptOpen(false)} aria-label="Close lesson concept">×</button></div>
            <div className="lesson-concept-grid"><article><h3>Learning objective</h3><p>{courseLesson.learningObjective}</p><h3>What to do</h3><p>{activeLevel?.instruction}</p></article><article><h3>{courseLesson.concept.heading}</h3><p>{courseLesson.concept.intuitive}</p>{courseLesson.concept.formal && <code>{courseLesson.concept.formal}</code>}<ul>{courseLesson.concept.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>{courseLesson.concept.warning && <p className="lesson-warning"><strong>Common pitfall:</strong> {courseLesson.concept.warning}</p>}</article>{courseLesson.workedExample && <WorkedExampleCard lessonId={courseLesson.id} example={courseLesson.workedExample} />}</div>
            <button type="button" className="primary-action" autoFocus onClick={() => setLearnConceptOpen(false)}>Start task</button>
          </section>
        </div>
      )}

      {appView === 'workspace' && showWorkspaceTour && (
        <div className="dialog-backdrop workspace-tour-backdrop" role="presentation">
          <section className="help-dialog workspace-tour" role="dialog" aria-modal="true" aria-labelledby="workspace-tour-title">
            <div className="dialog-heading"><div><p className="eyebrow">Workspace tour · {workspaceTourStep + 1} of {workspaceTourSteps.length}</p><h2 id="workspace-tour-title">{workspaceTourSteps[workspaceTourStep].title}</h2></div><button type="button" className="dialog-close" onClick={dismissWorkspaceTour} aria-label="Skip workspace tour">×</button></div>
            <div className={`workspace-tour-illustration step-${workspaceTourStep + 1}`} aria-hidden="true"><span>Model</span><span>Task</span><span>Result</span></div>
            <p className="workspace-tour-desktop-copy">{workspaceTourSteps[workspaceTourStep].body}</p>
            <p className="workspace-tour-mobile-copy">{'mobileBody' in workspaceTourSteps[workspaceTourStep] ? workspaceTourSteps[workspaceTourStep].mobileBody : workspaceTourSteps[workspaceTourStep].body}</p>
            <div className="workspace-tour-actions"><button type="button" className="text-button" onClick={dismissWorkspaceTour}>Skip</button><button type="button" disabled={workspaceTourStep === 0} onClick={() => setWorkspaceTourStep((step) => Math.max(0, step - 1))}>Back</button><button type="button" className="primary-action" autoFocus onClick={() => workspaceTourStep === workspaceTourSteps.length - 1 ? dismissWorkspaceTour() : setWorkspaceTourStep((step) => step + 1)}>{workspaceTourStep === workspaceTourSteps.length - 1 ? 'Done' : 'Next'}</button></div>
          </section>
        </div>
      )}

      {showFrameRules && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setShowFrameRules(false)}>
          <section className="help-dialog frame-rules-dialog" role="dialog" aria-modal="true" aria-labelledby="frame-rules-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-heading">
              <div><p className="eyebrow">Accessibility relation</p><h2 id="frame-rules-title">Frame constraints</h2></div>
              <button type="button" className="dialog-close" onClick={() => setShowFrameRules(false)} aria-label="Close frame rules">×</button>
            </div>
            <p className="dialog-intro">Constraints are input conditions, separate from the active objective. <strong>Validate</strong> requires a property without changing the relation. <strong>Enforce</strong> computes the least closure and displays generated edges as dashed lines.</p>
            {frameRuleConflicts.length > 0 && <div className="frame-rule-conflicts" role="status"><strong>Conflicting finite-frame requirements</strong>{frameRuleConflicts.map((conflict) => <p key={conflict.id}>{conflict.properties.join(' + ')}: {conflict.message}</p>)}</div>}
            <div className="frame-rule-grid">
              {([
                ['reflexive', 'Reflexive', 'wRw for every world', true],
                ['symmetric', 'Symmetric', 'wRv implies vRw', true],
                ['transitive', 'Transitive', 'wRv and vRu imply wRu', true],
                ['euclidean', 'Euclidean', 'wRv and wRu imply vRu', true],
                ['serial', 'Serial', 'Every world has a successor', false],
                ['irreflexive', 'Irreflexive', 'No world accesses itself', false],
                ['acyclic', 'Acyclic', 'The relation has no directed cycle', false],
              ] as const).map(([property, name, description, canEnforce]) => {
                const status = frameRuleResults.find((result) => result.property === property)
                return (
                  <div className="frame-rule-card" key={property}>
                    <div><strong>{name}</strong><span>{description}</span></div>
                    <select
                      disabled={!canEditConstraints}
                      aria-label={`${name} rule mode`}
                      value={frameRules[property]}
                      onChange={(event) => {
                        saveHistoryPoint()
                        setFrameRules((current) => ({ ...current, [property]: event.target.value as FrameRuleMode }))
                        setResult(null)
                      }}
                    >
                      <option value="off">Off</option>
                      <option value="validate">Validate</option>
                      {canEnforce && <option value="enforce">Enforce</option>}
                    </select>
                    {status && <div className={`rule-status ${status.holds ? 'pass' : 'fail'}`}><span>{status.holds ? 'Pass' : `Fail · ${status.violations.length} violation${status.violations.length === 1 ? '' : 's'}`}</span>{!status.holds && <details><summary>Inspect violations</summary><ol>{status.witnesses.map((witness, index) => <li key={`${witness.kind}:${index}`}><span>{describeFrameWitness(witness)}</span><button type="button" className="text-button" onClick={() => { clearGraphSelection(); setActiveFrameWitness(witness); setShowFrameRules(false) }}>Show on map</button></li>)}</ol></details>}</div>}
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      )}

      {showDataManager && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setShowDataManager(false)}>
          <section className="help-dialog data-dialog" role="dialog" aria-modal="true" aria-labelledby="data-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-heading"><div><p className="eyebrow">Local data</p><h2 id="data-title">Data management</h2></div><button type="button" className="dialog-close" onClick={() => setShowDataManager(false)} aria-label="Close data manager">×</button></div>
            <div className="data-actions">
              <article><h3>JSON import and backup</h3><p>Paste a model, guest-profile backup, or custom mission. Imported missions open immediately in a locked objective workspace.</p><textarea aria-label="Model JSON" value={importSource} onChange={(event) => { setImportSource(event.target.value); setDataMessage('') }} spellCheck={false} /><div><button type="button" className="primary-action" onClick={importModel}>Import JSON</button><button type="button" className="secondary-button" onClick={downloadModel}>Download model</button></div></article>
              <article className="level-author">
                <h3>Custom mission</h3><p>Create a mission from two separate workspace snapshots. Capture the player&rsquo;s starting state, build a valid solution in the workspace, then capture and verify that solution.</p>
                <MissionAuthorStepper currentStep={authorStep} visitedSteps={visitedAuthorSteps} errors={authorStepErrors} onSelectStep={goToAuthorStep} onBack={() => { setAuthorStep((step) => Math.max(1, step - 1)); setAuthorStepErrors([]) }} onNext={advanceAuthorStep}>
                {authorStep === 1 && <div className="author-step-fields">
                  <label><span>Mission title</span><input aria-label="Custom mission title" value={levelTitle} onChange={(event) => setLevelTitle(event.target.value)} /></label>
                  <label><span>Instruction</span><input aria-label="Custom mission instruction" value={levelInstruction} onChange={(event) => setLevelInstruction(event.target.value)} /></label>
                  <label><span>Learning objective</span><input aria-label="Custom mission learning objective" value={levelLearningObjective} onChange={(event) => setLevelLearningObjective(event.target.value)} /></label>
                  <label><span>Concept tags</span><input aria-label="Custom mission concept tags" value={levelConcept} onChange={(event) => setLevelConcept(event.target.value)} placeholder="necessity, countermodel" /></label>
                  <div className="author-pairs"><label><span>Prerequisites</span><input aria-label="Custom mission prerequisites" value={levelPrerequisites} onChange={(event) => setLevelPrerequisites(event.target.value)} placeholder="possibility, propositional connectives" /></label><label><span>Estimated difficulty</span><select aria-label="Custom mission difficulty" value={levelDifficulty} onChange={(event) => setLevelDifficulty(event.target.value as typeof levelDifficulty)}><option value="introductory">Introductory</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label></div>
                </div>}
                {authorStep === 2 && <div className="author-snapshots"><p>Arrange the player&rsquo;s starting model in the workspace, then capture it here.</p><button type="button" className="primary-action" onClick={captureMissionStart}>Capture mission start</button><span className={levelStartSnapshot ? 'pass' : ''}>{levelStartSnapshot ? `Start captured: ${levelStartSnapshot.worlds.length} world(s), ${levelStartSnapshot.edges.length} edge(s)` : 'No captured start'}</span></div>}
                {authorStep === 3 && <div className="author-step-fields">
                  <label><span>Formula</span><input aria-label="Authored mission formula" value={formulaSource} onChange={(event) => { const value = event.target.value; setFormulaSource(value); setLevelStartSnapshot((start) => start ? { ...start, formulaSource: value } : start) }} /></label>
                  <label><span>Comparison formula (optional)</span><input aria-label="Authored comparison formula" value={comparisonFormulaSource} onChange={(event) => { const value = event.target.value; setComparisonFormulaSource(value); setLevelStartSnapshot((start) => start ? { ...start, comparisonFormulaSource: value } : start) }} /></label>
                  <div className="author-pairs"><label><span>Scope</span><select aria-label="Authored mission scope" value={evaluationScope} onChange={(event) => { const value = event.target.value as EvaluationScope; setEvaluationScope(value); setLevelStartSnapshot((start) => start ? { ...start, evaluationScope: value } : start) }}><option value="pointed">At one world</option><option value="model">Throughout this model</option><option value="frame">On this finite frame</option></select></label><label><span>Target</span><select aria-label="Authored mission target truth" value={targetTruth ? 'true' : 'false'} onChange={(event) => { const value = event.target.value === 'true'; setTargetTruth(value); setLevelStartSnapshot((start) => start ? { ...start, targetTruth: value } : start) }}><option value="true">True</option><option value="false">False</option></select></label></div>
                  <label><span>Evaluation world</span><select aria-label="Authored mission evaluation world" value={evaluationWorld} onChange={(event) => { const value = event.target.value; setEvaluationWorld(value); setLevelStartSnapshot((start) => start ? { ...start, evaluationWorld: value } : start) }}>{(levelStartSnapshot?.worlds ?? worlds).map((world) => <option key={world.id} value={world.id}>{world.id}</option>)}</select></label>
                </div>}
                {authorStep === 4 && <fieldset><legend>Player may edit</legend>{(['worlds', 'valuations', 'edges', 'constraints', 'evaluation'] as const).map((permission) => <label key={permission}><input type="checkbox" checked={levelEditable.has(permission)} onChange={() => setLevelEditable((current) => { const next = new Set(current); if (next.has(permission)) next.delete(permission); else next.add(permission); return next })} /> {permission}</label>)}</fieldset>}
                {authorStep === 5 && <div className="author-step-fields">
                  <div className="author-bounds">{([['minimumWorlds', 'Min worlds'], ['maximumWorlds', 'Max worlds'], ['minimumEdges', 'Min edges'], ['maximumEdges', 'Max edges'], ['maximumChanges', 'Max changes']] as const).map(([key, label]) => <label key={key}><span>{label}</span><input type="number" min="0" step="1" aria-label={label} value={levelBounds[key]} onChange={(event) => setLevelBounds((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
                  <div className="author-pairs"><label><span>Required edges</span><input aria-label="Required custom mission edges" placeholder="w0 -> w1, w1 -> w2" value={levelRequiredEdges} onChange={(event) => setLevelRequiredEdges(event.target.value)} /></label><label><span>Forbidden edges</span><input aria-label="Forbidden custom mission edges" placeholder="w1 -> w0" value={levelForbiddenEdges} onChange={(event) => setLevelForbiddenEdges(event.target.value)} /></label><label><span>Required atoms</span><input aria-label="Required custom mission atoms" placeholder="w0: p q; w1: r" value={levelRequiredAtoms} onChange={(event) => setLevelRequiredAtoms(event.target.value)} /></label><label><span>Forbidden atoms</span><input aria-label="Forbidden custom mission atoms" placeholder="w0: r; w1: p" value={levelForbiddenAtoms} onChange={(event) => setLevelForbiddenAtoms(event.target.value)} /></label></div>
                  <fieldset><legend>Required frame properties</legend>{([...levelPropertyNames] as FramePropertyName[]).map((property) => <label key={property}><input type="checkbox" checked={levelRequiredProperties.has(property)} onChange={() => setLevelRequiredProperties((current) => { const next = new Set(current); if (next.has(property)) next.delete(property); else next.add(property); return next })} /> {property}</label>)}</fieldset>
                  <fieldset><legend>Forbidden frame properties</legend>{([...levelPropertyNames] as FramePropertyName[]).map((property) => <label key={property}><input type="checkbox" checked={levelForbiddenProperties.has(property)} onChange={() => setLevelForbiddenProperties((current) => { const next = new Set(current); if (next.has(property)) next.delete(property); else next.add(property); return next })} /> {property}</label>)}</fieldset>
                  <label><span>Optional bonus: maximum edges</span><input type="number" min="0" step="1" aria-label="Bonus maximum edges" value={levelBonusMaximumEdges} onChange={(event) => setLevelBonusMaximumEdges(event.target.value)} /></label>
                </div>}
                {authorStep === 6 && <div className="author-step-fields"><label><span>Prediction interaction</span><select aria-label="Custom mission prediction" value={levelPredictionKind} onChange={(event) => setLevelPredictionKind(event.target.value as typeof levelPredictionKind)}><option value="none">None</option><option value="truth">Predict truth value</option>{evaluationScope === 'model' && <option value="counterexample-world">Predict counterexample world</option>}<option value="frame-property">Identify relational property</option></select></label>{levelPredictionKind === 'frame-property' && <label><span>Required property answer</span><select aria-label="Required property answer" value={levelPredictionProperty} onChange={(event) => setLevelPredictionProperty(event.target.value as FramePropertyName)}>{levelPropertyNames.map((property) => <option key={property}>{property}</option>)}</select></label>}<p>Predictions are optional and do not penalize the learner.</p></div>}
                {authorStep === 7 && <div className="author-snapshots"><p>Build a passing state in the workspace, then capture it as the verified reference.</p><button type="button" className="primary-action" onClick={captureReferenceSolution} disabled={!levelStartSnapshot}>Capture valid solution</button><span className={levelReferenceSolution ? 'pass' : ''}>{levelReferenceSolution ? 'Solution verified' : 'No reference solution'}</span><button type="button" className="secondary-button" onClick={playtestCustomMission} disabled={!levelStartSnapshot}>Playtest as player</button><button type="button" className="secondary-button" onClick={restoreCapturedMissionStart} disabled={!levelStartSnapshot}>Restore captured start</button></div>}
                {authorStep === 8 && <section className="mission-audit" aria-label="Mission audit"><div><button type="button" className="primary-action" onClick={runMissionAudit}>Run mission audit</button></div><div className="settings-choice" aria-label="Preview viewport"><button type="button" className={authorPreview === 'desktop' ? 'active' : ''} aria-pressed={authorPreview === 'desktop'} onClick={() => setAuthorPreview('desktop')}>Desktop preview</button><button type="button" className={authorPreview === 'mobile' ? 'active' : ''} aria-pressed={authorPreview === 'mobile'} onClick={() => setAuthorPreview('mobile')}>Mobile preview</button></div><AuthorValidationSummary findings={missionAuditFindings} onGoToStep={(step) => { setVisitedAuthorSteps((current) => new Set([...current, step])); setAuthorStep(step); setAuthorStepErrors([]) }} /></section>}
                {authorStep === 9 && <div className="author-export-step"><p className={authorCanExport ? 'pass' : 'fail'}>{authorCanExport ? 'Audit passed: this draft can be exported or shared.' : 'Run validation and resolve every blocking error before export/share.'}</p><div className="author-final-actions"><button type="button" className="secondary-button" onClick={downloadCustomLevel} disabled={!authorCanExport}>Download custom mission</button><button type="button" className="secondary-button" onClick={generateMissionShareLink} disabled={!authorCanExport}>Generate mission link</button></div>
                <div className="campaign-packager">
                  <h4>Campaign package</h4>
                  <label><span>Campaign title</span><input aria-label="Custom campaign title" value={customCampaignTitle} onChange={(event) => setCustomCampaignTitle(event.target.value)} /></label>
                  <label><span>Description</span><input aria-label="Custom campaign description" value={customCampaignDescription} onChange={(event) => setCustomCampaignDescription(event.target.value)} /></label>
                  <button type="button" className="secondary-button" onClick={addMissionToCustomCampaign} disabled={!authorCanExport}>Add current mission to package</button>
                  {authoredCampaignMissions.length > 0 && <ol>{authoredCampaignMissions.map(({ level }, index) => <li key={level.id}><span>{index + 1}. {level.title}</span><button type="button" aria-label={`Remove ${level.title} from package`} onClick={() => setAuthoredCampaignMissions((current) => current.filter(({ level: candidate }) => candidate.id !== level.id))}>Remove</button></li>)}</ol>}
                  <div><button type="button" className="primary-action" disabled={authoredCampaignMissions.length === 0} onClick={downloadCustomCampaign}>Download campaign package</button><button type="button" className="secondary-button" disabled={authoredCampaignMissions.length === 0} onClick={generateCampaignShareLink}>Generate campaign link</button></div>
                </div>{shareLink && <div className="share-link-output"><label><span>Shareable URL</span><input aria-label="Shareable URL" readOnly value={shareLink} onFocus={(event) => event.currentTarget.select()} /></label><button type="button" className="secondary-button" onClick={copyShareLink}>Copy link</button><small>The mission data is encoded after # and is not sent to the hosting server.</small></div>}</div>}
                </MissionAuthorStepper>
              </article>
              <article><h3>Reset local data</h3><p>These actions affect only data stored in this browser. Models, formulas, settings, and history are not automatically transmitted; this build has no analytics SDK or tracking cookies.</p><button type="button" className="danger-button" onClick={resetSavedProgress}>Reset learning progress</button><button type="button" className="danger-button" onClick={resetSavedSandbox}>Reset saved sandbox</button></article>
            </div>
            {dataMessage && <p className="data-message" role="status">{dataMessage}</p>}
          </section>
        </div>
      )}

      {showHelp && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setShowHelp(false)}>
          <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-heading">
              <div><p className="eyebrow">Modal Logic Guide</p><h2 id="help-title">Guide</h2></div>
              <button type="button" className="dialog-close" onClick={() => setShowHelp(false)} aria-label="Close guide">×</button>
            </div>
            <div className="guide-tabs" role="tablist" aria-label="Guide sections" onKeyDown={(event) => handleTabListKeyDown(event, ['theory', 'controls', 'objectives'], guideTab as 'theory' | 'controls' | 'objectives', setGuideTab)}>
              <button type="button" role="tab" tabIndex={guideTab === 'theory' ? 0 : -1} aria-selected={guideTab === 'theory'} className={guideTab === 'theory' ? 'active' : ''} onClick={() => setGuideTab('theory')}>Modal logic</button>
              <button type="button" role="tab" tabIndex={guideTab === 'controls' ? 0 : -1} aria-selected={guideTab === 'controls'} className={guideTab === 'controls' ? 'active' : ''} onClick={() => setGuideTab('controls')}>Controls</button>
              <button type="button" role="tab" tabIndex={guideTab === 'objectives' ? 0 : -1} aria-selected={guideTab === 'objectives'} className={guideTab === 'objectives' ? 'active' : ''} onClick={() => setGuideTab('objectives')}>Objectives & constraints</button>
            </div>
            {isHowToPlay && <button type="button" className="secondary-button" onClick={() => { setShowHelp(false); setAppView('tutorial') }}>Replay Learn the Controls</button>}
            {guideTab === 'theory' && <div className="introduction-grid">
              <article><span>01</span><div><h3>Frames</h3><p>A Kripke frame is <strong>F = ⟨W,R⟩</strong>, with non-empty W and <strong>R ⊆ W × W</strong>. We write wRv when v is accessible from w.</p></div></article>
              <article><span>02</span><div><h3>Valuation and model</h3><p>A valuation is <strong>ν: Prop → ℘(W)</strong>, and <strong>M = ⟨W,R,ν⟩</strong>. Thus M,w ⊨ p exactly when w ∈ ν(p).</p></div></article>
              <article><span>03</span><div><h3>Satisfaction</h3><p><strong>M,w ⊨ φ</strong> means φ is true at w in M. Boolean connectives retain their classical clauses.</p></div></article>
              <article><span>04</span><div><h3>Necessity</h3><p><strong>M,w ⊨ □φ</strong> iff every v with wRv satisfies φ. With no successors, □φ is vacuously true.</p></div></article>
              <article><span>05</span><div><h3>Possibility</h3><p><strong>M,w ⊨ ◇φ</strong> iff some v with wRv satisfies φ. With no successors, ◇φ is false.</p></div></article>
              <article><span>06</span><div><h3>Global and frame validity</h3><p><strong>M ⊨ φ</strong> quantifies over worlds under ν. <strong>F ⊨ φ</strong> additionally quantifies over every valuation ν.</p></div></article>
            </div>}
            {guideTab === 'controls' && <div className="help-grid">
              <MapControlsReference onReplayTour={() => { setShowHelp(false); openWorkspaceTour() }} />
              <div><h3>Guided tasks</h3><p>Make the requested edit, select Check task, then continue after the task is confirmed.</p></div>
              <div><h3>Editor modes</h3><p>Edit mode unlocks construction tools. Evaluate mode locks the graph against accidental changes and keeps verification close at hand.</p></div>
              <div><h3>Legend</h3><p><span className="legend-swatch petrol" /> Evaluation world<br /><span className="legend-line" /> Explicit edge<br /><span className="legend-line derived" /> Edge derived from frame properties<br /><span className="legend-reflexive">↻</span> Reflexive relation wRw</p></div>
              <div><h3>Verification scopes</h3><p>Check one world, every world under the current valuation, or frame validity across every valuation of the formula's atoms.</p></div>
              <div><h3>Formal notation</h3><p>A frame is F = ⟨W,R⟩ and a model is M = ⟨W,R,ν⟩. We write M,w ⊨ φ for truth at a world; ⊨ is used consistently throughout the game.</p></div>
              <div><h3>Frame constraints</h3><p>Validate requires a property without editing the relation. Enforce computes reflexive, symmetric, transitive, or Euclidean closure. Constraints remain separate from the formula objective.</p></div>
              <div><h3>Correspondence lab</h3><p>Load standard modal axioms T, D, B, 4, and 5 to compare finite-frame validity with their corresponding frame properties.</p></div>
              <div><h3>Formula notation</h3><p>Use ¬, ∧, ∨, →, □, ◇ or the alternatives !, &amp;, |, -&gt;, box, diamond.</p></div>
              <div><h3>Storage</h3><p>Your sandbox is saved only in this browser. Reset model restores the initial example.</p></div>
            </div>}
            {guideTab === 'objectives' && <div className="help-grid objective-guide">
              <div><h3>Pointed objectives</h3><p>Make or refute M,w ⊨ φ at one selected world under the current valuation.</p></div>
              <div><h3>Model-global objectives</h3><p>Make or refute M ⊨ φ: the formula is checked at every world while ν remains fixed.</p></div>
              <div><h3>Frame objectives</h3><p>Establish or refute F ⊨ φ by checking every world under every valuation of the formula's atoms.</p></div>
              <div><h3>Correspondence objectives</h3><p>Compare frame validity with a relational property. The current finite frame is an instance check, not a general proof.</p></div>
              <div><h3>Size constraints</h3><p>Levels may impose exact, minimum, or maximum numbers of worlds and explicit edges.</p></div>
              <div><h3>Structural constraints</h3><p>Specific edges may be required or forbidden. Relations may also be required to satisfy or violate standard frame properties.</p></div>
              <div><h3>Valuation constraints</h3><p>An atom may be required to be true or false at a named world while other valuation choices remain editable.</p></div>
              <div><h3>Locked inputs</h3><p>A guided task can lock formulas, worlds, valuations, relations, the evaluation world, or the Constraints controls.</p></div>
              <div><h3>Campaign families</h3><p>Current campaigns cover local models and countermodels, global model building, frame validity, countervaluations, and correspondence.</p></div>
              <div><h3>Optimization</h3><p>Maximum-size constraints create constructions within an authored size bound without changing modal semantics.</p></div>
            </div>}
          </section>
        </div>
      )}
      </main>
    </div>
  )
}
