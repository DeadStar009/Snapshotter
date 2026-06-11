package settings

import (
	"database/sql"
	"fmt"

	"snapshotter/internal/database"
)

const (
	keyVaultRoot = "vault_root"
)

// Service manages persistent key-value application settings.
type Service struct {
	db *sql.DB
}

func NewService(d *database.DB) *Service {
	return &Service{db: d.Conn()}
}

func (s *Service) Get(key string) (string, error) {
	var val string
	err := s.db.QueryRow(`SELECT value FROM app_settings WHERE key = ?`, key).Scan(&val)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("get setting %s: %w", key, err)
	}
	return val, nil
}

func (s *Service) Set(key, value string) error {
	_, err := s.db.Exec(
		`INSERT INTO app_settings (key, value) VALUES (?, ?)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		key, value,
	)
	return err
}

func (s *Service) GetVaultRoot() (string, error) {
	return s.Get(keyVaultRoot)
}

func (s *Service) SetVaultRoot(path string) error {
	return s.Set(keyVaultRoot, path)
}
