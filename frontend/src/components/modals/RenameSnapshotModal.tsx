import React, { useState } from 'react'
import { useAppStore } from '../../store'
import { ModalOverlay } from './ModalOverlay'
import { ModalHeader } from './ModalHeader'
import s from './SimpleModal.module.css'

interface Props {
  snapshotId: string
}

export function RenameSnapshotModal({ snapshotId }: Props) {
  const closeModal = useAppStore((st) => st.closeModal)
  const snapshots = useAppStore((st) => st.snapshots)
  const renameSnapshot = useAppStore((st) => st.renameSnapshot)

  const snapshot = snapshots.find((sn) => sn.id === snapshotId)
  const [name, setName] = useState(snapshot?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    setIsSaving(true)
    setError(null)
    try {
      await renameSnapshot(snapshotId, name.trim())
      closeModal()
    } catch (e) {
      setError(String(e))
      setIsSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={closeModal} maxWidth={420}>
      <ModalHeader icon="edit" title="RENAME SNAPSHOT" onClose={closeModal} />
      <div className={s.body}>
        <div className={s.field}>
          <label className={s.label}>SNAPSHOT NAME</label>
          <input
            className={s.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
            disabled={isSaving}
          />
        </div>
        {error && <div className={s.error}>{error}</div>}
      </div>
      <div className={s.footer}>
        <button className={s.cancelBtn} onClick={closeModal} disabled={isSaving}>[CANCEL]</button>
        <button className={s.primaryBtn} onClick={handleSave} disabled={isSaving || !name.trim()}>
          {isSaving ? 'SAVING…' : 'RENAME'}
        </button>
      </div>
    </ModalOverlay>
  )
}
