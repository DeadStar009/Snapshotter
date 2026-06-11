package logger

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
)

// Logger is a simple structured file + stderr logger.
type Logger struct {
	file   *os.File
	logger *log.Logger
}

// New creates a Logger that writes to a daily log file in logDir.
func New(logDir string) *Logger {
	filename := fmt.Sprintf("snapshotter-%s.log", time.Now().Format("2006-01-02"))
	path := filepath.Join(logDir, filename)

	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		// Fall back to stderr-only logging
		return &Logger{
			logger: log.New(os.Stderr, "", log.LstdFlags),
		}
	}

	return &Logger{
		file:   f,
		logger: log.New(f, "", log.LstdFlags),
	}
}

func (l *Logger) Info(format string, args ...interface{}) {
	l.write("INFO", format, args...)
}

func (l *Logger) Warn(format string, args ...interface{}) {
	l.write("WARN", format, args...)
}

func (l *Logger) Error(format string, args ...interface{}) {
	l.write("ERROR", format, args...)
}

func (l *Logger) write(level, format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	l.logger.Printf("[%s] %s", level, msg)
	if level == "ERROR" || level == "WARN" {
		fmt.Fprintf(os.Stderr, "[%s] %s\n", level, msg)
	}
}

func (l *Logger) Close() {
	if l.file != nil {
		_ = l.file.Close()
	}
}
