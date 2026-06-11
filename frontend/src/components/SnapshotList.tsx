import React from 'react'
import { useAppStore } from '../store'
import type { Snapshot } from '../types'
import { cx, formatBytes, formatDate, relativeTime } from '../utils'
import s from './SnapshotList.module.css'

export function SnapshotList() {
  const selectedProjectId = useAppStore((st) => st.selectedProjectId)
  const projects = useAppStore((st) => st.projects)
  const snapshots = useAppStore((st) => st.snapshots)
  const selectedSnapshotId = useAppStore((st) => st.selectedSnapshotId)
  const selectSnapshot = useAppStore((st) => st.selectSnapshot)
  const openModal = useAppStore((st) => st.openModal)
  const isLoading = useAppStore((st) => st.isLoading)

  const project = projects.find((p) => p.id === selectedProjectId)

  const pinned = snapshots.filter((sn) => sn.isPinned)
  const unpinned = snapshots.filter((sn) => !sn.isPinned)

  if (!selectedProjectId) {
    return (
      <div className={s.empty}>
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--c-text-dim)' }}>
          folder_open
        </span>
        <p>Select a project to view snapshots</p>
      </div>
    )
  }

  return (
    <section className={s.root}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <span className={`label-caps ${s.headerLabel}`}>
            {project ? project.name : 'Project Snapshots'}
          </span>
          {project && (
            <span className={s.headerPath}>{project.rootPath}</span>
          )}
        </div>
        <div className={s.headerActions}>
          <button
            className={s.primaryBtn}
            onClick={() => openModal({ type: 'create-snapshot', projectId: selectedProjectId })}
            disabled={isLoading}
          >
            <span className="material-symbols-outlined">add</span>
            CREATE SNAPSHOT
          </button>
          <button
            className={s.secondaryBtn}
            onClick={() => openModal({ type: 'app-settings' })}
            title="Project Settings"
          >
            <span className="material-symbols-outlined">settings</span>
            PROJECT SETTINGS
          </button>
        </div>
      </div>

      {/* Table header */}
      <div className={s.tableHeader}>
        <div className={s.colName}>NAME</div>
        <div className={s.colDate}>DATE</div>
        <div className={s.colSize}>SIZE</div>
        <div className={s.colActions} />
      </div>

      {/* Content */}
      <div className={s.scrollArea}>
        {isLoading && snapshots.length === 0 && (
          <div className={s.loading}>
            <span className="material-symbols-outlined spin">sync</span>
          </div>
        )}

        {!isLoading && snapshots.length === 0 && (
          <div className={s.noSnapshots}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--c-text-dim)' }}>
              history
            </span>
            <p>No snapshots yet</p>
            <button
              className={s.primaryBtn}
              onClick={() => openModal({ type: 'create-snapshot', projectId: selectedProjectId })}
            >
              Create First Snapshot
            </button>
          </div>
        )}

        {/* Pinned section */}
        {pinned.length > 0 && (
          <>
            <div className={s.sectionHeader}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>keep</span>
              Pinned Snapshots
            </div>
            {pinned.map((sn) => (
              <SnapshotRow
                key={sn.id}
                snapshot={sn}
                isSelected={sn.id === selectedSnapshotId}
                onSelect={() => selectSnapshot(sn.id)}
              />
            ))}
          </>
        )}

        {/* Regular snapshots */}
        {unpinned.map((sn) => (
          <SnapshotRow
            key={sn.id}
            snapshot={sn}
            isSelected={sn.id === selectedSnapshotId}
            onSelect={() => selectSnapshot(sn.id)}
          />
        ))}
      </div>
    </section>
  )
}

function SnapshotRow({
  snapshot,
  isSelected,
  onSelect,
}: {
  snapshot: Snapshot
  isSelected: boolean
  onSelect: () => void
}) {
  const openModal = useAppStore((st) => st.openModal)
  const setPinned = useAppStore((st) => st.setPinned)
  const deleteSnapshot = useAppStore((st) => st.deleteSnapshot)

  return (
    <div
      className={cx(s.row, isSelected && s.rowSelected)}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className={s.colName}>
        <span className={cx('material-symbols-outlined', s.rowIcon)}>
          {snapshot.isPinned ? 'keep' : 'history'}
        </span>
        <span className={cx(s.rowName, 'truncate')}>{snapshot.name}</span>
        {snapshot.notes && (
          <span className={cx(s.rowNotes, 'truncate')}>{snapshot.notes}</span>
        )}
      </div>

      <div className={s.colDate}>
        <span className={s.dateMain}>{formatDate(snapshot.createdAt)}</span>
        <span className={s.dateRel}>{relativeTime(snapshot.createdAt)}</span>
      </div>

      <div className={s.colSize}>
        {formatBytes(snapshot.sizeBytes)}
      </div>

      <div className={cx(s.colActions, s.rowActions)}>
        <button
          className={s.actionBtn}
          title="Restore"
          onClick={(e) => {
            e.stopPropagation()
            openModal({ type: 'restore-confirm', snapshotId: snapshot.id })
          }}
        >
          <span className="material-symbols-outlined">restore</span>
        </button>
        <button
          className={s.actionBtn}
          title="Rename"
          onClick={(e) => {
            e.stopPropagation()
            openModal({ type: 'rename-snapshot', snapshotId: snapshot.id })
          }}
        >
          <span className="material-symbols-outlined">edit</span>
        </button>
        <button
          className={cx(s.actionBtn, s.actionPin, snapshot.isPinned && s.actionPinActive)}
          title={snapshot.isPinned ? 'Unpin' : 'Pin'}
          onClick={(e) => {
            e.stopPropagation()
            setPinned(snapshot.id, !snapshot.isPinned)
          }}
        >
          <span className="material-symbols-outlined">keep</span>
        </button>
        <button
          className={cx(s.actionBtn, s.actionDelete)}
          title="Delete"
          onClick={(e) => {
            e.stopPropagation()
            if (confirm(`Delete snapshot "${snapshot.name}"? This cannot be undone.`)) {
              deleteSnapshot(snapshot.id)
            }
          }}
        >
          <span className="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  )
}
