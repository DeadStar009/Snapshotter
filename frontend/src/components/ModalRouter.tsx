import React from 'react'
import { useAppStore } from '../store'
import { CreateSnapshotModal } from './modals/CreateSnapshotModal'
import { RestoreConfirmModal } from './modals/RestoreConfirmModal'
import { RenameSnapshotModal } from './modals/RenameSnapshotModal'
import { AddProjectModal } from './modals/AddProjectModal'

/**
 * Renders the currently active modal based on store state.
 * This component is mounted once at the app root.
 */
export function ModalRouter() {
  const modal = useAppStore((st) => st.modal)

  switch (modal.type) {
    case 'create-snapshot':
      return <CreateSnapshotModal />

    case 'restore-confirm':
      if (!modal.snapshotId) return null
      return <RestoreConfirmModal snapshotId={modal.snapshotId} />

    case 'rename-snapshot':
      if (!modal.snapshotId) return null
      return <RenameSnapshotModal snapshotId={modal.snapshotId} />

    case 'add-project':
      return <AddProjectModal />

    default:
      return null
  }
}
