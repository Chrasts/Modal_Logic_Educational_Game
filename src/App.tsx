import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
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
import { learnCourse, learnLessons, learnLessonByTaskId } from './learn'
import { emptyLearnProgress, learnProgressKey, loadLearnProgress, type LearnProgress } from './learn-progress'
import { ModalLogicWelcome } from './ModalLogicWelcome'
import { MissionHeader, type MissionHeaderMode } from './components/MissionHeader'
import { QuestionTaskPanel } from './components/QuestionTaskPanel'
import { PredictionInput } from './components/PredictionInput'
import { WorkspaceQuickHelp } from './components/WorkspaceQuickHelp'
import { WorkspaceToolbar } from './components/WorkspaceToolbar'
import { VerificationSummary } from './components/VerificationSummary'
import { WorkspaceTour } from './components/WorkspaceTour'
import { EvaluationExplorer } from './components/EvaluationExplorer'
import { MobileUnsupportedGuard } from './components/MobileUnsupportedGuard'
import { EvaluationDiagnostics, EvaluationTree, flattenEvaluationTraces } from './workspace/EvaluationTrace'
import { MobileWorkspaceTabs } from './workspace/MobileWorkspaceTabs'
import { ReflexiveRelationBadge } from './workspace/ReflexiveRelationBadge'
import { modalEdgeTypes, resolveModalEdgeEndpoints } from './workspace/ModalEdge'
import { MAP_MAX_ZOOM, MAP_MIN_ZOOM, modelMapInteractionProps, resolveMapWheelHandling } from './workspace/map-interactions'
import { buildReflexiveRelationPresentations, buildRelationPresentations, describeRelationPresentation, type RelationDirectionPresentation, type RelationPresentation } from './workspace/relation-presentation'
import { applyCollisionClassNames, commitWorldPosition, findFreeWorldPosition, findOverlappingWorldKeys, resolveWorldVisualCenter, shouldCreateWorldFromPaneClick, WORLD_NODE_SIZE, type WorldPosition } from './workspace/world-placement'
import { createTidyModelLayout } from './workspace/model-layout'
import { assignRelationRouteLanes, RECIPROCAL_ARROWHEAD_SIZE, SINGLE_ARROWHEAD_SIZE, type RelationRouteItem } from './workspace/relation-routing'
import { isTextEntryTarget, resolveDeleteSelection, shouldBeginValuationEdit } from './workspace/selection-keyboard'
import { deleteWorldFromEditableModel, validateEditableModel, validateExplicitEdgeCandidate, validateWorldIdCandidate } from './workspace/model-integrity'
import { WorldIdInput } from './workspace/WorldIdInput'
import { worldNodeTypes } from './workspace/WorldNode'
import { WorkspaceResizeHandle } from './workspace/WorkspaceResizeHandle'
import { defaultWorkspaceLayout, normalizeWorkspaceLayout, resizeWorkspaceSide, type WorkspaceLayout } from './workspace/workspace-layout'
import { insertAtSelection, validateFormulaInput } from './formula-input'
import { findFrameRuleConflicts } from './logic/frame-rule-conflicts'
import { ProgressiveHints } from './components/ProgressiveHints'
import { WorkedExampleCard } from './learn/WorkedExampleCard'
import { buildQuestionFeedback } from './learn/question-feedback'
import { playSound } from './audio/sound-effects'
import { parseCustomCampaign, serializeCustomCampaign } from './campaign-format'
import { assertCompatibleAuthoredConstraints, parseAuthoredAtoms, parseAuthoredEdges } from './author-constraints'
import { createShareUrl, readSharedJson } from './share-url'
import { createSandboxSharePayload, isSandboxSharePayload, parseSandboxSharePayload } from './sandbox-share'
import { createEducatorCsv } from './educator-export'
import { auditMission, type MissionAuditFinding } from './mission-audit'
import { MissionAuthorStepper } from './authoring/MissionAuthorStepper'
import { AuthorValidationSummary } from './authoring/AuthorValidationSummary'
import { useDialogFocus } from './hooks/useDialogFocus'
import { HomeView } from './app/HomeView'
import { LearnOverview } from './app/LearnOverview'
import { CampaignsView, type CampaignSection } from './app/CampaignsView'
import { SettingsView } from './app/SettingsView'
import { CreateView } from './app/CreateView'
import { DataManagerDialog } from './app/DataManagerDialog'
import { MissionAuthoringView } from './app/MissionAuthoringView'
import { ReferenceView } from './app/ReferenceView'
import { HelpView } from './app/HelpView'
import { ProfileView } from './app/ProfileView'
import { LabView } from './app/LabView'
import { LearnRecoveryActions } from './components/LearnRecoveryActions'
import { resolveLearningNavigation, type LearningDestination } from './learn/navigation'
import { assertValidReferenceSolution, parseCustomLevelFile, parseCustomLevelPackage, serializeCustomLevel, type ParsedCustomLevelFile, type ReferenceSolution } from './level-format'
import { parseProgressBackup, parseSandboxModel, serializeProgressBackup } from './local-data'
import {
  applyFrameProperties,
  checkConstructionConstraints,
  checkFrameProperty,
  canonicalModelSignature,
  collectAtoms,
  buildSemanticHighlight,
  createModel,
  formulaAtPath,
  listFormulaOccurrences,
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
type GameMode = 'sandbox' | 'tutorial' | 'learn' | 'campaign' | 'guidedCampaign' | 'custom' | 'author'
type AppView = 'home' | 'workspace' | 'learn' | 'welcome' | 'campaigns' | 'lab' | 'create' | 'reference' | 'help' | 'profile' | 'settings'
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
const workspaceLayoutKey = 'logic-game:workspace-layout:v1'
const workspaceTourKey = 'logic-game:workspace-tour:v1'
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
const loadWorkspaceLayout = (): WorkspaceLayout => {
  try { return normalizeWorkspaceLayout(JSON.parse(localStorage.getItem(workspaceLayoutKey) ?? 'null')) }
  catch { return defaultWorkspaceLayout }
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
interface AuthorWorkspaceSession {
  readonly purpose: 'starting-model' | 'reference-solution'
  readonly returnStep: number
  readonly previousWorkspace: SandboxDraft
  readonly previousGameMode: GameMode
}
const levelPropertyNames = Object.keys(defaultFrameRules) as FramePropertyName[]

const correspondencePresets = [
  { id: 't', name: 'T: Reflexivity', formula: '□p → p', property: 'reflexive' as const },
  { id: 'd', name: 'D: Seriality', formula: '□p → ◇p', property: 'serial' as const },
  { id: 'b', name: 'B: Symmetry', formula: 'p → □◇p', property: 'symmetric' as const },
  { id: '4', name: '4: Transitivity', formula: '□p → □□p', property: 'transitive' as const },
  { id: '5', name: '5: Euclidean', formula: '◇p → □◇p', property: 'euclidean' as const },
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

function AppContent({ initialView = 'home' }: { readonly initialView?: AppView } = {}) {
  const [initialDraft] = useState(loadDraft)
  const [initialInterfaceSettings] = useState(loadInterfaceSettings)
  const [workspaceLayout, setWorkspaceLayout] = useState(loadWorkspaceLayout)
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
  const selectedValuationInputRef = useRef<HTMLInputElement>(null)
  const verificationResultRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLElement>(null)
  const [customLevels, setCustomLevels] = useState<readonly GameLevel[]>([])
  const [customCampaignTitle, setCustomCampaignTitle] = useState('Custom campaign')
  const [customCampaignDescription, setCustomCampaignDescription] = useState('A user-authored sequence of modal logic missions.')
  const [authoredCampaignMissions, setAuthoredCampaignMissions] = useState<readonly ParsedCustomLevelFile[]>([])
  const [appView, setAppView] = useState<AppView>(initialView)
  const appViewHistory = useRef<AppView[]>([])
  const lastAppView = useRef<AppView>(initialView)
  const suppressViewHistory = useRef(false)
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
  const [importedAuthorFile, setImportedAuthorFile] = useState<ParsedCustomLevelFile | null>(null)
  const [missionAuditFindings, setMissionAuditFindings] = useState<readonly MissionAuditFinding[]>([])
  const [authorStep, setAuthorStep] = useState(1)
  const [visitedAuthorSteps, setVisitedAuthorSteps] = useState<ReadonlySet<number>>(new Set([1]))
  const [authorStepErrors, setAuthorStepErrors] = useState<readonly string[]>([])
  const [authorStudioOpen, setAuthorStudioOpen] = useState(false)
  const [authorWorkspaceSession, setAuthorWorkspaceSession] = useState<AuthorWorkspaceSession | null>(null)
  const [authorPlaytest, setAuthorPlaytest] = useState(false)

  useEffect(() => {
    if (levelStartSnapshot?.evaluationScope !== 'model' && levelPredictionKind === 'counterexample-world') setLevelPredictionKind('none')
  }, [levelStartSnapshot?.evaluationScope, levelPredictionKind])
  useEffect(() => {
    if (appView === 'workspace' && gameMode !== 'author' && !learnConceptOpen && localStorage.getItem(workspaceTourKey) !== 'seen') {
      setWorkspaceTourStep(0)
      setShowWorkspaceTour(true)
    }
  }, [appView, gameMode, learnConceptOpen])
  const [nextWorldKey, setNextWorldKey] = useState(() => Math.max(-1, ...worlds.map(({ key }) => key)) + 1)
  const [nextEdgeKey, setNextEdgeKey] = useState(() => Math.max(-1, ...edges.map(({ key }) => key)) + 1)
  const [selectedEdgeKey, setSelectedEdgeKey] = useState<number | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showDataManager, setShowDataManager] = useState(false)
  const [importSource, setImportSource] = useState('')
  const [backupImportSource, setBackupImportSource] = useState('')
  const [customImportSource, setCustomImportSource] = useState('')
  const [dataMessage, setDataMessage] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [sandboxShareMessage, setSandboxShareMessage] = useState('')
  const [showEvaluationExplorer, setShowEvaluationExplorer] = useState(false)
  const [selectedFormulaPath, setSelectedFormulaPath] = useState('root')
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
    setWorkspaceLayout(defaultWorkspaceLayout)
    try { localStorage.removeItem(interfaceSettingsKey) } catch { /* Preferences remain reset in memory. */ }
    try { localStorage.removeItem(workspaceLayoutKey) } catch { /* Layout remains reset in memory. */ }
  }
  const [showWorkspaceTour, setShowWorkspaceTour] = useState(() => initialView === 'workspace' && localStorage.getItem(workspaceTourKey) !== 'seen')
  const [workspaceTourStep, setWorkspaceTourStep] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))
  const [selectedWorldKey, setSelectedWorldKey] = useState<number | null>(null)
  const [activeFrameWitness, setActiveFrameWitness] = useState<FramePropertyWitness | null>(null)
  const [hoveredWorldKey, setHoveredWorldKey] = useState<number | null>(null)
  const [collidingWorldKeys, setCollidingWorldKeys] = useState<ReadonlySet<number>>(new Set())
  const [expandedRelationPairKey, setExpandedRelationPairKey] = useState<string | null>(null)
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null)
  const graphCanvasRef = useRef<HTMLDivElement>(null)
  const historyPast = useRef<ModelHistoryEntry[]>([])
  const historyFuture = useRef<ModelHistoryEntry[]>([])
  const sandboxBeforeCampaign = useRef<SandboxDraft | null>(null)
  const sharedSandboxSession = useRef(false)
  const authorPlaytestReturnMode = useRef<GameMode>('sandbox')
  const [historyVersion, setHistoryVersion] = useState(0)

  useEffect(() => {
    if (lastAppView.current === appView) return
    if (suppressViewHistory.current) suppressViewHistory.current = false
    else appViewHistory.current.push(lastAppView.current)
    lastAppView.current = appView
  }, [appView])

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
    if (gameMode !== 'sandbox' || authorWorkspaceSession || sharedSandboxSession.current) return
    const draft: SandboxDraft = { formulaSource, comparisonFormulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope }
    try { localStorage.setItem(storageKey, JSON.stringify(draft)) } catch { /* Persistence is optional in restricted browsers. */ }
  }, [formulaSource, comparisonFormulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope, gameMode, authorWorkspaceSession])

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
    try { localStorage.setItem(workspaceLayoutKey, JSON.stringify(workspaceLayout)) } catch { /* Layout remains available for this session. */ }
  }, [workspaceLayout])

  useEffect(() => {
    if (appView !== 'workspace') return
    const reconcileWorkspaceWidth = () => {
      const width = workspaceRef.current?.clientWidth
      if (!width || width <= 0) return
      setWorkspaceLayout((current) => {
        const next = resizeWorkspaceSide(current, 'left', current.left, Math.max(0, width - 40))
        return next.left === current.left && next.right === current.right ? current : next
      })
    }
    reconcileWorkspaceWidth()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(reconcileWorkspaceWidth)
    if (workspaceRef.current) observer?.observe(workspaceRef.current)
    window.addEventListener('resize', reconcileWorkspaceWidth)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', reconcileWorkspaceWidth)
    }
  }, [appView])

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

  const formulaValidation = useMemo(() => validateFormulaInput(formulaSource), [formulaSource])
  const comparisonFormulaValidation = useMemo(() => validateFormulaInput(comparisonFormulaSource), [comparisonFormulaSource])
  useEffect(() => { setSelectedFormulaPath('root') }, [formulaSource])
  const explorerModel = useMemo(() => {
    try {
      const ids = worlds.map(({ id }) => id.trim())
      if (ids.some((id) => !id) || new Set(ids).size !== ids.length) return null
      return createModel(Object.fromEntries(worlds.map(({ id, atoms }) => [id.trim(), atoms.split(/[\s,]+/u).filter(Boolean)])), effectiveEdges)
    } catch { return null }
  }, [worlds, effectiveEdges])
  const explorerFormula = formulaValidation.kind === 'valid' ? formulaValidation.formula : undefined
  const selectedExplorerFormula = useMemo(() => {
    if (!explorerFormula) return undefined
    const occurrence = listFormulaOccurrences(explorerFormula).find(({ key }) => key === selectedFormulaPath)
    return occurrence?.formula ?? formulaAtPath(explorerFormula, []) ?? undefined
  }, [explorerFormula, selectedFormulaPath])
  const explorerHighlight = useMemo(() => gameMode === 'sandbox' && showEvaluationExplorer && explorerModel && selectedExplorerFormula
    ? buildSemanticHighlight(explorerModel, selectedExplorerFormula, evaluationWorld)
    : undefined, [gameMode, showEvaluationExplorer, explorerModel, selectedExplorerFormula, evaluationWorld])
  const explorerRelevantEdges = useMemo(() => explorerHighlight?.relevantEdges ?? new Set<string>(), [explorerHighlight])

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
        return explicitEdgeKeyByPair.has(pair) || traceCheckedEdges.has(pair) || explorerRelevantEdges.has(pair)
      }),
    [effectiveEdges, explicitEdgeKeyByPair, showDerivedEdges, traceCheckedEdges, explorerRelevantEdges],
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
          {explorerHighlight?.trueWorlds.has(world.id.trim()) && <span className="explorer-truth-badge true">✓ TRUE</span>}
          {explorerHighlight?.falseWorlds.has(world.id.trim()) && <span className="explorer-truth-badge false">✕ FALSE</span>}
          {explorerHighlight?.witnessWorlds.has(world.id.trim()) && <span className="explorer-role-badge witness">WITNESS</span>}
          {explorerHighlight?.counterexampleWorlds.has(world.id.trim()) && <span className="explorer-role-badge counterexample">COUNTEREXAMPLE</span>}
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
      activeTrace && !explorerHighlight && !traceRelatedWorlds.has(world.id.trim()) ? 'trace-irrelevant-node' : '',
      frameWitnessPresentation.worldIds.has(world.id.trim()) ? 'frame-witness-node' : '',
      explorerHighlight?.sourceWorld === world.id.trim() ? 'explorer-source-node' : '',
      explorerHighlight?.trueWorlds.has(world.id.trim()) ? 'explorer-true-node' : '',
      explorerHighlight?.falseWorlds.has(world.id.trim()) ? 'explorer-false-node' : '',
      explorerHighlight?.witnessWorlds.has(world.id.trim()) ? 'explorer-witness-node' : '',
      explorerHighlight?.counterexampleWorlds.has(world.id.trim()) ? 'explorer-counterexample-node' : '',
    ].filter(Boolean).join(' '),
    ariaLabel: `${mapQuestionMode ? 'Answer option, ' : ''}World ${world.id || 'without a name'}, atoms ${world.atoms || 'none'}${reflexiveRelations.has(world.id.trim()) ? `, ${reflexiveRelations.get(world.id.trim())?.derived ? 'derived' : 'explicit'} reflexive accessibility` : ''}${mapQuestionMode && predictionAnswer === world.id.trim() ? ', selected' : ''}${explorerHighlight?.trueWorlds.has(world.id.trim()) ? ', selected subformula true' : explorerHighlight?.falseWorlds.has(world.id.trim()) ? ', selected subformula false' : ''}`,
    domAttributes: mapQuestionMode ? { 'aria-pressed': predictionAnswer === world.id.trim() } : undefined,
  })), [worlds, evaluationWorld, selectedWorldKey, selectedEdgeKey, reflexiveRelations, graphEdgesEditable, traceCheckedEdges, activeTrace, traceWitnessWorld, traceCounterexampleWorld, traceRelatedWorlds, mapQuestionMode, predictionAnswer, activeFrameWitness, frameWitnessPresentation.worldIds, explorerHighlight])

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
          activeTrace && !explorerHighlight && !traceCheckedEdges.has(directionPair) ? 'trace-irrelevant-edge' : '',
          explorerRelevantEdges.has(directionPair) ? 'explorer-relevant-edge' : '',
          explorerHighlight?.witnessWorlds.has(direction.to) && explorerHighlight.sourceWorld === direction.from ? 'explorer-witness-edge' : '',
          explorerHighlight?.counterexampleWorlds.has(direction.to) && explorerHighlight.sourceWorld === direction.from ? 'explorer-counterexample-edge' : '',
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
        const explorerChecked = explorerRelevantEdges.has(`${presentation.forward.from}\u0000${presentation.forward.to}`)
          || explorerRelevantEdges.has(`${presentation.reverse.from}\u0000${presentation.reverse.to}`)
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
            ...focusClasses(presentation, selected), checked ? 'trace-checked-edge' : '', activeTrace && !explorerHighlight && !checked ? 'trace-irrelevant-edge' : '', explorerChecked ? 'explorer-relevant-edge' : '',
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
  }, [relationPresentations, expandedRelationPairKey, worldKeyById, worlds, selectedEdgeKey, focusedWorldId, traceCheckedEdges, traceForcedDerivedPairKeys, traceWitnessWorld, traceCounterexampleWorld, activeTrace, graphEdgesEditable, frameWitnessPresentation, explorerRelevantEdges, explorerHighlight])

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
                  x2={resolveWorldVisualCenter(targetWorld.position).x}
                  y2={resolveWorldVisualCenter(targetWorld.position).y}
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
  const overallCampaignLevels = campaignTracks.reduce((total, track) => total + track.levels.length, 0)
  const overallCampaignCompleted = campaignTracks.reduce((total, track) => total + track.levels.filter((level) => completedLevelIds.has(level.id)).length, 0)
  const successfulAttempts = guestProfile.history.filter((entry) => entry.success).length
  const completedHistoryLevels = new Set(guestProfile.history.filter((entry) => entry.success && entry.levelId).map((entry) => entry.levelId)).size
  const distinctSolutions = Object.values(guestProfile.solutionSignatures).reduce((total, signatures) => total + signatures.length, 0)
  const activeDistinctSolutionCount = activeLevel ? guestProfile.solutionSignatures[activeLevel.id]?.length ?? 0 : 0
  const currentValuation = Object.fromEntries(worlds.map(({ id, atoms }) => [id.trim(), atoms.split(/[\s,]+/u).filter(Boolean)]))
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
              : verdict.holds ? 'Every world satisfies the formula under every valuation.' : 'Frame validity checks every valuation. A world and countervaluation refute it.',
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
    if (result && !isQuestionTask) verificationResultRef.current?.focus()
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
  const hasSemanticResultDetails = Boolean(result && 'verdict' in result && (result.verdict || result.bonus || result.prediction))
  const resizeWorkspacePanel = (side: 'left' | 'right', desiredWidth: number) => {
    const measuredWidth = workspaceRef.current?.clientWidth
    const totalWidth = measuredWidth && measuredWidth > 0 ? measuredWidth : 1280
    setWorkspaceLayout((current) => resizeWorkspaceSide(current, side, desiredWidth, Math.max(0, totalWidth - 40)))
  }
  const workspaceGridStyle = {
    '--workspace-left-width': `${workspaceLayout.left}px`,
    '--workspace-right-width': `${workspaceLayout.right}px`,
  } as CSSProperties
  const anyDialogOpen = showHelp || showFrameRules || showDataManager || learnConceptOpen || showWorkspaceTour
  useDialogFocus(anyDialogOpen, () => {
    if (showWorkspaceTour) { try { localStorage.setItem(workspaceTourKey, 'seen') } catch { /* Optional persistence. */ }; setShowWorkspaceTour(false) }
    else if (learnConceptOpen) setLearnConceptOpen(false)
    else { setShowHelp(false); setShowFrameRules(false); setShowDataManager(false) }
  })
  const activeLearnChapter = courseLesson ? learnCourse.chapters.find((chapter) => chapter.id === courseLesson.chapterId) : undefined
  const activeLearnChapterIndex = activeLearnChapter && courseLesson ? activeLearnChapter.lessons.findIndex((lesson) => lesson.id === courseLesson.id) : -1
  const isGuidedMode = gameMode !== 'sandbox' && gameMode !== 'author'
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
  const completedGuidedTask = Boolean(activeLevel && result?.kind === 'success')
  const taskIsLocked = Boolean(isQuestionTask || completedGuidedTask)
  const canEditWorlds = !taskIsLocked && editorMode === 'edit' && (!activeLevel || activeLevel.editable.includes('worlds'))
  const canEditValuations = !taskIsLocked && editorMode === 'edit' && (!activeLevel || activeLevel.editable.includes('valuations'))
  const canEditEdges = !taskIsLocked && editorMode === 'edit' && (!activeLevel || activeLevel.editable.includes('edges'))
  const canEditConstraints = !taskIsLocked && (!activeLevel || activeLevel.editable.includes('constraints'))
  const canEditEvaluation = !taskIsLocked && (!activeLevel || activeLevel.editable.includes('evaluation'))
  const canRepositionWorlds = !completedGuidedTask && editorMode === 'edit' && !isQuestionTask && activeLevel?.workspacePresentation?.lockLayout !== true
  const canUseHistory = !isHowToPlay || tutorialAllows('history')
  const tutorialAtomVocabulary = isHowToPlay ? activeLevel?.atomVocabulary : undefined

  useEffect(() => {
    const handleWorkspaceShortcut = (event: KeyboardEvent) => {
      const overlayOpen = showHelp || showFrameRules || showDataManager || showWorkspaceTour || learnConceptOpen || utilityMenuOpen
      if (appView !== 'workspace' || overlayOpen || isTextEntryTarget(event.target)) return
      if (shouldBeginValuationEdit({
        key: event.key,
        target: event.target,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        isComposing: event.isComposing,
        hasSelectedWorld: selectedWorldKey !== null,
        valuationsVisible: showValuations && tutorialAllows('valuations'),
        canEditValuations,
        overlayOpen,
      })) {
        const input = selectedValuationInputRef.current
        input?.focus()
        const end = input?.value.length ?? 0
        input?.setSelectionRange(end, end)
        return
      }
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

  useEffect(() => {
    const canvas = graphCanvasRef.current
    if (!canvas) return
    let previousDebugTime = 0
    const handleMapWheel = (event: WheelEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.react-flow')) return
      if (event.target.closest('.react-flow__minimap')) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (event.target.closest('.react-flow__panel, button, input, select, textarea, [role="button"], [role="slider"]')) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (!flowInstance) return
      const bounds = canvas.getBoundingClientRect()
      event.preventDefault()
      event.stopPropagation()
      const handling = resolveMapWheelHandling(event, flowInstance.getViewport(), {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })
      if (import.meta.env.DEV && localStorage.getItem('logic-game:debug-map-wheel') === '1') {
        const now = performance.now()
        console.debug('[map-wheel]', { dt: Math.round(now - previousDebugTime), deltaX: event.deltaX, deltaY: event.deltaY, deltaMode: event.deltaMode, ctrlKey: event.ctrlKey, gesture: handling.gesture })
        previousDebugTime = now
      }
      void flowInstance.setViewport(handling.viewport, { duration: 0 })
    }
    canvas.addEventListener('wheel', handleMapWheel, { passive: false, capture: true })
    return () => canvas.removeEventListener('wheel', handleMapWheel, true)
  }, [flowInstance])

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
    if (!edges.some((edge) => edge.key === key)) return
    saveHistoryPoint()
    setEdges((current) => current.filter((edge) => edge.key !== key))
    clearGraphSelection()
    setResult(null)
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
    historyPast.current = []
    historyFuture.current = []
    setHistoryVersion((version) => version + 1)
  }

  useEffect(() => {
    try {
      const shared = readSharedJson()
      if (!shared) return
      const imported = JSON.parse(shared) as Record<string, unknown>
      if (isSandboxSharePayload(imported)) {
        const sandbox = parseSandboxSharePayload(imported)
        sharedSandboxSession.current = true
        setGameMode('sandbox')
        setAppView('workspace')
        setFormulaSource(sandbox.formula)
        setComparisonFormulaSource(sandbox.comparisonFormula)
        setWorlds(sandbox.worlds.map((world, key) => ({ key, id: world.id, atoms: world.atoms.join(' '), position: { x: 90 + (key % 3) * 240, y: 90 + Math.floor(key / 3) * 160 } })))
        setEdges(sandbox.edges.map((edge, key) => ({ key, ...edge })))
        setEvaluationWorld(sandbox.evaluationWorld)
        setTargetTruth(sandbox.targetTruth)
        setEvaluationScope(sandbox.scope)
        setFrameRules(sandbox.frameRules)
        setNextWorldKey(sandbox.worlds.length)
        setNextEdgeKey(sandbox.edges.length)
        setResult(null)
        setSandboxShareMessage('Shared Sandbox loaded. This link did not replace your saved local Sandbox.')
        return
      }
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
    setLearnConceptOpen(false)
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
    if (authorWorkspaceSession || authorPlaytest || gameMode === 'author') return
    const entry: HistoryEntry = {
      id: createLocalId(), timestamp: new Date().toISOString(), mode: gameMode,
      levelId: activeLevel?.id, title: activeLevel?.title ?? 'Model Sandbox verification',
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
      const prediction = activeLevel?.prediction && predictionAnswer
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
      if (overallSuccess && activeLevel && !authorPlaytest) {
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

  const currentWorkspaceDraft = (): SandboxDraft => ({ formulaSource, comparisonFormulaSource, worlds: structuredClone(worlds), edges: structuredClone(edges), evaluationWorld, targetTruth, frameRules: { ...frameRules }, evaluationScope })

  const restoreWorkspaceDraft = (draft: SandboxDraft) => {
    setFormulaSource(draft.formulaSource)
    setComparisonFormulaSource(draft.comparisonFormulaSource ?? '')
    setWorlds(structuredClone(draft.worlds))
    setEdges(structuredClone(draft.edges))
    setEvaluationWorld(draft.evaluationWorld)
    setTargetTruth(draft.targetTruth)
    setFrameRules({ ...defaultFrameRules, ...draft.frameRules })
    setEvaluationScope(draft.evaluationScope === 'world' ? 'pointed' : draft.evaluationScope ?? 'pointed')
    setNextWorldKey(Math.max(-1, ...draft.worlds.map(({ key }) => key)) + 1)
    setNextEdgeKey(Math.max(-1, ...draft.edges.map(({ key }) => key)) + 1)
    setResult(null)
  }

  const openAuthorWorkspace = (purpose: AuthorWorkspaceSession['purpose']) => {
    if (purpose === 'reference-solution' && !levelStartSnapshot) { setDataMessage('Capture the starting model before building a reference solution.'); return }
    const previousWorkspace = currentWorkspaceDraft()
    const previousGameMode = gameMode
    const source = levelStartSnapshot ?? currentAuthorSnapshot()
    setFormulaSource(source.formulaSource)
    setComparisonFormulaSource(source.comparisonFormulaSource)
    setTargetTruth(source.targetTruth)
    setEvaluationScope(source.evaluationScope)
    setSelectedCorrespondence(source.selectedCorrespondence)
    restoreSnapshot(source)
    setNextWorldKey(Math.max(-1, ...source.worlds.map(({ key }) => key)) + 1)
    setNextEdgeKey(Math.max(-1, ...source.edges.map(({ key }) => key)) + 1)
    setAuthorWorkspaceSession({ purpose, returnStep: purpose === 'starting-model' ? 2 : 7, previousWorkspace, previousGameMode })
    setGameMode('author')
    setAppView('workspace')
  }

  const leaveAuthorWorkspace = (save: boolean) => {
    const session = authorWorkspaceSession
    if (!session) return
    if (save && session.purpose === 'starting-model') {
      setImportedAuthorFile(null)
      setLevelStartSnapshot(currentAuthorSnapshot())
      setLevelReferenceSolution(null)
      setDataMessage('Starting model saved. The previous workspace remains unchanged.')
    }
    if (save && session.purpose === 'reference-solution') {
      try {
        const solution: ReferenceSolution = { worlds: worlds.map(({ id, atoms, position }) => ({ id: id.trim(), atoms, position })), edges: edges.map(({ from, to }) => ({ from, to })), evaluationWorld, frameRules }
        assertValidReferenceSolution(customLevelFromSandbox(), solution)
        setLevelReferenceSolution(solution)
        setDataMessage('Reference solution verified and saved.')
      } catch (error) {
        setResult({ kind: 'error', message: error instanceof Error ? error.message : 'The reference solution is not valid.' })
        return
      }
    }
    restoreWorkspaceDraft(session.previousWorkspace)
    setGameMode(session.previousGameMode)
    setAuthorStep(session.returnStep)
    setAuthorWorkspaceSession(null)
    setAuthorStudioOpen(true)
    setAppView('create')
  }

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
      // Imported packages may contain prediction variants that the form does
      // not edit yet. Keep the complete package intact for direct playtests.
      const contents = importedAuthorFile
        ? serializeCustomLevel(importedAuthorFile.level, importedAuthorFile.referenceSolution)
        : serializedCustomLevel()
      const level = parseCustomLevelFile(JSON.parse(contents))
      sandboxBeforeCampaign.current = { formulaSource, comparisonFormulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope }
      authorPlaytestReturnMode.current = gameMode
      setAuthorPlaytest(true)
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

  const serializedProgressBackup = () => serializeProgressBackup({
    contentRevision: currentCampaignContentRevision,
    guest: guestProfile,
    completedLevelIds: [...completedLevelIds],
    learnProgress,
    referenceSolutionViewed: [...referenceSolutionViewed],
    sandbox: JSON.parse(serializedModel()),
  })

  const openDataManager = () => {
    setImportSource(serializedModel())
    setBackupImportSource(serializedProgressBackup())
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

  const normalizedGuestProfile = (value: unknown): GuestProfile => {
    const guest = value as Partial<GuestProfile> | undefined
    if (!guest || typeof guest.id !== 'string' || typeof guest.createdAt !== 'string' || !Array.isArray(guest.history)) throw new Error('Invalid guest profile backup.')
    const history = guest.history.filter((entry): entry is HistoryEntry => Boolean(entry && typeof entry.id === 'string' && typeof entry.timestamp === 'string' && typeof entry.title === 'string' && typeof entry.success === 'boolean')).slice(0, 250)
    const rawSolutions = guest.solutionSignatures && typeof guest.solutionSignatures === 'object' ? guest.solutionSignatures : {}
    const solutionSignatures = Object.fromEntries(Object.entries(rawSolutions).filter(([, signatures]) => Array.isArray(signatures)).map(([levelId, signatures]) => [levelId, [...new Set((signatures as unknown[]).filter((signature): signature is string => typeof signature === 'string'))].slice(0, 25)]))
    return { id: guest.id, createdAt: guest.createdAt, history, solutionSignatures }
  }

  const knownProgressIds = new Set([...tutorialLevels, ...campaignTracks.flatMap((track) => track.levels), ...guidedCampaigns.flatMap((campaign) => campaign.levels)].map((level) => level.id))
  const filteredProgressIds = (ids: readonly string[], contentRevision = 1) => ids.filter((id) => knownProgressIds.has(id) && (contentRevision >= currentCampaignContentRevision || !revisedCampaignLevelIds.has(id)))

  const applyParsedSandbox = (imported: ReturnType<typeof parseSandboxModel>) => {
    parseFormula(imported.formula)
    if (imported.comparisonFormula) parseFormula(imported.comparisonFormula)
    const importedWorlds = imported.worlds.map((world, key) => ({ ...world, key }))
    const importedEdges = imported.edges.map((edge, key) => ({ ...edge, key }))
    setGameMode('sandbox')
    setFormulaSource(imported.formula)
    setComparisonFormulaSource(imported.comparisonFormula)
    setWorlds(importedWorlds)
    setEdges(importedEdges)
    setEvaluationWorld(imported.evaluationWorld)
    setEvaluationScope(imported.scope)
    setTargetTruth(imported.targetTruth)
    setFrameRules(imported.frameRules as FrameRules)
    setSelectedCorrespondence(correspondencePresets.some(({ id }) => id === imported.correspondencePreset) ? imported.correspondencePreset : '')
    setNextWorldKey(importedWorlds.length)
    setNextEdgeKey(importedEdges.length)
    setResult(null)
  }

  const importProgress = () => {
    try {
      const imported = parseProgressBackup(backupImportSource)
      const guest = normalizedGuestProfile(imported.guest)
      const progress = filteredProgressIds(imported.completedLevelIds, imported.contentRevision)
      const sandbox = imported.format === 'logic-model-builder-progress-backup' && imported.sandbox ? parseSandboxModel(imported.sandbox) : null
      if (!window.confirm('Replace the local progress and history with this validated backup?')) return
      setGuestProfile(guest)
      setCompletedLevelIds(new Set(progress))
      if (imported.format === 'logic-model-builder-progress-backup') {
        setLearnProgress(imported.learnProgress)
        setReferenceSolutionViewed(new Set(imported.referenceSolutionViewed.filter((id) => knownProgressIds.has(id))))
        if (sandbox) applyParsedSandbox(sandbox)
      }
      setDataMessage(imported.format === 'logic-model-builder-profile' ? 'Legacy profile and Campaign progress imported. Existing Learn and sandbox data were preserved.' : 'Progress backup imported successfully.')
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : 'Could not import the progress backup.')
    }
  }

  const importModel = () => {
    try {
      const imported = parseSandboxModel(importSource)
      parseFormula(imported.formula)
      if (imported.comparisonFormula) parseFormula(imported.comparisonFormula)
      if (!window.confirm('Replace the saved Model Sandbox with this validated model?')) return
      applyParsedSandbox(imported)
      setAppView('workspace')
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
    const atomText = (values?: Readonly<Record<string, readonly string[]>>) => values ? Object.entries(values).map(([world, atoms]) => `${world}: ${atoms.join(' ')}`).join('\n') : ''
    setLevelRequiredAtoms(atomText(source.constraints?.requiredAtoms))
    setLevelForbiddenAtoms(atomText(source.constraints?.forbiddenAtoms))
    setLevelStartSnapshot({ worlds: duplicatedWorlds, edges: duplicatedEdges, evaluationWorld: source.evaluationWorld, frameRules: duplicatedRules, formulaSource: source.formula ?? '', comparisonFormulaSource: source.comparisonFormula ?? '', targetTruth: source.targetTruth ?? true, evaluationScope: source.scope ?? 'pointed', selectedCorrespondence: source.correspondencePreset ?? '' })
    setLevelReferenceSolution(null)
    setMissionAuditFindings([])
    setImportedAuthorFile(null)
    setDataMessage(`Duplicated “${source.title}”. Build and verify a new reference solution before export.`)
    setAuthorStep(1)
    setVisitedAuthorSteps(new Set([1]))
    setAuthorStudioOpen(true)
    setAppView('create')
  }

  const importCustomContent = () => {
    try {
      const parsed = JSON.parse(customImportSource) as Record<string, unknown>
      if (parsed.format === 'logic-model-builder-campaign') {
        const campaign = parseCustomCampaign(parsed)
        setCustomCampaignTitle(campaign.title)
        setCustomCampaignDescription(campaign.description)
        setAuthoredCampaignMissions(campaign.missions)
        setAuthorStep(9)
        setVisitedAuthorSteps(new Set([1, 9]))
        setAuthorStudioOpen(true)
        setDataMessage(`Imported campaign package “${campaign.title}”.`)
        return
      }
      const imported = parseCustomLevelPackage(parsed)
      const source = imported.level
      const draftWorlds = source.worlds.map((world, key) => ({ ...world, key }))
      const draftEdges = source.edges.map((edge, key) => ({ ...edge, key }))
      const draftRules = { ...defaultFrameRules, ...source.frameRules }
      setLevelTitle(source.title)
      setLevelInstruction(source.instruction)
      setLevelLearningObjective(source.learningObjective ?? '')
      setLevelConcept(source.conceptTags?.join(', ') || source.concept)
      setLevelPrerequisites(source.prerequisites?.join(', ') ?? '')
      setLevelDifficulty(source.estimatedDifficulty ?? 'intermediate')
      setLevelEditable(new Set(source.editable))
      setLevelBounds({ minimumWorlds: source.constraints?.minimumWorlds?.toString() ?? '', maximumWorlds: source.constraints?.maximumWorlds?.toString() ?? '', minimumEdges: source.constraints?.minimumEdges?.toString() ?? '', maximumEdges: source.constraints?.maximumEdges?.toString() ?? '', maximumChanges: source.constraints?.maximumChanges?.toString() ?? '' })
      setLevelRequiredProperties(new Set(source.constraints?.requiredProperties ?? []))
      setLevelForbiddenProperties(new Set(source.constraints?.forbiddenProperties ?? []))
      setLevelRequiredEdges(source.constraints?.requiredEdges?.map(({ from, to }) => `${from} -> ${to}`).join(', ') ?? '')
      setLevelForbiddenEdges(source.constraints?.forbiddenEdges?.map(({ from, to }) => `${from} -> ${to}`).join(', ') ?? '')
      const importedAtomText = (values?: Readonly<Record<string, readonly string[]>>) => values ? Object.entries(values).map(([world, atoms]) => `${world}: ${atoms.join(' ')}`).join('\n') : ''
      setLevelRequiredAtoms(importedAtomText(source.constraints?.requiredAtoms))
      setLevelForbiddenAtoms(importedAtomText(source.constraints?.forbiddenAtoms))
      setLevelBonusMaximumEdges(source.bonusConstraints?.maximumEdges?.toString() ?? '')
      setLevelPredictionKind(source.prediction?.kind === 'truth' || source.prediction?.kind === 'counterexample-world' || source.prediction?.kind === 'frame-property' ? source.prediction.kind : 'none')
      if (source.prediction?.kind === 'frame-property' && source.prediction.expectedProperty) setLevelPredictionProperty(source.prediction.expectedProperty)
      setLevelStartSnapshot({ worlds: draftWorlds, edges: draftEdges, evaluationWorld: source.evaluationWorld, frameRules: draftRules, formulaSource: source.formula ?? '', comparisonFormulaSource: source.comparisonFormula ?? '', targetTruth: source.targetTruth ?? true, evaluationScope: source.scope ?? 'pointed', selectedCorrespondence: source.correspondencePreset ?? '' })
      setLevelReferenceSolution(imported.referenceSolution ?? null)
      setImportedAuthorFile(imported)
      setAuthorStep(7)
      setVisitedAuthorSteps(new Set([1, 2, 3, 4, 5, 6, 7]))
      setAuthorStudioOpen(true)
      setDataMessage(`Imported “${source.title}” into the creation studio.`)
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : 'Could not import custom content.')
    }
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

  const shareSandbox = async () => {
    try {
      if (formulaValidation.kind !== 'valid') throw new Error('Enter a valid primary formula before sharing the Sandbox.')
      if (comparisonFormulaValidation.kind === 'invalid') throw new Error('Fix the comparison formula before sharing the Sandbox.')
      const payload = createSandboxSharePayload({
        worlds: worlds.map(({ id, atoms }) => ({ id: id.trim(), atoms: atoms.split(/[\s,]+/u).filter(Boolean) })),
        edges: edges.map(({ from, to }) => ({ from, to })),
        evaluationWorld,
        formula: formulaSource,
        comparisonFormula: comparisonFormulaSource,
        scope: evaluationScope,
        targetTruth,
        frameRules,
      })
      parseSandboxSharePayload(payload)
      const link = createShareUrl(JSON.stringify(payload))
      setShareLink(link)
      try {
        await navigator.clipboard.writeText(link)
        setSandboxShareMessage('Sandbox link copied to the clipboard.')
      } catch {
        setSandboxShareMessage('Clipboard access was unavailable. Copy the visible link manually.')
      }
    } catch (error) {
      setSandboxShareMessage(error instanceof Error ? error.message : 'Could not share the Sandbox.')
    }
  }

  const downloadCustomLevel = () => {
    try {
      if (!runMissionAudit()) return
      const contents = importedAuthorFile ? serializeCustomLevel(importedAuthorFile.level, importedAuthorFile.referenceSolution) : serializedCustomLevel()
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
      if (authorPlaytest) {
        setGameMode(authorPlaytestReturnMode.current)
        setAuthorPlaytest(false)
        setAuthorStudioOpen(true)
        setAppView('create')
      } else setAppView('workspace')
    }
    else {
      setCampaignTrackIndex(playingTrackIndex ?? campaignTrackIndex)
      setCampaignSection('practice')
      setAppView('campaigns')
    }
  }

  const goBack = () => {
    if (appView === 'workspace') {
      if (authorWorkspaceSession) { leaveAuthorWorkspace(false); return }
      if (isGuidedMode) returnToGuidedBrowser()
      else setAppView('lab')
      return
    }
    if (appView === 'create' && authorStudioOpen) { setAuthorStudioOpen(false); return }
    const previousView = appViewHistory.current.pop() ?? 'home'
    suppressViewHistory.current = true
    setAppView(previousView)
  }

  const nextIncompleteLearnLesson = learnLessons.find((lesson) => !learnProgress.completedLessonIds.includes(lesson.id))
  const nextLearningTitle = !learnProgress.welcomeViewed
    ? 'Welcome to Modal Logic'
    : nextTutorialIndex >= 0
      ? tutorialLevels[nextTutorialIndex].title
      : nextIncompleteLearnLesson?.title
  const currentLearningDestination: LearningDestination | null = activeLevel && isHowToPlay
    ? { kind: 'control', id: activeLevel.id, index: campaignLevelIndex }
    : courseLesson
      ? { kind: 'lesson', id: courseLesson.id, index: learnLessons.findIndex(({ id }) => id === courseLesson.id) }
      : null
  const learningNavigation = currentLearningDestination
    ? resolveLearningNavigation(currentLearningDestination, tutorialLevels, learnLessons)
    : { previous: null, next: null }
  const openLearningDestination = (destination: LearningDestination) => {
    if (destination.kind === 'control') startGuidedLevel('tutorial', destination.index)
    else startLearnLesson(destination.index)
  }
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
    ? appView === 'create' && authorStudioOpen ? 'Back to Create' : 'Back'
    : authorWorkspaceSession
      ? 'Cancel and return to authoring'
    : gameMode === 'learn' || gameMode === 'tutorial'
      ? 'Back to Learn'
      : gameMode === 'guidedCampaign'
        ? 'Back to Campaigns'
        : gameMode === 'campaign'
          ? 'Back to Practice'
          : gameMode === 'custom'
            ? 'Return to Model Sandbox'
            : 'Back to Lab'

  return (
    <div className={`page-shell density-${interfaceDensity} ${reduceMotion ? 'force-reduced-motion' : ''} ${gameMode === 'custom' && authorPreview === 'mobile' ? 'author-preview-mobile' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <div className="brand">{appView !== 'home' && <button className="back-button" type="button" onClick={goBack} aria-label={backLabel === 'Back' ? 'Go back' : backLabel}>← <span>{backLabel}</span></button>}<span className="brand-mark">◇</span><strong>Logic Model Builder</strong><nav className="product-nav" aria-label="Global navigation"><button className={appView === 'home' ? 'active' : ''} type="button" onClick={() => setAppView('home')}>Home</button><button className={appView === 'learn' || appView === 'welcome' || (appView === 'workspace' && (gameMode === 'learn' || gameMode === 'tutorial')) ? 'active' : ''} type="button" onClick={() => setAppView('learn')}>Learn</button><button className={appView === 'campaigns' || (appView === 'workspace' && (gameMode === 'guidedCampaign' || gameMode === 'campaign')) ? 'active' : ''} type="button" onClick={() => setAppView('campaigns')}>Campaigns</button><button className={appView === 'lab' || (appView === 'workspace' && gameMode === 'sandbox') ? 'active' : ''} type="button" onClick={() => setAppView('lab')}>Lab</button></nav></div>
        <div className="topbar-actions">
          {appView !== 'home' && appView !== 'workspace' && isGuidedMode && activeLevel && <button type="button" className="topbar-resume" onClick={() => setAppView('workspace')}>Resume {gameMode === 'learn' || gameMode === 'tutorial' ? 'lesson' : 'mission'}</button>}
          {appView === 'workspace' && <button type="button" className="text-button" onClick={resetSandbox}>{isGuidedMode ? `Restart ${missionNavigationUnit}` : 'Reset model'}</button>}
          {appView === 'workspace' && <button type="button" className="help-button" aria-label="Open workspace quick help" onClick={() => setShowHelp(true)}>Quick help</button>}
          {document.fullscreenEnabled && <button type="button" className="icon-button fullscreen-button" aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} aria-pressed={isFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={() => void toggleFullscreen()}>⛶</button>}
          <div className="utility-menu" ref={utilityMenuRef}><button ref={utilityMenuButtonRef} type="button" className="text-button" aria-haspopup="menu" aria-controls="utility-menu" aria-expanded={utilityMenuOpen} onClick={() => setUtilityMenuOpen((open) => !open)}>More</button>{utilityMenuOpen && <div id="utility-menu" role="menu" className="utility-menu-popover" onKeyDown={(event) => { const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')]; const index = items.indexOf(document.activeElement as HTMLElement); if (event.key === 'Escape') { event.preventDefault(); setUtilityMenuOpen(false); requestAnimationFrame(() => utilityMenuButtonRef.current?.focus()); return } if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length; items[next]?.focus() }}>{appView === 'workspace' && <button type="button" role="menuitem" onClick={openWorkspaceTour}>Workspace tour</button>}<button type="button" role="menuitem" onClick={() => { setAppView('create'); setUtilityMenuOpen(false) }}>Create</button><button type="button" role="menuitem" onClick={() => { setAppView('reference'); setUtilityMenuOpen(false) }}>Modal Logic Reference</button><button type="button" role="menuitem" onClick={() => { setAppView('help'); setUtilityMenuOpen(false) }}>Help &amp; Controls</button><button type="button" role="menuitem" onClick={() => { setAppView('profile'); setUtilityMenuOpen(false) }}>Profile</button><button type="button" role="menuitem" onClick={() => { openDataManager(); setUtilityMenuOpen(false) }}>Data</button><button type="button" role="menuitem" onClick={() => { setAppView('settings'); setUtilityMenuOpen(false) }}>Settings</button><a role="menuitem" href="https://github.com/Chrasts/Modal_Logic_Educational_Game" target="_blank" rel="noreferrer">GitHub</a></div>}</div>
        </div>
      </header>

      <main id="main-content" className="main-content" tabIndex={-1}>

      {appView === 'home' && (
        <HomeView completed={playableLearningCompleted} total={availableLearningTotal} nextTitle={nextLearningTitle} currentSession={isGuidedMode && activeLevel ? { kind: gameMode === 'learn' || gameMode === 'tutorial' ? 'lesson' : 'mission', title: activeLevel.title, context: activeLevel.chapter } : undefined} onResume={() => setAppView('workspace')} onLearn={continueLearningPath} onCampaigns={() => setAppView('campaigns')} onLab={() => setAppView('lab')} />
      )}

      {appView === 'lab' && <LabView onOpenModelSandbox={returnToSandbox} />}

      {appView === 'learn' && (
        <LearnOverview completed={playableLearningCompleted} total={availableLearningTotal} progress={learnProgress} tutorialLevels={tutorialLevels} tutorialCompleted={tutorialCompleted} nextTutorialIndex={nextTutorialIndex} expandedChapterId={expandedLearnChapterId} completedLevelIds={completedLevelIds} course={learnCourse} lessons={learnLessons} onContinue={continueLearningPath} onWelcome={() => setAppView('welcome')} onOpenControl={(index) => startGuidedLevel('tutorial', index)} onRestartControls={restartControlsSection} onOpenLesson={startLearnLesson} onRestartChapter={restartLearnChapter} onToggleChapter={(chapterId) => setExpandedLearnChapterId((current) => current === chapterId ? null : chapterId)} />
      )}
      {appView === 'welcome' && <ModalLogicWelcome onBegin={() => { markWelcomeViewed(); startGuidedLevel('tutorial', nextTutorialIndex < 0 ? 0 : nextTutorialIndex) }} onSkip={() => { markWelcomeViewed(); startGuidedLevel('tutorial', nextTutorialIndex < 0 ? 0 : nextTutorialIndex) }} onBack={() => setAppView('learn')} />}
      {appView === 'settings' && (
        <SettingsView density={interfaceDensity} showMinimap={showMinimap} showDerivedRelations={showDerivedEdges} reduceMotion={reduceMotion} soundEffects={soundEffects} onDensityChange={setInterfaceDensity} onShowMinimapChange={setShowMinimap} onShowDerivedRelationsChange={setShowDerivedEdges} onReduceMotionChange={setReduceMotion} onSoundEffectsChange={setSoundEffects} onManageData={openDataManager} onReset={resetInterfacePreferences} />
      )}

      {appView === 'campaigns' && (
        <CampaignsView section={campaignSection} guidedCampaigns={guidedCampaigns} practiceTracks={campaignTracks} selectedTrackIndex={campaignTrackIndex} completedLevelIds={completedLevelIds} overallPracticeCompleted={overallCampaignCompleted} overallPracticeLevels={overallCampaignLevels} activePracticeTrackIndex={playingTrackIndex ?? campaignTrackIndex} activePracticeLevelIndex={campaignLevelIndex} practiceSessionActive={gameMode === 'campaign'} onSectionChange={setCampaignSection} onOpenLearn={() => setAppView('learn')} onStartCampaign={startGuidedCampaign} onSelectPracticeTrack={setCampaignTrackIndex} onStartPractice={(levelIndex, trackIndex) => startGuidedLevel('campaign', levelIndex, trackIndex)} onResumePractice={() => setAppView('workspace')} />
      )}

      {appView === 'create' && !authorStudioOpen && (
        <CreateView templates={[...tutorialLevels, ...campaignTracks.flatMap((track) => track.levels), ...guidedCampaigns.flatMap((campaign) => campaign.levels)]} selectedTemplateId={authorTemplateId} onSelectedTemplateChange={setAuthorTemplateId} onOpenStudio={() => { setDataMessage(''); setImportedAuthorFile(null); setLevelTitle('My custom mission'); setLevelInstruction('Satisfy the configured objective.'); setLevelLearningObjective('Explore this modal construction.'); setLevelConcept('User-authored modal logic objective'); setLevelPrerequisites('propositional connectives'); setLevelDifficulty('introductory'); setLevelEditable(new Set(['worlds', 'valuations', 'edges', 'constraints', 'evaluation'])); setLevelBounds({ minimumWorlds: '', maximumWorlds: '', minimumEdges: '', maximumEdges: '', maximumChanges: '' }); setLevelRequiredProperties(new Set()); setLevelForbiddenProperties(new Set()); setLevelRequiredEdges(''); setLevelForbiddenEdges(''); setLevelRequiredAtoms(''); setLevelForbiddenAtoms(''); setLevelBonusMaximumEdges(''); setLevelPredictionKind('none'); setLevelStartSnapshot(null); setLevelReferenceSolution(null); setMissionAuditFindings([]); setAuthorStep(1); setVisitedAuthorSteps(new Set([1])); setAuthorStudioOpen(true) }} onOpenCampaign={() => { setDataMessage(''); setAuthorStep(9); setVisitedAuthorSteps(new Set([1, 9])); setAuthorStudioOpen(true) }} onDuplicateTemplate={duplicateBuiltInMission} importSource={customImportSource} onImportSourceChange={(value) => { setCustomImportSource(value); setDataMessage('') }} onImportContent={importCustomContent} />
      )}

      {appView === 'create' && authorStudioOpen && <MissionAuthoringView title={levelTitle || 'Custom mission'} status={dataMessage} onBack={() => setAuthorStudioOpen(false)}>
        <MissionAuthorStepper currentStep={authorStep} visitedSteps={visitedAuthorSteps} errors={authorStepErrors} onSelectStep={goToAuthorStep} onBack={() => { setAuthorStep((step) => Math.max(1, step - 1)); setAuthorStepErrors([]) }} onNext={advanceAuthorStep}>
          {authorStep === 1 && <div className="author-step-fields">
            <label><span>Mission title</span><input aria-label="Custom mission title" value={levelTitle} onChange={(event) => setLevelTitle(event.target.value)} /></label>
            <label><span>Instruction</span><input aria-label="Custom mission instruction" value={levelInstruction} onChange={(event) => setLevelInstruction(event.target.value)} /></label>
            <label><span>Learning objective</span><input aria-label="Custom mission learning objective" value={levelLearningObjective} onChange={(event) => setLevelLearningObjective(event.target.value)} /></label>
            <label><span>Concept tags</span><input aria-label="Custom mission concept tags" value={levelConcept} onChange={(event) => setLevelConcept(event.target.value)} placeholder="necessity, countermodel" /></label>
            <div className="author-pairs"><label><span>Prerequisites</span><input aria-label="Custom mission prerequisites" value={levelPrerequisites} onChange={(event) => setLevelPrerequisites(event.target.value)} placeholder="possibility, propositional connectives" /></label><label><span>Estimated difficulty</span><select aria-label="Custom mission difficulty" value={levelDifficulty} onChange={(event) => setLevelDifficulty(event.target.value as typeof levelDifficulty)}><option value="introductory">Introductory</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label></div>
          </div>}
          {authorStep === 2 && <div className="author-snapshots"><p>Edit the learner's starting state in the same workspace used by the game.</p><button type="button" className="primary-action" onClick={() => openAuthorWorkspace('starting-model')}>Edit starting model</button><span className={levelStartSnapshot ? 'pass' : ''}>{levelStartSnapshot ? `Start saved: ${levelStartSnapshot.worlds.length} world(s), ${levelStartSnapshot.edges.length} relation(s)` : 'No saved starting model'}</span></div>}
          {authorStep === 3 && <div className="author-step-fields">
            <label><span>Formula</span><input aria-label="Authored mission formula" value={levelStartSnapshot?.formulaSource ?? ''} onChange={(event) => { const value = event.target.value; setImportedAuthorFile(null); setLevelStartSnapshot((start) => start ? { ...start, formulaSource: value } : start) }} /></label>
            <label><span>Comparison formula (optional)</span><input aria-label="Authored comparison formula" value={levelStartSnapshot?.comparisonFormulaSource ?? ''} onChange={(event) => { const value = event.target.value; setImportedAuthorFile(null); setLevelStartSnapshot((start) => start ? { ...start, comparisonFormulaSource: value } : start) }} /></label>
            <div className="author-pairs"><label><span>Scope</span><select aria-label="Authored mission scope" value={levelStartSnapshot?.evaluationScope ?? 'pointed'} onChange={(event) => { const value = event.target.value as EvaluationScope; setImportedAuthorFile(null); setLevelStartSnapshot((start) => start ? { ...start, evaluationScope: value } : start) }}><option value="pointed">At one world</option><option value="model">Throughout this model</option><option value="frame">On this finite frame</option></select></label><label><span>Target</span><select aria-label="Authored mission target truth" value={(levelStartSnapshot?.targetTruth ?? true) ? 'true' : 'false'} onChange={(event) => { const value = event.target.value === 'true'; setImportedAuthorFile(null); setLevelStartSnapshot((start) => start ? { ...start, targetTruth: value } : start) }}><option value="true">True</option><option value="false">False</option></select></label></div>
            <label><span>Evaluation world</span><select aria-label="Authored mission evaluation world" value={levelStartSnapshot?.evaluationWorld ?? ''} onChange={(event) => { const value = event.target.value; setImportedAuthorFile(null); setLevelStartSnapshot((start) => start ? { ...start, evaluationWorld: value } : start) }}>{(levelStartSnapshot?.worlds ?? []).map((world) => <option key={world.id} value={world.id}>{world.id}</option>)}</select></label>
          </div>}
          {authorStep === 4 && <fieldset><legend>Player may edit</legend>{(['worlds', 'valuations', 'edges', 'constraints', 'evaluation'] as const).map((permission) => <label key={permission}><input type="checkbox" checked={levelEditable.has(permission)} onChange={() => setLevelEditable((current) => { const next = new Set(current); if (next.has(permission)) next.delete(permission); else next.add(permission); return next })} /> {permission}</label>)}</fieldset>}
          {authorStep === 5 && <div className="author-step-fields">
            <div className="author-bounds">{([['minimumWorlds', 'Min worlds'], ['maximumWorlds', 'Max worlds'], ['minimumEdges', 'Min edges'], ['maximumEdges', 'Max edges'], ['maximumChanges', 'Max changes']] as const).map(([key, label]) => <label key={key}><span>{label}</span><input type="number" min="0" step="1" aria-label={label} value={levelBounds[key]} onChange={(event) => setLevelBounds((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
            <div className="author-pairs"><label><span>Required edges</span><input aria-label="Required custom mission edges" placeholder="w0 -> w1, w1 -> w2" value={levelRequiredEdges} onChange={(event) => setLevelRequiredEdges(event.target.value)} /></label><label><span>Forbidden edges</span><input aria-label="Forbidden custom mission edges" placeholder="w1 -> w0" value={levelForbiddenEdges} onChange={(event) => setLevelForbiddenEdges(event.target.value)} /></label><label><span>Required atoms, one world per line</span><textarea aria-label="Required custom mission atoms" placeholder={'w0: p q\nw1: r'} value={levelRequiredAtoms} onChange={(event) => setLevelRequiredAtoms(event.target.value)} /></label><label><span>Forbidden atoms, one world per line</span><textarea aria-label="Forbidden custom mission atoms" placeholder={'w0: r\nw1: p'} value={levelForbiddenAtoms} onChange={(event) => setLevelForbiddenAtoms(event.target.value)} /></label></div>
            <fieldset><legend>Required frame properties</legend>{([...levelPropertyNames] as FramePropertyName[]).map((property) => <label key={property}><input type="checkbox" checked={levelRequiredProperties.has(property)} onChange={() => setLevelRequiredProperties((current) => { const next = new Set(current); if (next.has(property)) next.delete(property); else next.add(property); return next })} /> {property}</label>)}</fieldset>
            <fieldset><legend>Forbidden frame properties</legend>{([...levelPropertyNames] as FramePropertyName[]).map((property) => <label key={property}><input type="checkbox" checked={levelForbiddenProperties.has(property)} onChange={() => setLevelForbiddenProperties((current) => { const next = new Set(current); if (next.has(property)) next.delete(property); else next.add(property); return next })} /> {property}</label>)}</fieldset>
            <label><span>Optional bonus: maximum edges</span><input type="number" min="0" step="1" aria-label="Bonus maximum edges" value={levelBonusMaximumEdges} onChange={(event) => setLevelBonusMaximumEdges(event.target.value)} /></label>
          </div>}
          {authorStep === 6 && <div className="author-step-fields"><label><span>Prediction interaction</span><select aria-label="Custom mission prediction" value={levelPredictionKind} onChange={(event) => setLevelPredictionKind(event.target.value as typeof levelPredictionKind)}><option value="none">None</option><option value="truth">Predict truth value</option>{levelStartSnapshot?.evaluationScope === 'model' && <option value="counterexample-world">Predict counterexample world</option>}<option value="frame-property">Identify relational property</option></select></label>{levelPredictionKind === 'frame-property' && <label><span>Required property answer</span><select aria-label="Required property answer" value={levelPredictionProperty} onChange={(event) => setLevelPredictionProperty(event.target.value as FramePropertyName)}>{levelPropertyNames.map((property) => <option key={property}>{property}</option>)}</select></label>}<p>Predictions are optional and do not penalize the learner.</p></div>}
          {authorStep === 7 && <div className="author-snapshots"><p>Build a passing state from the saved start and verify it before storing the reference.</p><button type="button" className="primary-action" onClick={() => openAuthorWorkspace('reference-solution')} disabled={!levelStartSnapshot}>Build reference solution</button><span className={levelReferenceSolution ? 'pass' : ''}>{levelReferenceSolution ? 'Solution verified' : 'No verified reference solution'}</span><button type="button" className="secondary-button" onClick={playtestCustomMission} disabled={!levelStartSnapshot}>Playtest as player</button></div>}
          {authorStep === 8 && <section className="mission-audit" aria-label="Mission audit"><div><button type="button" className="primary-action" onClick={runMissionAudit}>Run mission audit</button></div><div className="settings-choice" aria-label="Preview viewport"><button type="button" className={authorPreview === 'desktop' ? 'active' : ''} aria-pressed={authorPreview === 'desktop'} onClick={() => setAuthorPreview('desktop')}>Desktop preview</button><button type="button" className={authorPreview === 'mobile' ? 'active' : ''} aria-pressed={authorPreview === 'mobile'} onClick={() => setAuthorPreview('mobile')}>Mobile preview</button></div><AuthorValidationSummary findings={missionAuditFindings} onGoToStep={(step) => { setVisitedAuthorSteps((current) => new Set([...current, step])); setAuthorStep(step); setAuthorStepErrors([]) }} /></section>}
          {authorStep === 9 && <div className="author-export-step"><p className={authorCanExport ? 'pass' : 'fail'}>{authorCanExport ? 'Audit passed: this draft can be exported or shared.' : 'Run validation and resolve every blocking error before export or sharing.'}</p><div className="author-final-actions"><button type="button" className="secondary-button" onClick={downloadCustomLevel} disabled={!authorCanExport}>Download custom mission</button><button type="button" className="secondary-button" onClick={generateMissionShareLink} disabled={!authorCanExport}>Generate mission link</button></div>
            <div className="campaign-packager"><h4>Campaign package</h4><label><span>Campaign title</span><input aria-label="Custom campaign title" value={customCampaignTitle} onChange={(event) => setCustomCampaignTitle(event.target.value)} /></label><label><span>Description</span><input aria-label="Custom campaign description" value={customCampaignDescription} onChange={(event) => setCustomCampaignDescription(event.target.value)} /></label><button type="button" className="secondary-button" onClick={addMissionToCustomCampaign} disabled={!authorCanExport}>Add current mission to package</button>{authoredCampaignMissions.length > 0 && <ol>{authoredCampaignMissions.map(({ level }, index) => <li key={level.id}><span>{index + 1}. {level.title}</span><button type="button" aria-label={`Remove ${level.title} from package`} onClick={() => setAuthoredCampaignMissions((current) => current.filter(({ level: candidate }) => candidate.id !== level.id))}>Remove</button></li>)}</ol>}<div><button type="button" className="primary-action" disabled={authoredCampaignMissions.length === 0} onClick={downloadCustomCampaign}>Download campaign package</button><button type="button" className="secondary-button" disabled={authoredCampaignMissions.length === 0} onClick={generateCampaignShareLink}>Generate campaign link</button></div></div>
            {shareLink && <div className="share-link-output"><label><span>Shareable URL</span><input aria-label="Shareable URL" readOnly value={shareLink} onFocus={(event) => event.currentTarget.select()} /></label><button type="button" className="secondary-button" onClick={copyShareLink}>Copy link</button><small>The mission data is encoded after # and is not sent to the hosting server.</small></div>}
          </div>}
        </MissionAuthorStepper>
      </MissionAuthoringView>}

      {appView === 'reference' && <ReferenceView onOpenLearn={() => setAppView('learn')} onOpenLab={() => setAppView('lab')} />}
      {appView === 'help' && <HelpView hasCurrentMission={isGuidedMode} onReturnToMission={() => setAppView('workspace')} onReplayWelcome={() => setAppView('welcome')} onReplayControls={() => startGuidedLevel('tutorial', 0)} onReplayTour={openWorkspaceTour} />}

      {appView === 'profile' && (
        <ProfileView guestId={guestProfile.id} createdAt={guestProfile.createdAt} history={guestProfile.history} successfulAttempts={successfulAttempts} completedHistoryLevels={completedHistoryLevels} savedCompletedLevels={completedLevelIds.size} distinctSolutions={distinctSolutions} conceptSummary={conceptSummary} failureSummary={failureSummary} failureLabel={(category) => failureCategoryLabels[category as AttemptFailureCategory]} onDownloadProfile={() => downloadJson(serializedProfile(), 'logic-model-builder-profile.json')} onImportBackup={openDataManager} onDownloadResults={downloadEducatorResults} onClearHistory={clearLocalHistory} />
      )}

      {appView === 'workspace' && authorWorkspaceSession && <section className="mission-header mission-header-custom author-workspace-header" aria-label="Authoring workspace"><div className="mission-header-context"><span>Creation studio</span><strong>{authorWorkspaceSession.purpose === 'starting-model' ? 'Editing custom mission starting model' : 'Building reference solution'}</strong></div><div className="mission-header-objective"><span>Authoring context</span><p>{authorWorkspaceSession.purpose === 'starting-model' ? 'Edit the state that learners will receive.' : 'Build a state that satisfies the configured objective and constraints.'}</p></div><div className="mission-header-actions"><button type="button" className="verify-button" onClick={() => leaveAuthorWorkspace(true)}>{authorWorkspaceSession.purpose === 'starting-model' ? 'Save starting model and return' : 'Verify solution and return'}</button><button type="button" onClick={() => leaveAuthorWorkspace(false)}>Cancel</button></div></section>}

      {appView === 'workspace' && activeLevel && (
        <MissionHeader
          mode={missionHeaderMode}
          sectionTitle={missionSectionTitle}
          itemTitle={activeLevel.title}
          progressLabel={missionProgressLabel}
          objective={activeLevel.instruction}
          state={completedGuidedTask ? 'completed' : isQuestionTask ? 'question' : 'active'}
          content={completedGuidedTask && courseLesson ? <div className="mission-complete-content" role="status"><strong>{learnTransferActive ? 'Transfer complete' : courseLesson.title}</strong><p>{courseLesson.successExplanation}</p>{!learningNavigation.next && <div className="course-next-links"><span>Course complete. Continue with:</span><button type="button" onClick={() => { setCampaignSection('challenges'); setAppView('campaigns') }}>Campaigns</button><button type="button" onClick={returnToSandbox}>Model Sandbox</button><button type="button" onClick={() => setAppView('reference')}>Reference</button></div>}</div>
            : completedGuidedTask ? <div className="mission-complete-content" role="status"><strong>{campaignLevelIndex === activeLevels.length - 1 ? (isHowToPlay ? 'Controls complete' : gameMode === 'guidedCampaign' ? 'Campaign complete' : gameMode === 'campaign' ? 'Practice collection complete' : 'Task complete') : 'Task complete'}</strong><p>{activeLevel.successDebrief ?? (result && 'detail' in result ? result.detail : 'The objective is satisfied.')}</p>{!focusedIntroWorkspace && <><small>Distinct solutions recorded for this mission: <b>{activeDistinctSolutionCount}</b>.</small><div className="mission-completion-metrics" aria-label="Construction metrics"><span>{worlds.length} worlds</span><span>{new Set(edges.map(({ from, to }) => `${from}\u0000${to}`)).size} explicit relations</span><span>{currentTrueAtomCount} true atoms</span>{currentSemanticChanges !== undefined && <span>{currentSemanticChanges} changes from start</span>}</div></>}{gameMode === 'guidedCampaign' && referenceSolutionViewed.has(activeLevel.id) && <small><b>Assisted completion:</b> You viewed a reference construction before completing this mission.</small>}{result && 'prediction' in result && result.prediction && <small><b>{result.prediction.correct ? 'Prediction correct.' : 'Prediction incorrect.'}</b> {result.prediction.detail}</small>}{result && 'bonus' in result && result.bonus && <small><b>{result.bonus.achieved ? 'Bonus achieved.' : 'Optional bonus.'}</b> {result.bonus.detail}</small>}</div>
            : isQuestionTask ? <div className="mission-question-content"><QuestionTaskPanel level={activeLevel} answer={predictionAnswer} feedback={questionFeedback} onAnswer={choosePredictionAnswer} /></div>
              : undefined}
          previouslyCompleted={completedLevelIds.has(activeLevel.id)}
          taskSteps={isHowToPlay ? activeLevel.taskSteps : undefined}
          actions={<>
            {authorPlaytest && <button type="button" onClick={returnToGuidedBrowser}>Return to authoring</button>}
            {focusedIntroWorkspace && currentLearningDestination ? completedGuidedTask ? <>
              {courseLesson && !learnTransferActive && courseLesson.transferTask && <button type="button" className="secondary-button" onClick={() => startLearnTransfer(courseLesson.id)}>Try optional transfer</button>}
              {learningNavigation.next && <button type="button" className="verify-button" onClick={() => openLearningDestination(learningNavigation.next!)}>Next lesson</button>}
              <button type="button" onClick={() => setAppView('learn')}>Back to Learn overview</button>
              <button type="button" onClick={() => currentLearningDestination.kind === 'control' ? loadLevel(currentLearningDestination.index, tutorialLevels) : startLearnLesson(currentLearningDestination.index)}>Replay lesson</button>
            </> : <>
              <button type="button" disabled={!learningNavigation.previous} onClick={() => learningNavigation.previous && openLearningDestination(learningNavigation.previous)}>Previous lesson</button>
              <button type="button" className="verify-button" onClick={verify} disabled={(isQuestionTask && !predictionAnswer) || (!isConstructionObjective && frameValuationLimitExceeded)}>{isQuestionTask ? 'Confirm answer' : 'Check task'}</button>
              <button type="button" disabled={!completedLevelIds.has(activeLevel.id) || !learningNavigation.next} onClick={() => learningNavigation.next && openLearningDestination(learningNavigation.next)}>Next lesson</button>
            </> : completedGuidedTask ? <>
              {campaignLevelIndex < activeLevels.length - 1
                ? <button type="button" className="verify-button" onClick={() => loadLevel(campaignLevelIndex + 1)}>Next mission</button>
                : authorPlaytest ? null : <button type="button" className="verify-button" onClick={returnToGuidedBrowser}>{gameMode === 'custom' ? 'Return to Model Sandbox' : gameMode === 'guidedCampaign' ? 'Back to Campaigns' : 'Back to Practice'}</button>}
              <button type="button" onClick={() => loadLevel(campaignLevelIndex)}>Replay mission</button>
              {campaignLevelIndex < activeLevels.length - 1 && <button type="button" onClick={returnToGuidedBrowser}>Back to overview</button>}
            </> : <>
              <button type="button" disabled={campaignLevelIndex === 0} onClick={() => loadLevel(campaignLevelIndex - 1)}>Previous {missionNavigationUnit}</button>
              <button type="button" className="verify-button" onClick={verify} disabled={(isQuestionTask && !predictionAnswer) || (!isConstructionObjective && frameValuationLimitExceeded)}>{isQuestionTask ? 'Confirm answer' : 'Check task'}</button>
              <button type="button" disabled={!completedLevelIds.has(activeLevel.id) || campaignLevelIndex === activeLevels.length - 1} onClick={() => loadLevel(campaignLevelIndex + 1)}>Next {missionNavigationUnit}</button>
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
            {activeLevel.referenceSolution && <section className="reference-solution"><strong>Reference solution</strong><p>One validated construction, revealed separately from ordinary hints.</p>{(guidedHintLevel >= 3 || guestProfile.history.filter((entry) => entry.levelId === activeLevel.id && !entry.success).length >= 3) ? <><button type="button" className="secondary-button" onClick={() => { if (window.confirm('Showing the reference solution will reveal one complete construction. You can still complete the mission, but it will be recorded as assisted.')) setReferenceSolutionViewed((current) => new Set([...current, activeLevel.id])) }}>Show reference solution</button>{referenceSolutionViewed.has(activeLevel.id) && <code>Worlds: {activeLevel.referenceSolution.worlds.map((world) => `${world.id}${world.atoms ? `:{${world.atoms}}` : ':∅'}`).join(' · ')}<br />Relations: {activeLevel.referenceSolution.edges.map((edge) => `${edge.from} → ${edge.to}`).join(' · ') || '∅'}</code>}</> : <p>Available after Hint 3 or three unsuccessful attempts.</p>}</section>}
          </div> : undefined}
        />
      )}

      {appView === 'workspace' && <section ref={workspaceRef} style={workspaceGridStyle} className={`workspace mobile-tab-${mobileWorkspaceTab} ${isGuidedMode ? 'guided-workspace' : ''} ${evaluationScope === 'frame' ? 'frame-scope' : ''} ${showWorldPanel && !showEdgePanel ? 'world-panel-only' : ''} ${showEdgePanel && !showWorldPanel ? 'edge-panel-only' : ''} ${!leftPanelOpen ? 'left-collapsed' : ''} ${!rightPanelOpen ? 'right-collapsed' : ''}`} aria-label="Kripke model editor">
        <MobileWorkspaceTabs activeTab={mobileWorkspaceTab} showFormula={showFormulaPanel} onChange={setMobileWorkspaceTab} />
        {leftPanelOpen && <WorkspaceResizeHandle side="left" value={workspaceLayout.left} onResize={(value) => resizeWorkspacePanel('left', value)} />}
        {rightPanelOpen && (showWorldPanel || showEdgePanel) && <WorkspaceResizeHandle side="right" value={workspaceLayout.right} onResize={(value) => resizeWorkspacePanel('right', value)} />}
        {showFormulaPanel && <div className="panel formula-panel" data-tour-target="formula-controls">
          <div className="panel-heading">
            <div><h2>Formula and goal</h2><p>Unicode and text notation</p></div>
            {gameMode === 'sandbox' && <button type="button" className="secondary-button share-sandbox-button" onClick={() => void shareSandbox()}>Share Sandbox</button>}
          </div>
          <label className="field">
            <span>Modal formula</span>
            <input ref={formulaInputRef} aria-label="Modal formula" aria-invalid={formulaValidation.kind === 'invalid'} disabled={isGuidedMode} value={formulaSource} onChange={(event) => { setFormulaSource(event.target.value); setResult(null) }} spellCheck={false} />
            {formulaValidation.kind === 'valid' && <small className="parse-status valid">✓ Formula valid</small>}
            {formulaValidation.kind === 'invalid' && <small className="parse-status invalid" role="alert">{formulaValidation.message}</small>}
          </label>
          {!isGuidedMode && !formulaSource.trim() && <div className="empty-card"><strong>No formula yet</strong><span>Enter an atom such as p, or start with □p / ◇p, then Verify.</span><button type="button" onClick={() => { setFormulaSource('p'); setTimeout(() => formulaInputRef.current?.focus(), 0) }}>Use p</button></div>}
          <label className="field comparison-formula">
            <span>Comparison formula <small>optional</small></span>
            <input aria-label="Comparison formula" aria-invalid={comparisonFormulaValidation.kind === 'invalid'} disabled={isGuidedMode} value={comparisonFormulaSource} placeholder="e.g. box p" onChange={(event) => { setComparisonFormulaSource(event.target.value); if (event.target.value.trim() && evaluationScope === 'correspondence') setEvaluationScope('frame'); setResult(null) }} spellCheck={false} />
            {comparisonFormulaValidation.kind === 'invalid' && <small className="parse-status invalid" role="alert">{comparisonFormulaValidation.message}</small>}
          </label>
          <div className="symbol-row" aria-label="Insert symbol">
            {['¬', '∧', '∨', '→', '□', '◇'].map((symbol) => (
              <button key={symbol} type="button" disabled={isGuidedMode} className="symbol-button" aria-label={`Insert ${symbol}`} onClick={() => insertFormulaSymbol(symbol)}>{symbol}</button>
            ))}
          </div>
          <label className="field scope-picker">
            <span>Semantic target</span>
            <select disabled={isGuidedMode} aria-label="Semantic target" value={evaluationScope} onChange={(event) => { setEvaluationScope(event.target.value as EvaluationScope); setResult(null) }}>
              <option value="pointed">Pointed model: selected world, current valuation</option>
              <option value="model">Model: all worlds, current valuation</option>
              <option value="frame">Frame: all worlds and all valuations</option>
              <option value="correspondence" disabled={Boolean(comparisonFormulaSource.trim())}>Correspondence: formula validity vs. relation</option>
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
          {selectedCorrespondence && <p className="correspondence-note">Compare frame validity with the selected relational property. Finite examples provide evidence. They do not replace the general correspondence proof.</p>}
          <p className="notation">Precedence: ¬ □ ◇ &gt; ∧ &gt; ∨ &gt; →. Aliases: ! or ~ or \neg, [] or \Box, &lt;&gt; or \Diamond, &amp; or \land, | or \lor, -&gt; or \to or \implies.</p>
          {gameMode === 'sandbox' && <EvaluationExplorer open={showEvaluationExplorer} formula={explorerFormula} selectedPath={selectedFormulaPath} highlight={explorerHighlight} onToggle={() => setShowEvaluationExplorer((open) => !open)} onSelect={setSelectedFormulaPath} />}
          {gameMode === 'sandbox' && sandboxShareMessage && <p className="sandbox-share-status" role="status">{sandboxShareMessage}</p>}
          {gameMode === 'sandbox' && shareLink && <div className="share-link-output sandbox-share-output"><label><span>Shareable Sandbox URL</span><input aria-label="Shareable Sandbox URL" readOnly value={shareLink} onFocus={(event) => event.currentTarget.select()} /></label><button type="button" className="secondary-button" onClick={() => void copyShareLink()}>Copy link</button><small>The mathematical experiment is encoded after # and is not sent to a server.</small></div>}
        </div>}

        <div className="panel graph-panel">
          <div className="panel-heading">
            <div><h2>Visual model</h2><p>Drag from the world where an arrow begins and release on its destination. Handle position does not set direction.</p></div>
            <div className="model-view-switch" role="group" aria-label="Model view"><button type="button" className={modelView === 'graph' ? 'active' : ''} aria-pressed={modelView === 'graph'} onClick={() => setModelView('graph')}>Graph</button><button type="button" className={modelView === 'table' ? 'active' : ''} aria-pressed={modelView === 'table'} onClick={() => setModelView('table')}>Table</button></div>
          </div>
          <div className="graph-canvas" ref={graphCanvasRef} data-tour-target="model-map">
            {modelView === 'graph' ? <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={worldNodeTypes}
              edgeTypes={modalEdgeTypes}
              connectionMode={ConnectionMode.Loose}
              onInit={setFlowInstance}
              onNodesChange={onNodesChange}
              nodesDraggable={canRepositionWorlds}
              nodesConnectable={canEditEdges}
              edgesFocusable
              nodesFocusable
              onNodeDragStart={() => { if (canRepositionWorlds) { saveHistoryPoint(true); setCollidingWorldKeys(new Set()) } }}
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
                <WorkspaceToolbar sandbox={gameMode === 'sandbox'} editorMode={editorMode} rightPanelOpen={rightPanelOpen} showWorldPanel={showWorldPanel} showEdgePanel={showEdgePanel} leftPanelOpen={leftPanelOpen} canAddWorld={(!focusedIntroWorkspace || Boolean(presentation?.worlds)) && tutorialAllows('worlds')} canEditWorlds={canEditWorlds} canEditRelations={canEditEdges} canUseHistory={canUseHistory} canRepositionWorlds={canRepositionWorlds} selectedRelation={selectedEdgeKey !== null} undoAvailable={historyPast.current.length > 0} redoAvailable={historyFuture.current.length > 0} worldCount={worlds.length} focusedIntro={focusedIntroWorkspace} showDerivedRelations={showDerivedEdges} derivedRelationCount={derivedPairKeys.size} frameRuleCount={frameRuleResults.length} flowInstance={flowInstance} onApplyPreset={applySandboxPreset} onAddWorld={() => addWorld()} onDeleteRelation={() => selectedEdgeKey !== null && deleteEdge(selectedEdgeKey)} onToggleEvaluationPanel={() => setLeftPanelOpen((open) => !open)} onToggleModelPanel={() => setRightPanelOpen((open) => !open)} onUndo={undo} onRedo={redo} onTidy={tidyModel} onToggleDerived={() => setShowDerivedEdges((show) => !show)} onOpenFrameRules={() => setShowFrameRules(true)} onVerify={verify} />
              </Panel>
              <Panel position="bottom-center" className="trace-legend" aria-label="Model state legend"><details><summary>Legend</summary><div><span><i className="selected" />SELECTED</span><span><i className="current" />EVALUATION WORLD</span>{explorerHighlight && <><span><i className="explorer-true" />✓ SUBFORMULA TRUE</span><span><i className="explorer-false" />✕ SUBFORMULA FALSE</span></>}{traceWitnessWorld && <span><i className="witness" />WITNESS</span>}{traceCounterexampleWorld && <span><i className="counterexample" />COUNTEREXAMPLE</span>}<span><i className="explicit-edge" />EXPLICIT RELATION</span>{derivedPairKeys.size > 0 && <span><i className="derived" />DERIVED RELATION</span>}{relationPresentations.some(({ kind }) => kind === 'bidirectional') && <span><i className="two-way" />TWO-WAY</span>}<span><i className="reflexive" />EXPLICIT ↻</span>{[...reflexiveRelations.values()].some(({ derived }) => derived) && <span><i className="reflexive derived-reflexive" />DERIVED ↻</span>}{activeTrace && <><span><i className="checked" />CHECKED</span><span><i className="irrelevant" />IRRELEVANT</span></>}</div></details></Panel>
              {!showDerivedEdges && derivedPairKeys.size > 0 && <Panel position="bottom-right" className="derived-hidden-note">{derivedPairKeys.size} derived relation{derivedPairKeys.size === 1 ? '' : 's'} hidden. <span>Display only. Verification still uses enforced relations.</span></Panel>}
              {traceForcedDerivedPairKeys.size > 0 && <Panel position="top-center" className="trace-derived-note">A hidden derived relation is temporarily shown because the current trace uses it.</Panel>}
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
                  {showValuations && tutorialAllows('valuations') && <label><span>True atoms</span><input ref={selectedValuationInputRef} disabled={!canEditValuations} value={selectedWorld.atoms} onFocus={saveHistoryPoint} onChange={(event) => updateWorldAtoms(selectedWorld.key, event.target.value)} /></label>}
                  <div className="inspector-actions">
                  {showEvaluationControl && tutorialAllows('evaluation') && <button type="button" onClick={() => selectEvaluationWorld(selectedWorld.id.trim())} disabled={!selectedWorld.id.trim() || !canEditEvaluation}>Set as evaluation world</button>}
                  {canEditWorlds && <button type="button" className="danger" onClick={() => removeWorld(selectedWorld.key)}>Delete</button>}
                </div>
                {canEditEdges && <label className="connect-world"><span>Connect to…</span><select aria-label={`Connect ${selectedWorld.id} to world`} defaultValue="" onChange={(event) => { const target = worlds.find(({ id }) => id.trim() === event.target.value); if (target) connectWorlds({ source: String(selectedWorld.key), target: String(target.key), sourceHandle: null, targetHandle: null }); event.currentTarget.value = '' }}><option value="">Choose a world</option>{worlds.filter(({ id }) => id.trim()).map(({ id }) => <option key={id} value={id.trim()}>{id.trim()}</option>)}</select></label>}
              </Panel>
              )}
              <Background color="#b9b6aa" gap={24} size={1} />
              {showMinimap && <MiniMap
                nodeComponent={MiniMapWithRelations}
                nodeColor={(node) => node.data.isEvaluation === true ? '#14647a' : '#7a4d26'}
                nodeStrokeColor="#f8f7f1"
                nodeStrokeWidth={2}
                nodeBorderRadius={50}
                maskColor="rgba(236, 233, 223, .62)"
                ariaLabel="Model overview"
              />}
            </ReactFlow> : <div className="model-table-wrap"><table className="model-table"><caption>Keyboard-accessible model view. Changes are synchronized with the graph.</caption><thead><tr><th>World</th><th>Atoms</th><th>Accessible worlds</th><th>Actions</th></tr></thead><tbody>{worlds.map((world) => <tr key={world.key} className={world.id.trim() === activeTrace?.worldId ? 'current' : ''}><td><WorldIdInput ariaLabel={`Table world ${world.id || world.key}`} disabled={!canEditWorlds} value={world.id} onCommit={(value) => renameWorld(world.key, value)} /></td><td><input aria-label={`Atoms at ${world.id || world.key}`} disabled={!canEditValuations} value={world.atoms} placeholder="none" onFocus={saveHistoryPoint} onChange={(event) => updateWorldAtoms(world.key, event.target.value)} /></td><td><div className="successor-chips">{effectiveEdges.filter(({ from }) => from === world.id.trim()).map(({ from, to }) => { const derived = !explicitEdgeKeyByPair.has(`${from}\u0000${to}`); return <span key={`${from}:${to}`} className={derived ? 'derived' : 'explicit'} aria-label={`${to}, ${derived ? 'derived' : 'explicit'}`}>{to}<small>{derived ? 'derived' : 'explicit'}</small></span> })}{!effectiveEdges.some(({ from }) => from === world.id.trim()) && 'none'}</div></td><td>{isQuestionTask && (activeLevel?.prediction?.kind === 'world-choice' || activeLevel?.prediction?.kind === 'counterexample-world') ? <button type="button" className={predictionAnswer === world.id.trim() ? 'active' : ''} aria-pressed={predictionAnswer === world.id.trim()} onClick={() => choosePredictionAnswer(world.id.trim())}>Choose world</button> : <button type="button" onClick={() => selectEvaluationWorld(world.id.trim())} disabled={!world.id.trim() || !canEditEvaluation}>Evaluate here</button>}{canEditWorlds && <button type="button" className="danger" onClick={() => removeWorld(world.key)}>Delete</button>}</td></tr>)}</tbody></table>{worlds.length === 0 && <div className="empty-card"><strong>No worlds yet</strong><span>Add the first world to populate both views.</span><button type="button" onClick={() => addWorld()} disabled={!canEditWorlds}>Add first world</button></div>}</div>}
          </div>
        </div>

        {showWorldPanel && <div className="panel model-panel" data-tour-target="editing-controls">
          <div className="panel-heading">
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
            <div><h2>Accessibility</h2></div>
          </div>
          <div className="edge-list">
            {edges.length === 0 && <p className="empty-state">The model has no explicit relations.</p>}
            {edges.map((edge) => (
              <div className="edge-row" key={edge.key} onClick={() => selectExplicitEdge(edge.key)}>
                <span className="edge-mark" aria-hidden="true">R</span>
                <select disabled={!canEditEdges} aria-label="Relation source world" value={edge.from} onChange={(event) => { replaceEdgeEndpoint(edge.key, 'from', event.target.value) }}>
                  {usableWorldIds.map((id) => <option key={id}>{id}</option>)}
                </select>
                <span className="relation-arrow" aria-hidden="true">→</span>
                <select disabled={!canEditEdges} aria-label="Relation target world" value={edge.to} onChange={(event) => { replaceEdgeEndpoint(edge.key, 'to', event.target.value) }}>
                  {usableWorldIds.map((id) => <option key={id}>{id}</option>)}
                </select>
                <button type="button" className="remove-button" disabled={!canEditEdges} onClick={() => deleteEdge(edge.key)} aria-label="Delete relation">×</button>
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
          <p className="derived-summary">+ {derivedPairKeys.size} relation{derivedPairKeys.size === 1 ? '' : 's'} derived from frame properties. {showDerivedEdges ? 'Shown' : 'Hidden'} for display only. Verification always uses enforced relations.</p>
          )}
          <button type="button" className="secondary-button" onClick={addEdge} disabled={worlds.length === 0 || !canEditEdges || edgeDraft !== null}>+ Add relation</button>
        </div>}

        <div className="panel verify-panel" data-tour-target="formula-controls">
          <div className="panel-heading">
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
              <PredictionInput prediction={activeLevel.prediction} answer={predictionAnswer} onAnswer={choosePredictionAnswer} scope={activeLevel.scope} availableWorldIds={usableWorldIds} propertyChoices={levelPropertyNames} />
            </div>
          )}
          {!isGuidedMode && <button type="button" className="verify-button" onClick={verify} disabled={!isConstructionObjective && frameValuationLimitExceeded}>Verify objective</button>}
          {!isQuestionTask ? <VerificationSummary
            ref={verificationResultRef}
            state={result?.kind ?? 'idle'}
            summary={result?.kind === 'error' ? result.message : result ? result.diagnostic ?? result.detail : undefined}
            actions={result?.kind === 'failure' && courseLesson && activeLevelFailureCount >= 3 ? <LearnRecoveryActions relatedTitle={relatedLearnLesson?.title} onReview={() => setLearnConceptOpen(true)} onHint={() => revealLearnHint(Math.min(learnHintLevel + 1, 3))} onRelated={relatedLearnLesson ? () => startLearnLesson(learnLessons.findIndex(({ id }) => id === relatedLearnLesson.id)) : undefined} /> : undefined}
          >
            {hasSemanticResultDetails && <>
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
            </>}
          </VerificationSummary> : <p className="question-result-note">Answer feedback appears in the Question panel above.</p>}
        </div>
      </section>}

      {appView === 'workspace' && courseLesson && learnConceptOpen && (
        <div className="dialog-backdrop concept-backdrop" role="presentation" onMouseDown={() => setLearnConceptOpen(false)}>
          <section className="help-dialog lesson-concept-dialog" role="dialog" aria-modal="true" aria-labelledby="lesson-concept-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-heading"><div><p className="eyebrow">Learn Modal Logic · Lesson {activeLearnChapterIndex + 1}</p><h2 id="lesson-concept-title">{courseLesson.title}</h2></div><button type="button" className="dialog-close" onClick={() => setLearnConceptOpen(false)} aria-label="Close lesson concept">×</button></div>
            <div className="lesson-concept-grid"><article><h3>Learning objective</h3><p>{courseLesson.learningObjective}</p></article><article><h3>{courseLesson.concept.heading}</h3><p>{courseLesson.concept.intuitive}</p>{courseLesson.concept.formal && <code>{courseLesson.concept.formal}</code>}<ul>{courseLesson.concept.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>{courseLesson.concept.warning && <p className="lesson-warning"><strong>Common pitfall:</strong> {courseLesson.concept.warning}</p>}</article>{courseLesson.workedExample && <details className="worked-example-disclosure"><summary>Show worked example</summary><WorkedExampleCard lessonId={courseLesson.id} example={courseLesson.workedExample} /></details>}</div>
            <button type="button" className="primary-action" autoFocus onClick={() => setLearnConceptOpen(false)}>Start task</button>
          </section>
        </div>
      )}

      {appView === 'workspace' && showWorkspaceTour && <WorkspaceTour sandbox={gameMode === 'sandbox'} initialStep={workspaceTourStep} onStepChange={setWorkspaceTourStep} onClose={dismissWorkspaceTour} onDone={dismissWorkspaceTour} />}

      {showFrameRules && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setShowFrameRules(false)}>
          <section className="help-dialog frame-rules-dialog" role="dialog" aria-modal="true" aria-labelledby="frame-rules-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-heading">
              <div><p className="eyebrow">Accessibility relation</p><h2 id="frame-rules-title">Frame constraints</h2></div>
              <button type="button" className="dialog-close" onClick={() => setShowFrameRules(false)} aria-label="Close frame rules">×</button>
            </div>
            <p className="dialog-intro">Constraints are input conditions, separate from the active objective. <strong>Validate</strong> requires a property without changing the relation. <strong>Enforce</strong> computes the least closure and displays generated relations as dashed arrows.</p>
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

      {showDataManager && <DataManagerDialog backupSource={backupImportSource} modelSource={importSource} message={dataMessage} onBackupSourceChange={(value) => { setBackupImportSource(value); setDataMessage('') }} onModelSourceChange={(value) => { setImportSource(value); setDataMessage('') }} onDownloadBackup={() => downloadJson(serializedProgressBackup(), 'logic-model-builder-progress-backup.json')} onImportBackup={importProgress} onDownloadModel={downloadModel} onImportModel={importModel} onResetProgress={resetSavedProgress} onResetSandbox={resetSavedSandbox} onClose={() => setShowDataManager(false)} />}

      {showHelp && <WorkspaceQuickHelp onClose={() => setShowHelp(false)} onOpenHelp={() => { setShowHelp(false); setAppView('help') }} onReplayTour={() => { setShowHelp(false); openWorkspaceTour() }} />}
      </main>
    </div>
  )
}

export function App(props: { readonly initialView?: AppView } = {}) {
  return <MobileUnsupportedGuard><AppContent {...props} /></MobileUnsupportedGuard>
}
