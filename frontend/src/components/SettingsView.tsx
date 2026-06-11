import React, { useState, useEffect } from 'react'
import { useAppStore } from '../store'
import { selectVaultDirectory } from '../wailsApi'
import { cx } from '../utils'
import s from './SettingsView.module.css'

const DEFAULT_IGNORE_RULES = [
  'node_modules', '.git', 'venv', '.venv', 'dist',
  'build', '.next', '.cache', '__pycache__', 'coverage',
]

export function SettingsView() {
  const selectedProjectId = useAppStore((st) => st.selectedProjectId)
  const projects = useAppStore((st) => st.projects)
  const settings = useAppStore((st) => st.settings)
  const updateProject = useAppStore((st) => st.updateProject)
  const setVaultRoot = useAppStore((st) => st.setVaultRoot)
  const setView = useAppStore((st) => st.setView)

  const project = projects.find((p) => p.id === selectedProjectId)

  // Project settings state
  const [projName, setProjName] = useState(project?.name ?? '')
  const [ignoreRules, setIgnoreRules] = useState<string[]>(project?.ignoreRules ?? DEFAULT_IGNORE_RULES)
  const [newRule, setNewRule] = useState('')

  // App settings state
  const [vaultRoot, setVaultRootLocal] = useState(settings?.vaultRoot ?? '')

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (project) {
      setProjName(project.name)
      setIgnoreRules(project.ignoreRules ?? DEFAULT_IGNORE_RULES)
    }
  }, [project?.id])

  useEffect(() => {
    // React to settings loading after mount — watch the whole settings object
    if (settings?.vaultRoot) setVaultRootLocal(settings.vaultRoot)
  }, [settings])

  function removeRule(rule: string) {
    setIgnoreRules((prev) => prev.filter((r) => r !== rule))
  }

  function addRule() {
    const trimmed = newRule.trim()
    if (trimmed && !ignoreRules.includes(trimmed)) {
      setIgnoreRules((prev) => [...prev, trimmed])
    }
    setNewRule('')
  }

  async function handleBrowseVault() {
    setError(null)
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 80))
      const dir = await selectVaultDirectory()
      if (dir) setVaultRootLocal(dir)
    } catch (e) {
      setError(`Could not open folder picker: ${String(e)}`)
    }
  }

  async function handleSave() {
    setSaveState('saving')
    setError(null)
    try {
      if (project) {
        await updateProject(project.id, projName, ignoreRules)
      }
      if (vaultRoot !== settings?.vaultRoot) {
        await setVaultRoot(vaultRoot)
      }
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch (e) {
      const msg = String(e)
      setError(msg.includes('Error:') ? msg.split('Error:').pop()!.trim() : msg)
      setSaveState('idle')  // reset to idle so the button is usable again, not stuck
    }
  }

  return (
    <div className={s.root}>
      <div className={s.content}>
        {/* Page header */}
        <div className={s.pageHeader}>
          <div>
            <h1 className={s.pageTitle}>
              {project ? 'Project Settings' : 'Application Settings'}
            </h1>
            {project && (
              <p className={s.projectId}>{project.rootPath}</p>
            )}
          </div>
          <button
            className={s.backBtn}
            onClick={() => setView('snapshots')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
            Back to Snapshots
          </button>
        </div>

        <div className={s.divider} />

        {/* Project-level settings */}
        {project && (
          <>
            <section className={s.section}>
              <label className={s.sectionLabel}>PROJECT NAME</label>
              <input
                className={s.input}
                type="text"
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
              />
            </section>

            <div className={s.divider} />

            <section className={s.section}>
              <div className={s.sectionHeaderRow}>
                <label className={s.sectionLabel}>IGNORED DIRECTORIES</label>
                <span className={s.count}>{ignoreRules.length} Active Exclusions</span>
              </div>
              <div className={s.chipsGrid}>
                {ignoreRules.map((rule) => (
                  <div key={rule} className={s.chip}>
                    <span className={s.chipText}>{rule}</span>
                    <button
                      className={s.chipRemove}
                      onClick={() => removeRule(rule)}
                      aria-label={`Remove ${rule}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
                    </button>
                  </div>
                ))}
              </div>
              <div className={s.addRuleRow}>
                <input
                  className={s.addRuleInput}
                  type="text"
                  placeholder="Add directory to ignore (e.g. .terraform)"
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRule()}
                />
                <button className={s.addRuleBtn} onClick={addRule} disabled={!newRule.trim()}>
                  Add
                </button>
              </div>
              <p className={s.hint}>
                These directories will be excluded from all snapshots and left untouched during restore.
              </p>
            </section>

            <div className={s.divider} />
          </>
        )}

        {/* Vault location */}
        <section className={s.section}>
          <label className={s.sectionLabel}>VAULT STORAGE LOCATION</label>
          <div className={s.pathRow}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--c-text-dim)', flexShrink: 0 }}>folder</span>
            <input
              className={cx(s.input, s.pathInput)}
              type="text"
              value={vaultRoot}
              onChange={(e) => setVaultRootLocal(e.target.value)}
              spellCheck={false}
              readOnly
            />
            <button className={s.browseBtn} onClick={handleBrowseVault}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>folder_open</span>
              Browse
            </button>
          </div>
          <p className={s.hint}>
            All snapshot files are stored in this directory. Changing this affects new snapshots only.
          </p>
        </section>

        {error && <div className={s.errorMsg}>{error}</div>}

        {/* Actions */}
        <div className={s.actions}>
          <button
            className={s.discardBtn}
            onClick={() => setView('snapshots')}
            disabled={saveState === 'saving'}
          >
            DISCARD
          </button>
          <button
            className={cx(s.saveBtn, saveState === 'saved' && s.saveBtnDone)}
            onClick={handleSave}
            disabled={saveState === 'saving'}
          >
            {saveState === 'saving' ? (
              <>
                <span className="material-symbols-outlined spin" style={{ fontSize: 16 }}>sync</span>
                SAVING…
              </>
            ) : saveState === 'saved' ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                SAVED
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
                [ SAVE SETTINGS ]
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
