package db

import (
	"context"
	"fmt"
	"log"

	"notion-backend/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Database struct {
	Pg    *pgxpool.Pool
	Redis *redis.Client
}

func InitDB(cfg *config.Config) (*Database, error) {
	// Initialize Postgres
	ctx := context.Background()
	
	pgConf, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse database url: %w", err)
	}

	pgPool, err := pgxpool.NewWithConfig(ctx, pgConf)
	if err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}
	
	// Check PG connection
	if err := pgPool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}
	log.Println("Connected to PostgreSQL")

	// Initialize Redis
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: "", // no password set
		DB:       0,  // use default DB
	})

	// Check Redis connection
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}
	log.Println("Connected to Redis")

	return &Database{
		Pg:    pgPool,
		Redis: rdb,
	}, nil
}

func (db *Database) Close() {
	db.Pg.Close()
	db.Redis.Close()
}
