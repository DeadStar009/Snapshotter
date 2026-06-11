package database

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
)

// DB wraps a SQLite connection with migration support.
type DB struct {
	conn *sql.DB
}

// New opens (or creates) the SQLite database at path.
func New(path string) (*DB, error) {
	// WAL mode allows concurrent readers alongside a single writer.
	// busy_timeout lets write operations wait up to 10s if the DB is busy
	// rather than immediately returning SQLITE_BUSY.
	// Do NOT use _txlock=immediate — that forces every transaction to take
	// an exclusive write lock immediately, which deadlocks when a read is
	// already in progress on the same connection pool.
	dsn := fmt.Sprintf(
		"file:%s?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)&_pragma=busy_timeout(10000)&_pragma=synchronous(NORMAL)",
		path,
	)
	conn, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	// Allow up to 4 open connections so concurrent reads don't block writes.
	// WAL mode supports this correctly.
	conn.SetMaxOpenConns(4)
	conn.SetMaxIdleConns(4)
	conn.SetConnMaxLifetime(0)

	if err := conn.Ping(); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}

	return &DB{conn: conn}, nil
}

// Conn returns the underlying *sql.DB for use in repositories.
func (d *DB) Conn() *sql.DB {
	return d.conn
}

// Close closes the database connection.
func (d *DB) Close() error {
	return d.conn.Close()
}

// Migrate runs all schema migrations in order.
func (d *DB) Migrate() error {
	for i, migration := range migrations {
		if _, err := d.conn.Exec(migration); err != nil {
			return fmt.Errorf("migration %d failed: %w", i+1, err)
		}
	}
	return nil
}

// migrations contains all DDL statements, safe to re-run (CREATE TABLE IF NOT EXISTS).
var migrations = []string{
	`CREATE TABLE IF NOT EXISTS app_settings (
		key   TEXT PRIMARY KEY NOT NULL,
		value TEXT NOT NULL
	)`,

	`CREATE TABLE IF NOT EXISTS projects (
		id           TEXT PRIMARY KEY NOT NULL,
		name         TEXT NOT NULL,
		root_path    TEXT NOT NULL UNIQUE,
		created_at   INTEGER NOT NULL,
		updated_at   INTEGER NOT NULL
	)`,

	`CREATE TABLE IF NOT EXISTS project_ignore_rules (
		id         TEXT PRIMARY KEY NOT NULL,
		project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
		pattern    TEXT NOT NULL,
		UNIQUE(project_id, pattern)
	)`,

	`CREATE TABLE IF NOT EXISTS snapshots (
		id             TEXT PRIMARY KEY NOT NULL,
		project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
		name           TEXT NOT NULL,
		notes          TEXT NOT NULL DEFAULT '',
		size_bytes     INTEGER NOT NULL DEFAULT 0,
		file_count     INTEGER NOT NULL DEFAULT 0,
		folder_count   INTEGER NOT NULL DEFAULT 0,
		is_pinned      INTEGER NOT NULL DEFAULT 0,
		storage_path   TEXT NOT NULL,
		created_at     INTEGER NOT NULL
	)`,

	`CREATE TABLE IF NOT EXISTS snapshot_entries (
		id           TEXT PRIMARY KEY NOT NULL,
		snapshot_id  TEXT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
		relative_path TEXT NOT NULL,
		size_bytes   INTEGER NOT NULL DEFAULT 0,
		change_type  TEXT NOT NULL CHECK(change_type IN ('added','modified','deleted','unchanged')),
		is_dir       INTEGER NOT NULL DEFAULT 0
	)`,

	`CREATE INDEX IF NOT EXISTS idx_snapshots_project_id ON snapshots(project_id)`,
	`CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON snapshots(created_at)`,
	`CREATE INDEX IF NOT EXISTS idx_snapshot_entries_snapshot_id ON snapshot_entries(snapshot_id)`,
	`CREATE INDEX IF NOT EXISTS idx_project_ignore_project_id ON project_ignore_rules(project_id)`,
}
