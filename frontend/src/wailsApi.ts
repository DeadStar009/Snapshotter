/**
 * Typed wrappers around the auto-generated Wails bindings.
 * All Go methods on *App are callable via window.go.main.App.*
 * This module re-exports them with TypeScript types so the rest of
 * the app never touches the raw global.
 */

import type {
  Project,
  ProjectStats,
  Snapshot,
  SnapshotEntry,
  ChangeSummary,
  RestorePreview,
  AppSettings,
} from './types'

// Wails injects this global at runtime
declare const window: Window & {
  go: {
    main: {
      App: {
        // Window
        WindowMinimize(): Promise<void>
        WindowToggleMaximize(): Promise<void>
        WindowClose(): Promise<void>

        // Dialogs
        SelectDirectory(): Promise<string>
        SelectVaultDirectory(): Promise<string>

        // Projects
        AddProject(name: string, rootPath: string): Promise<Project>
        GetProject(id: string): Promise<Project>
        ListProjects(): Promise<Project[]>
        UpdateProject(id: string, name: string, ignoreRules: string[]): Promise<Project>
        RemoveProject(id: string): Promise<void>
        GetProjectStats(id: string): Promise<{ snapshotCount: number; storageBytes: number }>
        OpenProjectFolder(id: string): Promise<void>

        // Snapshots
        CreateSnapshot(projectId: string, name: string, notes: string): Promise<Snapshot>
        EstimateSnapshotSize(projectId: string): Promise<number>
        ListSnapshots(projectId: string): Promise<Snapshot[]>
        GetSnapshot(id: string): Promise<Snapshot>
        RenameSnapshot(id: string, newName: string): Promise<void>
        UpdateSnapshotNotes(id: string, notes: string): Promise<void>
        SetSnapshotPinned(id: string, pinned: boolean): Promise<void>
        DeleteSnapshot(id: string): Promise<void>
        GetSnapshotEntries(snapshotId: string): Promise<SnapshotEntry[]>
        GetChangeSummary(snapshotId: string): Promise<ChangeSummary>

        // Restore
        GetRestorePreview(snapshotId: string): Promise<RestorePreview>
        RestoreSnapshot(snapshotId: string): Promise<void>

        // Settings
        GetAppSettings(): Promise<AppSettings>
        SetVaultRoot(path: string): Promise<void>
      }
    }
  }
}

const api = () => window.go.main.App

export const windowMinimize = () => api().WindowMinimize()
export const windowToggleMaximize = () => api().WindowToggleMaximize()
export const windowClose = () => api().WindowClose()

export const selectDirectory = () => api().SelectDirectory()
export const selectVaultDirectory = () => api().SelectVaultDirectory()

export const addProject = (name: string, rootPath: string): Promise<Project> =>
  api().AddProject(name, rootPath)
export const getProject = (id: string): Promise<Project> => api().GetProject(id)
export const listProjects = (): Promise<Project[]> => api().ListProjects()
export const updateProject = (id: string, name: string, ignoreRules: string[]): Promise<Project> =>
  api().UpdateProject(id, name, ignoreRules)
export const removeProject = (id: string): Promise<void> => api().RemoveProject(id)
export const getProjectStats = (id: string): Promise<ProjectStats> => api().GetProjectStats(id)
export const openProjectFolder = (id: string): Promise<void> => api().OpenProjectFolder(id)

export const createSnapshot = (projectId: string, name: string, notes: string): Promise<Snapshot> =>
  api().CreateSnapshot(projectId, name, notes)
export const estimateSnapshotSize = (projectId: string): Promise<number> =>
  api().EstimateSnapshotSize(projectId)
export const listSnapshots = (projectId: string): Promise<Snapshot[]> =>
  api().ListSnapshots(projectId)
export const getSnapshot = (id: string): Promise<Snapshot> => api().GetSnapshot(id)
export const renameSnapshot = (id: string, newName: string): Promise<void> =>
  api().RenameSnapshot(id, newName)
export const updateSnapshotNotes = (id: string, notes: string): Promise<void> =>
  api().UpdateSnapshotNotes(id, notes)
export const setSnapshotPinned = (id: string, pinned: boolean): Promise<void> =>
  api().SetSnapshotPinned(id, pinned)
export const deleteSnapshot = (id: string): Promise<void> => api().DeleteSnapshot(id)
export const getSnapshotEntries = (snapshotId: string): Promise<SnapshotEntry[]> =>
  api().GetSnapshotEntries(snapshotId)
export const getChangeSummary = (snapshotId: string): Promise<ChangeSummary> =>
  api().GetChangeSummary(snapshotId)

export const getRestorePreview = (snapshotId: string): Promise<RestorePreview> =>
  api().GetRestorePreview(snapshotId)
export const restoreSnapshot = (snapshotId: string): Promise<void> =>
  api().RestoreSnapshot(snapshotId)

export const getAppSettings = (): Promise<AppSettings> => api().GetAppSettings()
export const setVaultRoot = (path: string): Promise<void> => api().SetVaultRoot(path)
