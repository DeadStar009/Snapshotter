import React, { useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import { estimateSnapshotSize } from '../../wailsApi'
import { formatBytes } from '../../utils'
import { ModalOverlay } from './ModalOverlay'
import { ModalHeader } from './ModalHeader'
import s from './CreateSnapshotModal.module.css'

export function CreateSnapshotModal() {
  const closeModal = useAppStore((st) => st.closeModal)
  const selectedProjectId = useAppStore((st) => st.selectedProjectId)
  const projects = useAppStore((st) => st.projects)
  const createSnapshot = useAppStore((st) => st.createSnapshot)

  const project = projects.find((p) => p.id === selectedProjectId)

  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedProjectId) return
    estimateSnapshotSize(selectedProjectId)
      .then(setEstimatedSize)
      .catch(() => setEstimatedSize(null))
  }, [selectedProjectId])

  async function handleCreate() {
    if (!name.trim()) {
      setError('Snapshot name is required')
      return
    }
    setIsCreating(true)
    setError(null)
    try {
      await createSnapshot(name.trim(), notes.trim())
      closeModal()
    } catch (e) {
      setError(String(e))
      setIsCreating(false)
    }
  }

  return (
    <ModalOverlay onClose={isCreating ? undefined : closeModal}>
      <ModalHeader icon="add_a_photo" title="CREATE SNAPSHOT" onClose={closeModal} />

      <div className={s.body}>
        {/* Context */}
        <div className={s.context}>
          <div className={s.contextItem}>
            <span className={s.contextLabel}>PROJECT</span>
            <span className={s.contextValue}>{project?.name ?? '—'}</span>
          </div>
          <div className={s.contextItem}>
            <span className={s.contextLabel}>ESTIMATED SIZE</span>
            <span className={`${s.contextValue} ${s.sizeValue}`}>
              {estimatedSize !== null ? formatBytes(estimatedSize) : 'Calculating…'}
            </span>
          </div>
        </div>

        {/* Fields */}
        <div className={s.fields}>
          <div className={s.field}>
            <label className={s.fieldLabel}>
              <span>SNAPSHOT NAME</span>
              <span className={s.required}>[required]</span>
            </label>
            <input
              className={s.input}
              type="text"
              placeholder="e.g. before-auth-refactor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
              disabled={isCreating}
              spellCheck={false}
            />
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel}>
              <span>NOTES</span>
              <span className={s.optional}>[optional]</span>
            </label>
            <textarea
              className={s.textarea}
              placeholder="Describe changes or state since last snapshot..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isCreating}
            />
          </div>
        </div>

        {/* Info row */}
        <div className={s.infoRow}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--c-text-dim)' }}>info</span>
          <span className={s.infoText}>
            Ignored directories (node_modules, .git, etc.) are automatically excluded.
          </span>
        </div>

        {/* Error */}
        {error && <div className={s.errorMsg}>{error}</div>}
      </div>

      {/* Footer */}
      <div className={s.footer}>
        <button
          className={s.cancelBtn}
          onClick={closeModal}
          disabled={isCreating}
        >
          [CANCEL]
        </button>
        <button
          className={s.createBtn}
          onClick={handleCreate}
          disabled={isCreating || !name.trim()}
        >
          {isCreating ? (
            <>
              <span className="material-symbols-outlined spin" style={{ fontSize: 14 }}>sync</span>
              CREATING…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>save</span>
              CREATE SNAPSHOT
            </>
          )}
        </button>
      </div>
    </ModalOverlay>
  )
}
