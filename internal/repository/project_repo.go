package repository

import (
	"database/sql"
	"fmt"
	"time"

	"snapshotter/internal/models"
)

// ProjectRepository handles all project persistence.
type ProjectRepository struct {
	db *sql.DB
}

func NewProjectRepository(db *sql.DB) *ProjectRepository {
	return &ProjectRepository{db: db}
}

func (r *ProjectRepository) Create(p *models.Project) error {
	now := time.Now().Unix()
	_, err := r.db.Exec(
		`INSERT INTO projects (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
		p.ID, p.Name, p.RootPath, now, now,
	)
	if err != nil {
		return fmt.Errorf("create project: %w", err)
	}
	// Insert ignore rules
	for _, pattern := range p.IgnoreRules {
		if err := r.insertIgnoreRule(p.ID, pattern); err != nil {
			return err
		}
	}
	return nil
}

func (r *ProjectRepository) GetByID(id string) (*models.Project, error) {
	row := r.db.QueryRow(
		`SELECT id, name, root_path, created_at, updated_at FROM projects WHERE id = ?`, id,
	)
	return r.scanProject(row)
}

func (r *ProjectRepository) GetByPath(rootPath string) (*models.Project, error) {
	row := r.db.QueryRow(
		`SELECT id, name, root_path, created_at, updated_at FROM projects WHERE root_path = ?`, rootPath,
	)
	return r.scanProject(row)
}

func (r *ProjectRepository) ListAll() ([]*models.Project, error) {
	rows, err := r.db.Query(
		`SELECT id, name, root_path, created_at, updated_at FROM projects ORDER BY name ASC`,
	)
	if err != nil {
		return nil, fmt.Errorf("list projects: %w", err)
	}

	// Collect all project rows BEFORE closing the cursor so we can run
	// subsequent GetIgnoreRules queries without hitting a deadlock on the
	// single SQLite connection.
	var projects []*models.Project
	for rows.Next() {
		p, err := r.scanProjectRow(rows)
		if err != nil {
			rows.Close()
			return nil, err
		}
		projects = append(projects, p)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close() // release the connection before running more queries

	// Now load ignore rules with the connection free.
	for _, p := range projects {
		rules, err := r.GetIgnoreRules(p.ID)
		if err != nil {
			return nil, err
		}
		p.IgnoreRules = rules
	}
	return projects, nil
}

func (r *ProjectRepository) Update(p *models.Project) error {
	now := time.Now().Unix()
	_, err := r.db.Exec(
		`UPDATE projects SET name = ?, root_path = ?, updated_at = ? WHERE id = ?`,
		p.Name, p.RootPath, now, p.ID,
	)
	if err != nil {
		return fmt.Errorf("update project: %w", err)
	}
	// Replace ignore rules
	if _, err := r.db.Exec(`DELETE FROM project_ignore_rules WHERE project_id = ?`, p.ID); err != nil {
		return err
	}
	for _, pattern := range p.IgnoreRules {
		if err := r.insertIgnoreRule(p.ID, pattern); err != nil {
			return err
		}
	}
	return nil
}

func (r *ProjectRepository) Delete(id string) error {
	_, err := r.db.Exec(`DELETE FROM projects WHERE id = ?`, id)
	return err
}

func (r *ProjectRepository) GetIgnoreRules(projectID string) ([]string, error) {
	rows, err := r.db.Query(
		`SELECT pattern FROM project_ignore_rules WHERE project_id = ? ORDER BY pattern ASC`, projectID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var patterns []string
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, err
		}
		patterns = append(patterns, p)
	}
	return patterns, rows.Err()
}

func (r *ProjectRepository) insertIgnoreRule(projectID, pattern string) error {
	_, err := r.db.Exec(
		`INSERT OR IGNORE INTO project_ignore_rules (id, project_id, pattern) VALUES (?, ?, ?)`,
		newID(), projectID, pattern,
	)
	return err
}

func (r *ProjectRepository) scanProject(row *sql.Row) (*models.Project, error) {
	var p models.Project
	var createdAt, updatedAt int64
	if err := row.Scan(&p.ID, &p.Name, &p.RootPath, &createdAt, &updatedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("scan project: %w", err)
	}
	p.CreatedAt = time.Unix(createdAt, 0)
	p.UpdatedAt = time.Unix(updatedAt, 0)
	rules, err := r.GetIgnoreRules(p.ID)
	if err != nil {
		return nil, err
	}
	p.IgnoreRules = rules
	return &p, nil
}

func (r *ProjectRepository) scanProjectRow(rows *sql.Rows) (*models.Project, error) {
	var p models.Project
	var createdAt, updatedAt int64
	if err := rows.Scan(&p.ID, &p.Name, &p.RootPath, &createdAt, &updatedAt); err != nil {
		return nil, fmt.Errorf("scan project row: %w", err)
	}
	p.CreatedAt = time.Unix(createdAt, 0)
	p.UpdatedAt = time.Unix(updatedAt, 0)
	return &p, nil
}
