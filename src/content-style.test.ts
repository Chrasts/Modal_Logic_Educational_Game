// @ts-nocheck -- Vitest executes this Node-only source audit outside the browser bundle.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { campaignTracks, tutorialLevels } from './campaign'
import { guidedCampaigns } from './guided-campaigns'
import { learnCourse } from './learn'
import { frameCorrespondences, furtherReading, glossary } from './reference/reference-content'

const forbidden = /[;—]/u

function collectStrings(value: unknown, path: string, failures: string[], seen = new Set<unknown>()): void {
  if (typeof value === 'string') { if (forbidden.test(value)) failures.push(`${path}: ${value}`); return }
  if (!value || typeof value !== 'object' || seen.has(value)) return
  seen.add(value)
  if (Array.isArray(value)) value.forEach((entry, index) => collectStrings(entry, `${path}[${index}]`, failures, seen))
  else Object.entries(value).forEach(([key, entry]) => collectStrings(entry, `${path}.${key}`, failures, seen))
}

describe('visible copy style', () => {
  it('keeps authored learning and reference content free of forbidden punctuation', () => {
    const failures: string[] = []
    collectStrings({ tutorialLevels, campaignTracks, guidedCampaigns, learnCourse, frameCorrespondences, furtherReading, glossary }, 'content', failures)
    expect(failures, failures.join('\n')).toEqual([])
  })

  it('keeps JSX-authored application copy free of forbidden punctuation', () => {
    const files = [
      'App.tsx', 'ModalLogicWelcome.tsx',
      'app/CampaignsView.tsx', 'app/CreateView.tsx', 'app/DataManagerDialog.tsx', 'app/HelpView.tsx', 'app/HomeView.tsx', 'app/LabView.tsx', 'app/LearnOverview.tsx', 'app/MissionAuthoringView.tsx', 'app/ProfileView.tsx', 'app/ReferenceView.tsx', 'app/SettingsView.tsx',
      'components/MissionHeader.tsx', 'components/PredictionInput.tsx', 'components/ProgressiveHints.tsx', 'components/QuestionTaskPanel.tsx', 'components/StaticKripkeDiagram.tsx', 'components/VerificationSummary.tsx', 'components/WorkspaceQuickHelp.tsx', 'components/WorkspaceToolbar.tsx', 'components/WorkspaceTour.tsx',
      'authoring/AuthorStepNavigation.tsx', 'authoring/AuthorValidationSummary.tsx', 'authoring/MissionAuthorStepper.tsx',
      'learn/WorkedExampleCard.tsx',
    ]
    const failures: string[] = []
    for (const relative of files) {
      const source = readFileSync(join(process.cwd(), 'src', relative), 'utf8')
      if (source.includes('—')) failures.push(`${relative}: contains U+2014`)
      for (const line of source.split(/\r?\n/u)) {
        for (const match of line.matchAll(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/gu)) {
          if (match[0].includes(';') && match[0] !== "'text/csv;charset=utf-8'") failures.push(`${relative}: ${match[0]}`)
        }
        for (const match of line.matchAll(/>([^<>{}]+)</gu)) {
          const visible = match[1].replace(/&[a-z]+;/giu, '')
          if (visible.includes(';') && !/\breturn\b|\bconst\b/u.test(visible)) failures.push(`${relative}: ${visible.trim()}`)
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([])
  })
})
