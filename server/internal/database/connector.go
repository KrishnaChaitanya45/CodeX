package database

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"sync"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	connOnce sync.Once
	sharedDB *gorm.DB
)

// Connect returns a singleton *gorm.DB configured for Lambda + PgBouncer.
// It forces simple protocol and disables pgx statement cache to avoid
// prepared statement errors against a transaction pooler.
// appName is appended as application_name (if missing) for observability.
func Connect(appName string) *gorm.DB {
	connOnce.Do(func() {
		dsn := os.Getenv("PRODUCTION_DB_DSN")
		if dsn == "" {
			log.Fatal("PRODUCTION_DB_DSN not set")
		}
		u, err := url.Parse(dsn)
		if err != nil {
			log.Fatalf("invalid DSN: %v", err)
		}
		q := u.Query()
		q.Set("prefer_simple_protocol", "true")
		q.Set("statement_cache_capacity", "0")
		q.Set("pgbouncer", "true")
		if q.Get("sslmode") == "" {
			q.Set("sslmode", "require")
		}
		if appName == "" {
			appName = "lambda"
		}
		if q.Get("application_name") == "" {
			q.Set("application_name", fmt.Sprintf("%s_%d", appName, time.Now().Unix()))
		}
		u.RawQuery = q.Encode()
		dialector := postgres.New(postgres.Config{DSN: u.String(), PreferSimpleProtocol: true})
		cfg := &gorm.Config{PrepareStmt: false, Logger: logger.Default.LogMode(logger.Silent)}
		db, err := gorm.Open(dialector, cfg)
		if err != nil {
			log.Fatalf("db open error: %v", err)
		}
		if sqlDB, err2 := db.DB(); err2 == nil {
			sqlDB.SetMaxOpenConns(1)
			sqlDB.SetMaxIdleConns(1)
			sqlDB.SetConnMaxLifetime(2 * time.Minute)
		}
		sharedDB = db
	})
	return sharedDB
}
