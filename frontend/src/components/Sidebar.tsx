import React, { useState } from 'react'
import { useAppStore } from '../store'
import { cx, truncatePath } from '../utils'
import s from './Sidebar.module.css'

export function Sidebar() {
  const projects = useAppStore((st) => st.projects)
  const selectedProjectId = useAppStore((st) => st.selectedProjectId)
  const selectProject = useAppStore((st) => st.selectProject)
  const openModal = useAppStore((st) => st.openModal)
  const setView = useAppStore((st) => st.setView)
  const view = useAppStore((st) => st.view)

  const [search, setSearch] = useState('')
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  function handleContextMenu(e: React.MouseEvent, projectId: string) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ id: projectId, x: e.clientX, y: e.clientY })
  }

  function closeContextMenu() {
    setContextMenu(null)
  }

  return (
    <>
      <nav className={s.root} onClick={closeContextMenu}>
        {/* Search */}
        <div className={s.searchWrap}>
          <span className={`material-symbols-outlined ${s.searchIcon}`}>search</span>
          <input
            className={s.search}
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* Add project */}
        <button
          className={s.addBtn}
          onClick={() => openModal({ type: 'add-project' })}
        >
          ADD PROJECT
        </button>

        {/* Project list */}
        <div className={s.listSection}>
          <span className={`label-caps ${s.listLabel}`}>PROJECTS</span>

          {filtered.length === 0 && (
            <div className={s.empty}>
              {search ? 'No matching projects' : 'No projects yet'}
            </div>
          )}

          {filtered.map((p) => {
            const isActive = p.id === selectedProjectId
            return (
              <button
                key={p.id}
                className={cx(s.projectRow, isActive && s.active)}
                onClick={() => selectProject(p.id)}
                onContextMenu={(e) => handleContextMenu(e, p.id)}
                title={p.rootPath}
              >
                <span className={`material-symbols-outlined ${s.folderIcon}`}>
                  {isActive ? 'folder_open' : 'folder'}
                </span>
                <span className={`${s.projectName} truncate`}>{p.name}</span>
                <span className={s.projectPath}>{truncatePath(p.rootPath, 24)}</span>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className={s.footer}>
          <button
            className={cx(s.footerBtn, view === 'settings' && s.footerBtnActive)}
            onClick={() => setView('settings')}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="label-caps">Preferences</span>
          </button>
        </div>
      </nav>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          projectId={contextMenu.id}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
        />
      )}
    </>
  )
}

function ContextMenu({
  projectId,
  x,
  y,
  onClose,
}: {
  projectId: string
  x: number
  y: number
  onClose: () => void
}) {
  const openModal = useAppStore((st) => st.openModal)
  const openProjectFolder = useAppStore((st) => st.openProjectFolder)
  const removeProject = useAppStore((st) => st.removeProject)
  const selectProject = useAppStore((st) => st.selectProject)

  function handle(fn: () => void) {
    fn()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 90 }}
        onClick={onClose}
      />
      <div
        className={s.contextMenu}
        style={{ top: y, left: x, zIndex: 100 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={s.contextItem}
          onClick={() => handle(() => openProjectFolder(projectId))}
        >
          <span className="material-symbols-outlined">folder_open</span>
          Open Project Folder
        </button>
        <button
          className={s.contextItem}
          onClick={() => handle(() => {
            selectProject(projectId)
            openModal({ type: 'create-snapshot', projectId })
          })}
        >
          <span className="material-symbols-outlined">add_a_photo</span>
          Create Snapshot
        </button>
        <button
          className={s.contextItem}
          onClick={() => handle(() => {
            selectProject(projectId)
            openModal({ type: 'app-settings' })
          })}
        >
          <span className="material-symbols-outlined">tune</span>
          Project Settings
        </button>
        <div className={s.contextDivider} />
        <button
          className={`${s.contextItem} ${s.contextDanger}`}
          onClick={() => handle(() => removeProject(projectId))}
        >
          <span className="material-symbols-outlined">delete</span>
          Remove Project
        </button>
      </div>
    </>
  )
}
