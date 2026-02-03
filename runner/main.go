package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var (
	S3_UPDATE_BATCH_SIZE = 5
	S3_MAX_RETRIES       = 3
	PING_INTERVAL        = 10 * time.Second
	PONG_WAIT_DURATION   = PING_INTERVAL * 2
	READ_LIMIT           = int64(1024 * 1024 * 5) // 5 MB
)

func main() {
	ctx := context.Background()

	// Initialize Redis first
	InitRedis()

	if err := InitWorkspaceDir(); err != nil {
		log.Fatal("Failed to initialize workspace:", err)
	}

	fsMux := http.NewServeMux()
	manager := NewFSManager(ctx)
	manager.setupHandlers()
	fsMux.HandleFunc("/fs", manager.serveFS)
	fsMux.HandleFunc("/fs/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	log.Println("File system service starting on :8081")
	labId := os.Getenv("LAB_ID")
	UpdateLabInstanceProgress(labId, LabProgressEntry{
		Timestamp:   time.Now().Unix(),
		Status:      Active,
		Message:     "File System Service Started",
		ServiceName: FILE_SYSTEM_SERVICE,
	})

	if err := http.ListenAndServe(":8081", fsMux); err != nil {
		log.Fatal("File system server error: ", err)
	}
}

func InitS3Client() (*s3.Client, error) {
	r2AccessKey := os.Getenv("AWS_ACCESS_KEY_ID")
	r2SecretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	r2AccountId := os.Getenv("R2_ACCOUNT_ID")

	r2Endpoint := "https://" + r2AccountId + ".r2.cloudflarestorage.com"
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			r2AccessKey,
			r2SecretKey,
			"",
		)),
		config.WithRegion("auto"),
		config.WithBaseEndpoint(r2Endpoint),
	)
	if err != nil {
		log.Printf("FAILED TO INITIALIZE S3 CLIENT: %v", err)
		return nil, err
	}
	// Create base S3 client
	svc := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	log.Printf("DEBUG: s3 client initialized\n")

	return svc, nil
}
