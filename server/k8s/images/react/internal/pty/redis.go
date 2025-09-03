package main

import (
	"context"
	"encoding/json"
	"log"
	"os"

	"github.com/redis/go-redis/v9"
)

var (
	RedisClient *redis.Client
	Context     context.Context
)

type LabProgressEntry struct {
	Timestamp   int64
	Status      LabStatus
	Message     string
	ServiceName LabLogServices
}

type LabStatus string

const (
	Created LabStatus = "created"
	Booting LabStatus = "booting"
	Active  LabStatus = "active"
	Error   LabStatus = "error"
)

type LabLogServices string

const (
	FILE_SYSTEM_SERVICE LabLogServices = "file_system"
	SSL_SERVICE         LabLogServices = "ssl"
	PTY_SERVICE         LabLogServices = "pty"
	SERVER_SERVICE      LabLogServices = "server"
	S3_SERVICE          LabLogServices = "s3"
	K8S_SERVICE         LabLogServices = "k8s"
)

type LabInstanceEntry struct {
	LabID          string
	CreatedAt      int64
	Language       string
	DirtyReadPaths []string
	Status         LabStatus
	LastUpdatedAt  int64
	ProgressLogs   []LabProgressEntry
}

type LabMonitoringEntry struct {
	LabID         string
	Status        LabStatus
	LastUpdatedAt int64
	CreatedAt     int64
}

func InitRedis() {
	redisURI := os.Getenv("REDIS_URI")
	log.Printf("Connecting to Redis at: %s", redisURI)
	opt, err := redis.ParseURL(redisURI)
	if err != nil {
		panic(err)
	}

	RedisClient = redis.NewClient(opt)
	Context = context.Background()

	// Test connection
	_, err = RedisClient.Ping(Context).Result()
	if err != nil {
		panic(err)
	}

	log.Println("Redis connection established")
}

func UpdateLabInstanceProgress(labID string, progress LabProgressEntry) {
	if RedisClient == nil {
		log.Fatalf("Redis client is not initialized")
	}

	// Get existing instance
	data, err := RedisClient.HGet(Context, "lab_instances", labID).Result()
	if err != nil {
		log.Printf("Failed to fetch lab instance %s: %v", labID, err)
		return
	}

	var instance LabInstanceEntry
	err = json.Unmarshal([]byte(data), &instance)
	if err != nil {
		log.Printf("Failed to unmarshal lab instance: %v", err)
		return
	}

	// Update progress logs and status
	instance.ProgressLogs = append(instance.ProgressLogs, progress)
	instance.Status = progress.Status
	instance.LastUpdatedAt = progress.Timestamp

	// Save updated instance
	updatedData, err := json.Marshal(instance)
	if err != nil {
		log.Printf("Failed to marshal lab instance: %v", err)
		return
	}

	err = RedisClient.HSet(Context, "lab_instances", labID, updatedData).Err()
	if err != nil {
		log.Printf("Failed to update lab instance %s: %v", labID, err)
		return
	}

	log.Printf("Lab instance %s progress updated", labID)
}
