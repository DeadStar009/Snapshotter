import React, { useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import { getRestorePreview } from '../../wailsApi'
import { formatBytes, formatDate } from '../../utils'
import type { RestorePreview } from '../../types'
import { ModalOverlay } from './ModalOverlay'
import s from './RestoreConfirmModal.module.css'

interface Props {
  snapshotId: string
}

export function RestoreConfirmModal({ snapshotId }: Props) {
  const closeModal = useAppStore((st) => st.closeModal)
  const restoreSnapshot = useAppStore((st) => st.restoreSnapshot)

  const [preview, setPreview] = useState<RestorePreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  useEffect(() => {
    getRestorePreview(snapshotId)
      .then(setPreview)
      .catch((e) => setLoadError(String(e)))
  }, [snapshotId])

  async function handleRestore() {
    setIsRestoring(true)
    setRestoreError(null)
    try {
      await restoreSnapshot(snapshotId)
      closeModal()
    } catch (e) {
      setRestoreError(String(e))
      setIsRestoring(false)
    }
  }

  return (
    <ModalOverlay onClose={isRestoring ? undefined : closeModal} maxWidth={560}>
      {/* Title bar styled like a mini window */}
      <div className={s.titleBar}>
        <div className={s.titleLeft}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--c-warning)' }}>warning</span>
          <span className={`label-caps ${s.titleText}`}>RESTORATION MANAGER</span>
        </div>
        <button className={s.titleClose} onClick={closeModal} disabled={isRestoring}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
        </button>
      </div>

      {loadError && (
        <div className={s.loadError}>Failed to load preview: {loadError}</div>
      )}

      {!preview && !loadError && (
        <div className={s.loading}>
          <span className="material-symbols-outlined spin">sync</span>
          Loading preview…
        </div>
      )}

      {preview && (
        <>
          <div className={s.body}>
            {/* Header info */}
            <div className={s.snapshotInfo}>
              <div className={s.snapshotInfoLeft}>
                <span className={`label-caps ${s.targetLabel}`}>TARGET SNAPSHOT</span>
                <h2 className={s.snapshotName}>{preview.snapshotName}</h2>
                <div className={s.snapshotMeta}>
                  <span>Created: {formatDate(preview.createdAt)}</span>
                </div>
              </div>
              <div className={s.sizeBox}>
                <span className={`label-caps ${s.sizeLabel}`}>SIZE</span>
                <span className={s.sizeValue}>{formatBytes(preview.sizeBytes)}</span>
              </div>
            </div>

            {/* Warning zone */}
            <div className={s.warningZone}>
              <div className={s.warningHeader}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--c-error)' }}>report</span>
                <span className={`label-caps ${s.warningTitle}`}>OPERATIONAL SUMMARY & WARNING</span>
              </div>
              <div className={s.warningGrid}>
                <div className={s.warningActions}>
                  <WarningItem text={`Restore ${preview.filesToRestore} tracked files`} />
                  {preview.filesToDelete > 0 && (
                    <WarningItem text={`Remove ${preview.filesToDelete} untracked files`} warn />
                  )}
                  {preview.changeSummary.added > 0 && (
                    <WarningItem text={`Restore ${preview.changeSummary.added} deleted file(s)`} />
                  )}
                  {preview.changeSummary.modified > 0 && (
                    <WarningItem text={`Revert ${preview.changeSummary.modified} modified file(s)`} />
                  )}
                </div>
                <p className={s.warningNote}>
                  Any unsaved changes in the current working directory will be permanently
                  overwritten by this action.
                </p>
              </div>
            </div>

            {/* Preserved dirs */}
            {preview.preservedDirs.length > 0 && (
              <div className={s.preservedSection}>
                <div className={s.preservedHeader}>
                  <span className={`label-caps ${s.preservedLabel}`}>PRESERVED DIRECTORIES</span>
                  <span className={s.preservedNote}>These will remain untouched</span>
                </div>
                <div className={s.chips}>
                  {preview.preservedDirs.map((dir) => (
                    <span key={dir} className={s.chip}>{dir}/</span>
                  ))}
                </div>
              </div>
            )}

            {restoreError && (
              <div className={s.restoreError}>Restore failed: {restoreError}</div>
            )}
          </div>

          {/* Footer */}
          <div className={s.footer}>
            <button
              className={s.abortBtn}
              onClick={closeModal}
              disabled={isRestoring}
            >
              Abort Action
            </button>
            <button
              className={s.confirmBtn}
              onClick={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <>
                  <span className="material-symbols-outlined spin" style={{ fontSize: 16 }}>sync</span>
                  RESTORING…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>restore</span>
                  Confirm & Restore Snapshot
                </>
              )}
            </button>
          </div>
        </>
      )}
    </ModalOverlay>
  )
}

function WarningItem({ text, warn }: { text: string; warn?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: 'var(--c-text)',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 13, color: warn ? 'var(--c-error)' : 'var(--c-success)' }}
      >
        {warn ? 'warning' : 'check_circle'}
      </span>
      {text}
    </div>
  )
}
