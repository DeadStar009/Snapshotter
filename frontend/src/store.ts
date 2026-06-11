import { create } from 'zustand'
import type {
  Project,
  Snapshot,
  SnapshotEntry,
  ChangeSummary,
  AppSettings,
  ModalState,
  AppView,
} from './types'
import * as api from './wailsApi'

interface AppState {
  // ---- Data ----
  projects: Project[]
  selectedProjectId: string | null
  snapshots: Snapshot[]
  selectedSnapshotId: string | null
  snapshotEntries: SnapshotEntry[]
  changeSummary: ChangeSummary | null
  settings: AppSettings | null

  // ---- UI State ----
  view: AppView
  modal: ModalState
  statusMessage: string
  isLoading: boolean
  error: string | null

  // ---- Project actions ----
  loadProjects: () => Promise<void>
  selectProject: (id: string) => Promise<void>
  addProject: (name: string, rootPath: string) => Promise<void>
  updateProject: (id: string, name: string, ignoreRules: string[]) => Promise<void>
  removeProject: (id: string) => Promise<void>
  openProjectFolder: (id: string) => Promise<void>

  // ---- Snapshot actions ----
  loadSnapshots: (projectId: string) => Promise<void>
  selectSnapshot: (id: string) => Promise<void>
  createSnapshot: (name: string, notes: string) => Promise<void>
  renameSnapshot: (id: string, newName: string) => Promise<void>
  deleteSnapshot: (id: string) => Promise<void>
  setPinned: (id: string, pinned: boolean) => Promise<void>
  restoreSnapshot: (id: string) => Promise<void>

  // ---- Settings ----
  loadSettings: () => Promise<void>
  setVaultRoot: (path: string) => Promise<void>

  // ---- UI helpers ----
  openModal: (modal: ModalState) => void
  closeModal: () => void
  setView: (view: AppView) => void
  setError: (err: string | null) => void
  clearSelectedSnapshot: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // ---- Initial state ----
  projects: [],
  selectedProjectId: null,
  snapshots: [],
  selectedSnapshotId: null,
  snapshotEntries: [],
  changeSummary: null,
  settings: null,
  view: 'snapshots',
  modal: { type: 'none' },
  statusMessage: 'SYSTEM READY',
  isLoading: false,
  error: null,

  // ---- Project actions ----
  loadProjects: async () => {
    try {
      const projects = await api.listProjects()
      set({ projects: projects ?? [] })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  selectProject: async (id) => {
    set({ selectedProjectId: id, selectedSnapshotId: null, snapshotEntries: [], changeSummary: null })
    await get().loadSnapshots(id)
  },

  addProject: async (name, rootPath) => {
    set({ isLoading: true, error: null })
    try {
      const project = await api.addProject(name, rootPath)
      set((s) => ({ projects: [...s.projects, project], isLoading: false }))
      await get().selectProject(project.id)
    } catch (e) {
      set({ error: String(e), isLoading: false })
      throw e
    }
  },

  updateProject: async (id, name, ignoreRules) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await api.updateProject(id, name, ignoreRules)
      set((s) => ({
        projects: s.projects.map((p) => (p.id === id ? updated : p)),
        isLoading: false,
      }))
    } catch (e) {
      set({ error: String(e), isLoading: false })
      throw e
    }
  },

  removeProject: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.removeProject(id)
      const { projects, selectedProjectId } = get()
      const remaining = projects.filter((p) => p.id !== id)
      const nextSelected = selectedProjectId === id
        ? (remaining[0]?.id ?? null)
        : selectedProjectId
      set({ projects: remaining, isLoading: false })
      if (nextSelected) {
        await get().selectProject(nextSelected)
      } else {
        set({ snapshots: [], selectedProjectId: null, selectedSnapshotId: null })
      }
    } catch (e) {
      set({ error: String(e), isLoading: false })
      throw e
    }
  },

  openProjectFolder: async (id) => {
    try {
      await api.openProjectFolder(id)
    } catch (e) {
      set({ error: String(e) })
    }
  },

  // ---- Snapshot actions ----
  loadSnapshots: async (projectId) => {
    set({ isLoading: true })
    try {
      const snapshots = await api.listSnapshots(projectId)
      set({ snapshots: snapshots ?? [], isLoading: false })
    } catch (e) {
      set({ error: String(e), isLoading: false })
    }
  },

  selectSnapshot: async (id) => {
    set({ selectedSnapshotId: id, snapshotEntries: [], changeSummary: null })
    try {
      const [entries, summary] = await Promise.all([
        api.getSnapshotEntries(id),
        api.getChangeSummary(id),
      ])
      set({ snapshotEntries: entries ?? [], changeSummary: summary })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  createSnapshot: async (name, notes) => {
    const { selectedProjectId } = get()
    if (!selectedProjectId) return
    set({ isLoading: true, error: null })
    try {
      const snap = await api.createSnapshot(selectedProjectId, name, notes)
      set((s) => ({
        snapshots: [snap, ...s.snapshots],
        isLoading: false,
        statusMessage: `Snapshot '${snap.name}' created`,
      }))
      await get().selectSnapshot(snap.id)
    } catch (e) {
      set({ error: String(e), isLoading: false })
      throw e
    }
  },

  renameSnapshot: async (id, newName) => {
    try {
      await api.renameSnapshot(id, newName)
      set((s) => ({
        snapshots: s.snapshots.map((sn) =>
          sn.id === id ? { ...sn, name: newName } : sn
        ),
      }))
    } catch (e) {
      set({ error: String(e) })
      throw e
    }
  },

  deleteSnapshot: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.deleteSnapshot(id)
      const { selectedSnapshotId } = get()
      set((s) => ({
        snapshots: s.snapshots.filter((sn) => sn.id !== id),
        selectedSnapshotId: selectedSnapshotId === id ? null : selectedSnapshotId,
        snapshotEntries: selectedSnapshotId === id ? [] : s.snapshotEntries,
        changeSummary: selectedSnapshotId === id ? null : s.changeSummary,
        isLoading: false,
      }))
    } catch (e) {
      set({ error: String(e), isLoading: false })
      throw e
    }
  },

  setPinned: async (id, pinned) => {
    try {
      await api.setSnapshotPinned(id, pinned)
      set((s) => ({
        snapshots: s.snapshots
          .map((sn) => (sn.id === id ? { ...sn, isPinned: pinned } : sn))
          .sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          }),
      }))
    } catch (e) {
      set({ error: String(e) })
    }
  },

  restoreSnapshot: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.restoreSnapshot(id)
      set({ isLoading: false, statusMessage: 'Restore complete' })
    } catch (e) {
      set({ error: String(e), isLoading: false })
      throw e
    }
  },

  // ---- Settings ----
  loadSettings: async () => {
    try {
      const s = await api.getAppSettings()
      set({ settings: s })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  setVaultRoot: async (path) => {
    try {
      await api.setVaultRoot(path)
      set((s) => ({ settings: s.settings ? { ...s.settings, vaultRoot: path } : null }))
    } catch (e) {
      set({ error: String(e) })
      throw e
    }
  },

  // ---- UI ----
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: { type: 'none' } }),
  setView: (view) => set({ view }),
  setError: (error) => set({ error }),
  clearSelectedSnapshot: () =>
    set({ selectedSnapshotId: null, snapshotEntries: [], changeSummary: null }),
}))
