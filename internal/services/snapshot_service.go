package services

import (
	"fmt"
	"os"
	"strings"

	"snapshotter/internal/database"
	"snapshotter/internal/engine"
	"snapshotter/internal/fsutil"
	"snapshotter/internal/logger"
	"snapshotter/internal/models"
	"snapshotter/internal/repository"
)

// SnapshotService coordinates snapshot creation, listing, and restoration.
type SnapshotService struct {
	repo           *repository.SnapshotRepository
	snapshotEngine *engine.SnapshotEngine
	restoreEngine  *engine.RestoreEngine
	log            *logger.Logger
}

func NewSnapshotService(db *database.DB, vaultRoot string, log *logger.Logger) *SnapshotService {
	projectRepo := repository.NewProjectRepository(db.Conn())
	snapshotRepo := repository.NewSnapshotRepository(db.Conn())

	snapshotEng := engine.NewSnapshotEngine(vaultRoot, snapshotRepo, projectRepo, log)
	restoreEng := engine.NewRestoreEngine(snapshotRepo, projectRepo, log)

	return &SnapshotService{
		repo:           snapshotRepo,
		snapshotEngine: snapshotEng,
		restoreEngine:  restoreEng,
		log:            log,
	}
}

// Repo exposes the snapshot repository for use in bindings.
func (s *SnapshotService) Repo() *repository.SnapshotRepository {
	return s.repo
}

// UpdateVaultRoot updates the vault root used by the snapshot engine at runtime.
// Call this whenever the user changes the vault storage location in settings.
func (s *SnapshotService) UpdateVaultRoot(vaultRoot string) {
	s.snapshotEngine.SetVaultRoot(vaultRoot)
}

// CreateSnapshot creates a new snapshot for the given project.
func (s *SnapshotService) CreateSnapshot(projectID, name, notes string) (*models.Snapshot, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("snapshot name is required")
	}
	return s.snapshotEngine.Create(engine.CreateRequest{
		ProjectID: projectID,
		Name:      name,
		Notes:     notes,
	})
}

// EstimateSize returns the estimated snapshot size for a project.
func (s *SnapshotService) EstimateSize(projectID string) (int64, error) {
	return s.snapshotEngine.EstimateSize(projectID)
}

// ListSnapshots returns all snapshots for a project.
func (s *SnapshotService) ListSnapshots(projectID string) ([]*models.Snapshot, error) {
	return s.repo.ListByProject(projectID)
}

// GetSnapshot returns a single snapshot by ID.
func (s *SnapshotService) GetSnapshot(id string) (*models.Snapshot, error) {
	snap, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if snap == nil {
		return nil, fmt.Errorf("snapshot not found: %s", id)
	}
	return snap, nil
}

// RenameSnapshot updates a snapshot's name.
func (s *SnapshotService) RenameSnapshot(id, newName string) error {
	newName = strings.TrimSpace(newName)
	if newName == "" {
		return fmt.Errorf("snapshot name cannot be empty")
	}
	return s.repo.UpdateName(id, newName)
}

// UpdateNotes updates a snapshot's notes.
func (s *SnapshotService) UpdateNotes(id, notes string) error {
	return s.repo.UpdateNotes(id, notes)
}

// SetPinned pins or unpins a snapshot.
func (s *SnapshotService) SetPinned(id string, pinned bool) error {
	return s.repo.SetPinned(id, pinned)
}

// DeleteSnapshot removes a snapshot's metadata and its stored files.
func (s *SnapshotService) DeleteSnapshot(id string) error {
	snap, err := s.repo.GetByID(id)
	if err != nil {
		return fmt.Errorf("load snapshot: %w", err)
	}
	if snap == nil {
		return fmt.Errorf("snapshot not found: %s", id)
	}

	// Remove files first, then metadata
	if snap.StoragePath != "" {
		if err := fsutil.RemoveAll(snap.StoragePath); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("remove snapshot files: %w", err)
		}
	}

	if err := s.repo.Delete(id); err != nil {
		return fmt.Errorf("delete snapshot record: %w", err)
	}

	s.log.Info("Snapshot deleted: %s", id)
	return nil
}

// GetRestorePreview builds a preview of what a restore operation will do.
func (s *SnapshotService) GetRestorePreview(snapshotID string) (*models.RestorePreview, error) {
	return s.restoreEngine.BuildPreview(snapshotID)
}

// RestoreSnapshot executes a full restore of the given snapshot.
func (s *SnapshotService) RestoreSnapshot(snapshotID string) error {
	return s.restoreEngine.Restore(snapshotID)
}

// GetEntries returns file entries for a snapshot.
func (s *SnapshotService) GetEntries(snapshotID string) ([]*models.SnapshotEntry, error) {
	return s.repo.ListEntries(snapshotID)
}

// GetChangeSummary returns the change summary for a snapshot.
func (s *SnapshotService) GetChangeSummary(snapshotID string) (*models.ChangeSummary, error) {
	return s.repo.GetChangeSummary(snapshotID)
}

// GetProjectStats returns snapshot count and total storage for a project.
func (s *SnapshotService) GetProjectStats(projectID string) (count int, totalBytes int64, err error) {
	return s.repo.GetProjectStats(projectID)
}
