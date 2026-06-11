package main

// This file exposes all Wails-bound methods on *App.
// All methods return (data, error) — errors are surfaced as strings in the frontend.

import (
	"fmt"
	"os"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"snapshotter/internal/models"
)

// ---- Window Management ----

func (a *App) WindowMinimize() {
	runtime.WindowMinimise(a.ctx)
}

func (a *App) WindowMaximize() {
	runtime.WindowMaximise(a.ctx)
}

func (a *App) WindowToggleMaximize() {
	if runtime.WindowIsMaximised(a.ctx) {
		runtime.WindowUnmaximise(a.ctx)
	} else {
		runtime.WindowMaximise(a.ctx)
	}
}

func (a *App) WindowClose() {
	runtime.Quit(a.ctx)
}

// ---- File Dialogs ----

// SelectDirectory opens a native folder picker and returns the selected path.
func (a *App) SelectDirectory() (string, error) {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Project Folder",
	})
	if err != nil {
		return "", err
	}
	return dir, nil
}

// SelectVaultDirectory opens a native folder picker for vault location.
func (a *App) SelectVaultDirectory() (string, error) {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Vault Storage Location",
	})
	if err != nil {
		return "", err
	}
	return dir, nil
}

// ---- Projects ----

// AddProject creates a new project with default ignore rules.
func (a *App) AddProject(name, rootPath string) (*models.Project, error) {
	return a.projectService.AddProject(name, rootPath)
}

// GetProject returns a project by ID.
func (a *App) GetProject(id string) (*models.Project, error) {
	return a.projectService.GetProject(id)
}

// ListProjects returns all projects.
func (a *App) ListProjects() ([]*models.Project, error) {
	return a.projectService.ListProjects()
}

// UpdateProject updates a project's name and ignore rules.
func (a *App) UpdateProject(id, name string, ignoreRules []string) (*models.Project, error) {
	return a.projectService.UpdateProject(id, name, ignoreRules)
}

// RemoveProject removes a project (does not delete its snapshot files).
func (a *App) RemoveProject(id string) error {
	return a.projectService.RemoveProject(id)
}

// GetProjectStats returns snapshot count and storage used by a project.
func (a *App) GetProjectStats(id string) (map[string]interface{}, error) {
	count, bytes, err := a.snapshotService.GetProjectStats(id)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"snapshotCount": count,
		"storageBytes":  bytes,
	}, nil
}

// OpenProjectFolder opens the project's root folder in Windows Explorer.
func (a *App) OpenProjectFolder(id string) error {
	p, err := a.projectService.GetProject(id)
	if err != nil {
		return err
	}
	if _, err := os.Stat(p.RootPath); os.IsNotExist(err) {
		return fmt.Errorf("directory no longer exists: %s", p.RootPath)
	}
	return openInExplorer(p.RootPath)
}

// ---- Snapshots ----

// CreateSnapshot creates a new snapshot for a project.
func (a *App) CreateSnapshot(projectID, name, notes string) (*models.Snapshot, error) {
	return a.snapshotService.CreateSnapshot(projectID, name, notes)
}

// EstimateSnapshotSize returns the estimated snapshot size in bytes.
func (a *App) EstimateSnapshotSize(projectID string) (int64, error) {
	return a.snapshotService.EstimateSize(projectID)
}

// ListSnapshots returns all snapshots for a project.
func (a *App) ListSnapshots(projectID string) ([]*models.Snapshot, error) {
	return a.snapshotService.ListSnapshots(projectID)
}

// GetSnapshot returns a single snapshot by ID.
func (a *App) GetSnapshot(id string) (*models.Snapshot, error) {
	return a.snapshotService.GetSnapshot(id)
}

// RenameSnapshot updates a snapshot's display name.
func (a *App) RenameSnapshot(id, newName string) error {
	return a.snapshotService.RenameSnapshot(id, newName)
}

// UpdateSnapshotNotes updates a snapshot's notes.
func (a *App) UpdateSnapshotNotes(id, notes string) error {
	return a.snapshotService.UpdateNotes(id, notes)
}

// SetSnapshotPinned pins or unpins a snapshot.
func (a *App) SetSnapshotPinned(id string, pinned bool) error {
	return a.snapshotService.SetPinned(id, pinned)
}

// DeleteSnapshot permanently removes a snapshot and its stored files.
func (a *App) DeleteSnapshot(id string) error {
	return a.snapshotService.DeleteSnapshot(id)
}

// GetSnapshotEntries returns the file entries recorded for a snapshot.
func (a *App) GetSnapshotEntries(snapshotID string) ([]*models.SnapshotEntry, error) {
	return a.snapshotService.GetEntries(snapshotID)
}

// GetChangeSummary returns aggregated change counts for a snapshot.
func (a *App) GetChangeSummary(snapshotID string) (*models.ChangeSummary, error) {
	return a.snapshotService.GetChangeSummary(snapshotID)
}

// ---- Restore ----

// GetRestorePreview returns a preview of what restoring a snapshot will do.
func (a *App) GetRestorePreview(snapshotID string) (*models.RestorePreview, error) {
	return a.snapshotService.GetRestorePreview(snapshotID)
}

// RestoreSnapshot executes a full restore. User must have confirmed via the UI first.
func (a *App) RestoreSnapshot(snapshotID string) error {
	return a.snapshotService.RestoreSnapshot(snapshotID)
}

// ---- Settings ----

// GetAppSettings returns current application settings.
// Always returns a vault root — falls back to the default dir if nothing is persisted yet.
func (a *App) GetAppSettings() (*models.AppSettings, error) {
	vaultRoot, err := a.settingsService.GetVaultRoot()
	if err != nil {
		return nil, err
	}
	if vaultRoot == "" {
		// Not yet persisted — derive and save the default so the frontend always has a value
		defaultVault, defErr := resolveDefaultVaultDir()
		if defErr != nil {
			return nil, fmt.Errorf("cannot resolve default vault dir: %w", defErr)
		}
		vaultRoot = defaultVault
		_ = a.settingsService.SetVaultRoot(vaultRoot)
	}
	return &models.AppSettings{VaultRoot: vaultRoot}, nil
}

// SetVaultRoot updates the vault storage location.
func (a *App) SetVaultRoot(path string) error {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		if err := os.MkdirAll(path, 0755); err != nil {
			return fmt.Errorf("cannot create vault directory: %w", err)
		}
	}
	if err := a.settingsService.SetVaultRoot(path); err != nil {
		return err
	}
	// Keep the in-memory snapshot engine in sync so new snapshots use the new path.
	a.snapshotService.UpdateVaultRoot(path)
	return nil
}
