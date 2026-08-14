interface SettingsViewProps {
  readonly density: 'comfortable' | 'compact'
  readonly showMinimap: boolean
  readonly showDerivedRelations: boolean
  readonly reduceMotion: boolean
  readonly soundEffects: boolean
  readonly onDensityChange: (density: 'comfortable' | 'compact') => void
  readonly onShowMinimapChange: (show: boolean) => void
  readonly onShowDerivedRelationsChange: (show: boolean) => void
  readonly onReduceMotionChange: (reduce: boolean) => void
  readonly onSoundEffectsChange: (enabled: boolean) => void
  readonly onManageData: () => void
  readonly onReset: () => void
}

export function SettingsView({ density, showMinimap, showDerivedRelations, reduceMotion, soundEffects, onDensityChange, onShowMinimapChange, onShowDerivedRelationsChange, onReduceMotionChange, onSoundEffectsChange, onManageData, onReset }: SettingsViewProps) {
  return <section className="content-screen settings-screen" aria-labelledby="settings-title">
    <div className="screen-hero compact"><div><p className="eyebrow">Local preferences</p><h1 id="settings-title" className="clean-display">Settings</h1><p>These display preferences are stored only in this browser and do not change modal semantics or mission rules.</p></div></div>
    <div className="settings-grid">
      <article><h2>Workspace density</h2><p>Comfortable spacing favors reading. Compact spacing keeps more controls visible.</p><div className="settings-choice"><button type="button" className={density === 'comfortable' ? 'active' : ''} aria-pressed={density === 'comfortable'} onClick={() => onDensityChange('comfortable')}>Comfortable</button><button type="button" className={density === 'compact' ? 'active' : ''} aria-pressed={density === 'compact'} onClick={() => onDensityChange('compact')}>Compact</button></div></article>
      <article><h2>Map display</h2><label><input type="checkbox" checked={showMinimap} onChange={(event) => onShowMinimapChange(event.target.checked)} /> Show minimap</label><label><input type="checkbox" checked={showDerivedRelations} onChange={(event) => onShowDerivedRelationsChange(event.target.checked)} /> Show derived relations</label><p>Display only. Enforced derived relations still affect verification when hidden.</p></article>
      <article><h2>Motion</h2><label><input type="checkbox" checked={reduceMotion} onChange={(event) => onReduceMotionChange(event.target.checked)} /> Reduce interface animation</label><p>The operating-system reduced-motion preference is respected independently.</p></article>
      <article><h2>Sound</h2><label><input type="checkbox" checked={soundEffects} onChange={(event) => onSoundEffectsChange(event.target.checked)} /> Sound effects</label><p>Short create and verification cues only. Sound is off by default. There is no background music.</p></article>
      <article><h2>Window</h2><p>Fullscreen is available directly from the global toolbar when the browser and embedding policy support it.</p></article>
      <article><h2>Privacy</h2><p>Models, formulas, settings, and study history stay in this browser. They are not automatically sent anywhere. This build uses no analytics SDK or tracking cookies. Explicit exports and share links contain only the data you choose to share.</p><button type="button" className="secondary-button" onClick={onManageData}>Manage local data</button></article>
      <article><h2>Reset preferences</h2><p>Restore comfortable density, minimap and derived relations on, motion override and sound off, and both workspace panels open. Learning and model data are untouched.</p><button type="button" className="secondary-button" onClick={onReset}>Reset interface preferences</button></article>
    </div>
  </section>
}
