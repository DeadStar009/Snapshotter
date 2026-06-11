import React from 'react'
import { useAppStore } from '../store'
import { cx, formatBytes, formatDate } from '../utils'
import s from './SnapshotDetails.module.css'

export function SnapshotDetails() {
  const selectedSnapshotId = useAppStore((st) => st.selectedSnapshotId)
  const snapshots = useAppStore((st) => st.snapshots)
  const entries = useAppStore((st) => st.snapshotEntries)
  const changeSummary = useAppStore((st) => st.changeSummary)
  const openModal = useAppStore((st) => st.openModal)
  const clearSelectedSnapshot = useAppStore((st) => st.clearSelectedSnapshot)

  const snapshot = snapshots.find((sn) => sn.id === selectedSnapshotId)

  if (!snapshot) {
    return (
      <aside className={s.root}>
        <div className={s.placeholder}>
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--c-text-dim)' }}>
            info
          </span>
          <p>Select a snapshot to view details</p>
        </div>
      </aside>
    )
  }

  const fileEntries = entries.filter((e) => !e.isDir)
  const PREVIEW_LIMIT = 12

  return (
    <aside className={s.root}>
      {/* Panel header */}
      <div className={s.panelHeader}>
        <span className={`label-caps ${s.panelTitle}`}>SNAPSHOT DETAILS</span>
        <button
          className={s.closeBtn}
          onClick={clearSelectedSnapshot}
          aria-label="Close details"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className={s.scrollArea}>
        {/* Name and notes */}
        <div className={s.section}>
          <div className={s.nameRow}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--c-text-muted)', flexShrink: 0 }}>
              history
            </span>
            <div className={s.nameBlock}>
              <h2 className={s.snapshotName}>{snapshot.name}</h2>
              {snapshot.notes && (
                <p className={s.snapshotNotes}>{snapshot.notes}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={s.statsSection}>
          <StatRow label="TIMESTAMP" value={formatDate(snapshot.createdAt)} mono />
          <StatRow label="SIZE" value={formatBytes(snapshot.sizeBytes)} mono />
          <StatRow
            label="FILES / FOLDERS"
            value={`${snapshot.fileCount} / ${snapshot.folderCount}`}
            mono
          />
          <StatRow
            label="PINNED"
            value={snapshot.isPinned ? 'Yes' : 'No'}
          />
        </div>

        {/* Changes summary */}
        {changeSummary && (
          <div className={s.section}>
            <span className={`label-caps ${s.sectionLabel}`}>CHANGES SUMMARY</span>
            <div className={s.changeGrid}>
              <div className={s.changeCell}>
                <span className={s.changeLabelMod}>MOD</span>
                <span className={s.changeCount}>{changeSummary.modified}</span>
              </div>
              <div className={cx(s.changeCell, s.changeCellAdd)}>
                <span className={s.changeLabelAdd}>ADD</span>
                <span className={s.changeCount}>{changeSummary.added}</span>
              </div>
              <div className={cx(s.changeCell, s.changeCellDel)}>
                <span className={s.changeLabelDel}>DEL</span>
                <span className={s.changeCount}>{changeSummary.deleted}</span>
              </div>
            </div>
          </div>
        )}

        {/* File list */}
        {fileEntries.length > 0 && (
          <div className={s.section}>
            <span className={`label-caps ${s.sectionLabel}`}>TRACKED FILES</span>
            <div className={s.fileList}>
              {fileEntries.slice(0, PREVIEW_LIMIT).map((entry) => (
                <div key={entry.id} className={s.fileRow}>
                  <span className={cx(s.changeTag, s[`tag_${entry.changeType}`])}>
                    {entry.changeType === 'added' ? 'A'
                      : entry.changeType === 'deleted' ? 'D'
                      : entry.changeType === 'modified' ? 'M'
                      : '—'}
                  </span>
                  <span className={cx(s.filePath, 'truncate', entry.changeType === 'deleted' && s.fileDeleted)}>
                    {entry.relativePath}
                  </span>
                  <span className={s.fileSize}>{formatBytes(entry.sizeBytes)}</span>
                </div>
              ))}
              {fileEntries.length > PREVIEW_LIMIT && (
                <div className={s.moreFiles}>
                  +{fileEntries.length - PREVIEW_LIMIT} more files
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className={s.footer}>
        <button
          className={s.restoreBtn}
          onClick={() => openModal({ type: 'restore-confirm', snapshotId: snapshot.id })}
        >
          <span className="material-symbols-outlined">restore</span>
          RESTORE VERSION
        </button>
        <button
          className={s.deleteBtn}
          onClick={() => {
            if (confirm(`Delete snapshot "${snapshot.name}"? This cannot be undone.`)) {
              useAppStore.getState().deleteSnapshot(snapshot.id)
            }
          }}
        >
          <span className="material-symbols-outlined">delete</span>
          DELETE
        </button>
      </div>
    </aside>
  )
}

function StatRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
        borderBottom: '1px solid rgba(34,34,34,0.5)',
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--c-text-dim)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)',
          fontSize: 11,
          color: 'var(--c-text-muted)',
        }}
      >
        {value}
      </span>
    </div>
  )
}
