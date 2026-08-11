// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { campaignTracks } from '../campaign'
import { guidedCampaigns } from '../guided-campaigns'
import { CampaignsView } from './CampaignsView'

afterEach(cleanup)

const baseProps: Parameters<typeof CampaignsView>[0] = {
  section: 'challenges', guidedCampaigns, practiceTracks: campaignTracks, selectedTrackIndex: 0,
  completedLevelIds: new Set(), overallPracticeCompleted: 0,
  overallPracticeLevels: campaignTracks.reduce((sum, track) => sum + track.levels.length, 0),
  activePracticeTrackIndex: 0, activePracticeLevelIndex: 0, practiceSessionActive: false,
  onSectionChange: vi.fn(), onOpenLearn: vi.fn(), onStartCampaign: vi.fn(),
  onSelectPracticeTrack: vi.fn(), onStartPractice: vi.fn(), onResumePractice: vi.fn(),
}

describe('CampaignsView', () => {
  it('switches between Challenge and Practice tabs through its controller callback', () => {
    const onSectionChange = vi.fn()
    render(<CampaignsView {...baseProps} onSectionChange={onSectionChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Practice Library' }))
    expect(onSectionChange).toHaveBeenCalledWith('practice')
  })

  it('renders collection selection and mission list inside Campaigns', () => {
    const onSelectPracticeTrack = vi.fn()
    render(<CampaignsView {...baseProps} section="practice" onSelectPracticeTrack={onSelectPracticeTrack} />)
    expect(screen.getByLabelText('Practice collection list')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Practice' }).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByLabelText('Practice collection list').querySelectorAll('button')[1])
    expect(onSelectPracticeTrack).toHaveBeenCalledWith(1)
  })
})
