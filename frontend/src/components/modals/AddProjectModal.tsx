import React, { useState } from 'react'
import { useAppStore } from '../../store'
import { selectDirectory } from '../../wailsApi'
import { ModalOverlay } from './ModalOverlay'
import { ModalHeader } from './ModalHeader'
import s from './SimpleModal.module.css'
import ms from './AddProjectModal.module.css'

export function AddProjectModal() {
  const closeModal = useAppStore((st) => st.closeModal)
  const addProject = useAppStore((st) => st.addProject)

  const [name, setName] = useState('')
  const [rootPath, setRootPath] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isBrowsing, setIsBrowsing] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  async function handleBrowse() {
    setError(null)
    setIsBrowsing(true)
    try {
      // Small delay so the Wails webview fully releases focus to the OS
      // before the native folder picker opens — prevents silent empty returns.
      await new Promise<void>((resolve) => setTimeout(resolve, 100))
      const dir = await selectDirectory()
      if (dir) {
        setRootPath(dir)
        if (!name) {
          const parts = dir.replace(/\\/g, '/').split('/')
          setName(parts[parts.length - 1] || dir)
        }
      }
    } catch (e) {
      setError(`Could not open folder picker: ${String(e)}`)
    } finally {
      setIsBrowsing(false)
    }
  }

  async function handleAdd() {
    if (!name.trim()) { setError('Project name is required'); return }
    if (!rootPath.trim()) { setError('Project path is required'); return }
    setIsAdding(true)
    setError(null)
    try {
      await addProject(name.trim(), rootPath.trim())
      closeModal()
    } catch (e) {
      // Always surface the error — never stay silently stuck
      const msg = String(e)
      setError(msg.includes('Error:') ? msg.split('Error:').pop()!.trim() : msg)
      setIsAdding(false)
    }
  }

  const busy = isAdding || isBrowsing

  return (
    <ModalOverlay onClose={busy ? undefined : closeModal} maxWidth={480}>
      <ModalHeader icon="add" title="ADD PROJECT" onClose={closeModal} />
      <div className={s.body}>
        <div className={s.field}>
          <label className={s.label}>PROJECT NAME</label>
          <input
            className={s.input}
            type="text"
            placeholder="e.g. Financial Advisory AI"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !busy && handleAdd()}
            disabled={busy}
            autoFocus
          />
        </div>

        <div className={s.field}>
          <label className={s.label}>ROOT DIRECTORY</label>
          <div className={ms.pathRow}>
            <input
              className={`${s.input} ${ms.pathInput}`}
              type="text"
              placeholder="D:\Projects\MyProject"
              value={rootPath}
              onChange={(e) => setRootPath(e.target.value)}
              disabled={busy}
              spellCheck={false}
            />
            <button
              className={ms.browseBtn}
              onClick={handleBrowse}
              disabled={busy}
              type="button"
            >
              {isBrowsing
                ? <span className="material-symbols-outlined spin" style={{ fontSize: 14 }}>sync</span>
                : <span className="material-symbols-outlined" style={{ fontSize: 14 }}>folder_open</span>
              }
              Browse
            </button>
          </div>
          <p className={ms.hint}>
            All snapshots for this project will be stored in the vault location.
          </p>
        </div>

        {error && <div className={s.error}>{error}</div>}
      </div>

      <div className={s.footer}>
        <button className={s.cancelBtn} onClick={closeModal} disabled={isAdding}>
          [CANCEL]
        </button>
        <button
          className={s.primaryBtn}
          onClick={handleAdd}
          disabled={busy || !name.trim() || !rootPath.trim()}
        >
          {isAdding ? (
            <>
              <span className="material-symbols-outlined spin" style={{ fontSize: 13 }}>sync</span>
              ADDING…
            </>
          ) : 'ADD PROJECT'}
        </button>
      </div>
    </ModalOverlay>
  )
}
