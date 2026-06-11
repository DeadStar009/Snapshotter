package repository

import (
	"database/sql"
	"fmt"
	"time"

	"snapshotter/internal/models"
)

// SnapshotRepository handles all snapshot persistence.
type SnapshotRepository struct {
	db *sql.DB
}

func NewSnapshotRepository(db *sql.DB) *SnapshotRepository {
	return &SnapshotRepository{db: db}
}

func (r *SnapshotRepository) Create(s *models.Snapshot) error {
	pinned := 0
	if s.IsPinned {
		pinned = 1
	}
	_, err := r.db.Exec(
		`INSERT INTO snapshots (id, project_id, name, notes, size_bytes, file_count, folder_count, is_pinned, storage_path, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		s.ID, s.ProjectID, s.Name, s.Notes, s.SizeBytes, s.FileCount, s.FolderCount, pinned, s.StoragePath, s.CreatedAt.Unix(),
	)
	if err != nil {
		return fmt.Errorf("create snapshot: %w", err)
	}
	return nil
}

func (r *SnapshotRepository) GetByID(id string) (*models.Snapshot, error) {
	row := r.db.QueryRow(
		`SELECT id, project_id, name, notes, size_bytes, file_count, folder_count, is_pinned, storage_path, created_at
		 FROM snapshots WHERE id = ?`, id,
	)
	return r.scanSnapshot(row)
}

func (r *SnapshotRepository) ListByProject(projectID string) ([]*models.Snapshot, error) {
	rows, err := r.db.Query(
		`SELECT id, project_id, name, notes, size_bytes, file_count, folder_count, is_pinned, storage_path, created_at
		 FROM snapshots WHERE project_id = ? ORDER BY is_pinned DESC, created_at DESC`, projectID,
	)
	if err != nil {
		return nil, fmt.Errorf("list snapshots: %w", err)
	}
	defer rows.Close()

	var snapshots []*models.Snapshot
	for rows.Next() {
		s, err := r.scanSnapshotRow(rows)
		if err != nil {
			return nil, err
		}
		snapshots = append(snapshots, s)
	}
	return snapshots, rows.Err()
}

func (r *SnapshotRepository) UpdateName(id, name string) error {
	_, err := r.db.Exec(`UPDATE snapshots SET name = ? WHERE id = ?`, name, id)
	return err
}

func (r *SnapshotRepository) UpdateNotes(id, notes string) error {
	_, err := r.db.Exec(`UPDATE snapshots SET notes = ? WHERE id = ?`, notes, id)
	return err
}

func (r *SnapshotRepository) SetPinned(id string, pinned bool) error {
	val := 0
	if pinned {
		val = 1
	}
	_, err := r.db.Exec(`UPDATE snapshots SET is_pinned = ? WHERE id = ?`, val, id)
	return err
}

func (r *SnapshotRepository) UpdateStats(id string, sizeBytes int64, fileCount, folderCount int) error {
	_, err := r.db.Exec(
		`UPDATE snapshots SET size_bytes = ?, file_count = ?, folder_count = ? WHERE id = ?`,
		sizeBytes, fileCount, folderCount, id,
	)
	return err
}

func (r *SnapshotRepository) Delete(id string) error {
	_, err := r.db.Exec(`DELETE FROM snapshots WHERE id = ?`, id)
	return err
}

func (r *SnapshotRepository) GetStoragePath(id string) (string, error) {
	var path string
	err := r.db.QueryRow(`SELECT storage_path FROM snapshots WHERE id = ?`, id).Scan(&path)
	if err != nil {
		return "", err
	}
	return path, nil
}

// GetProjectStats returns snapshot count and total storage for a project.
func (r *SnapshotRepository) GetProjectStats(projectID string) (count int, totalBytes int64, err error) {
	err = r.db.QueryRow(
		`SELECT COUNT(*), COALESCE(SUM(size_bytes),0) FROM snapshots WHERE project_id = ?`, projectID,
	).Scan(&count, &totalBytes)
	return
}

// InsertEntries bulk-inserts snapshot entries.
func (r *SnapshotRepository) InsertEntries(entries []*models.SnapshotEntry) error {
	if len(entries) == 0 {
		return nil
	}
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	stmt, err := tx.Prepare(
		`INSERT INTO snapshot_entries (id, snapshot_id, relative_path, size_bytes, change_type, is_dir)
		 VALUES (?, ?, ?, ?, ?, ?)`,
	)
	if err != nil {
		_ = tx.Rollback()
		return err
	}
	defer stmt.Close()

	for _, e := range entries {
		isDir := 0
		if e.IsDir {
			isDir = 1
		}
		if _, err := stmt.Exec(e.ID, e.SnapshotID, e.RelativePath, e.SizeBytes, string(e.ChangeType), isDir); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("insert entry %s: %w", e.RelativePath, err)
		}
	}
	return tx.Commit()
}

// ListEntries returns all entries for a snapshot.
func (r *SnapshotRepository) ListEntries(snapshotID string) ([]*models.SnapshotEntry, error) {
	rows, err := r.db.Query(
		`SELECT id, snapshot_id, relative_path, size_bytes, change_type, is_dir
		 FROM snapshot_entries WHERE snapshot_id = ? ORDER BY relative_path ASC`, snapshotID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*models.SnapshotEntry
	for rows.Next() {
		e := &models.SnapshotEntry{}
		var isDir int
		if err := rows.Scan(&e.ID, &e.SnapshotID, &e.RelativePath, &e.SizeBytes, &e.ChangeType, &isDir); err != nil {
			return nil, err
		}
		e.IsDir = isDir == 1
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// GetChangeSummary returns aggregated change counts for a snapshot.
func (r *SnapshotRepository) GetChangeSummary(snapshotID string) (*models.ChangeSummary, error) {
	rows, err := r.db.Query(
		`SELECT change_type, COUNT(*) FROM snapshot_entries WHERE snapshot_id = ? AND is_dir = 0 GROUP BY change_type`,
		snapshotID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summary := &models.ChangeSummary{}
	for rows.Next() {
		var ct string
		var count int
		if err := rows.Scan(&ct, &count); err != nil {
			return nil, err
		}
		switch models.ChangeType(ct) {
		case models.ChangeAdded:
			summary.Added = count
		case models.ChangeModified:
			summary.Modified = count
		case models.ChangeDeleted:
			summary.Deleted = count
		}
	}
	return summary, rows.Err()
}

func (r *SnapshotRepository) scanSnapshot(row *sql.Row) (*models.Snapshot, error) {
	var s models.Snapshot
	var createdAt int64
	var pinned int
	if err := row.Scan(&s.ID, &s.ProjectID, &s.Name, &s.Notes, &s.SizeBytes, &s.FileCount, &s.FolderCount, &pinned, &s.StoragePath, &createdAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("scan snapshot: %w", err)
	}
	s.IsPinned = pinned == 1
	s.CreatedAt = time.Unix(createdAt, 0)
	return &s, nil
}

func (r *SnapshotRepository) scanSnapshotRow(rows *sql.Rows) (*models.Snapshot, error) {
	var s models.Snapshot
	var createdAt int64
	var pinned int
	if err := rows.Scan(&s.ID, &s.ProjectID, &s.Name, &s.Notes, &s.SizeBytes, &s.FileCount, &s.FolderCount, &pinned, &s.StoragePath, &createdAt); err != nil {
		return nil, fmt.Errorf("scan snapshot row: %w", err)
	}
	s.IsPinned = pinned == 1
	s.CreatedAt = time.Unix(createdAt, 0)
	return &s, nil
}
