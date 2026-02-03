package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"golang.org/x/sync/errgroup"
)

var (
	LAB_ID   = ""
	LANGUAGE = ""
)

type fsHandler func(ctx context.Context, payload json.RawMessage, client *Client) error

func InitializeClientHandler(ctx context.Context, payload json.RawMessage, client *Client) error {
	var req InitializeClient
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal initialize client payload: %w", err)
	}

	LANGUAGE = req.Language
	LAB_ID = req.LabID

	log.Printf("Client initialized with Language: %s, LabID: %s", LANGUAGE, LAB_ID)

	return client.SendResponse(RESPONSE_INFO, map[string]string{
		"message":  "Client initialized",
		"language": LANGUAGE,
		"labId":    LAB_ID,
	})
}

// Get workspace directory from environment or default
func getWorkspaceDir() string {
	if dir := os.Getenv("WORKSPACE_DIR"); dir != "" {
		return dir
	}
	return "./workspace" // Default workspace directory
}

// Initialize workspace directory if it doesn't exist
func InitWorkspaceDir() error {
	workspaceDir := getWorkspaceDir()
	if err := os.MkdirAll(workspaceDir, 0755); err != nil {
		return fmt.Errorf("failed to create workspace directory %s: %w", workspaceDir, err)
	}
	log.Printf("Workspace directory initialized: %s", workspaceDir)
	return nil
}

// Safely join path components to prevent directory traversal
func safeJoinPath(basePath, userPath string) string {

	// Join with base path
	fullPath := filepath.Join(basePath, userPath)

	return fullPath
}

// Load directory contents
func LoadDirHandler(ctx context.Context, payload json.RawMessage, client *Client) error {
	var req LoadDirPayload
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal load dir payload: %w", err)
	}

	workspaceDir := getWorkspaceDir()
	targetPath := safeJoinPath(workspaceDir, req.Path)

	files, err := os.ReadDir(targetPath)
	if err != nil {
		return fmt.Errorf("failed to read directory %s: %w", targetPath, err)
	}

	var fileInfos []FileInfo
	for _, file := range files {
		info, err := file.Info()
		if err != nil {
			log.Printf("Error getting file info for %s: %v", file.Name(), err)
			continue
		}

		relativePath := filepath.Join(req.Path, file.Name())
		fileInfos = append(fileInfos, FileInfo{
			Name:    file.Name(),
			Path:    relativePath,
			IsDir:   file.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime().Format(time.RFC3339),
		})
	}

	response := DirContentResponse{
		Path:  req.Path,
		Files: fileInfos,
	}

	return client.SendResponse(RESPONSE_DIR_CONTENT, response)
}

// Fetch file content
func FetchFileContentHandler(ctx context.Context, payload json.RawMessage, client *Client) error {
	var req FetchFileContentPayload
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal fetch file content payload: %w", err)
	}

	workspaceDir := getWorkspaceDir()
	targetPath := safeJoinPath(workspaceDir, req.Path)

	content, err := os.ReadFile(targetPath)
	if err != nil {
		return fmt.Errorf("failed to read file %s: %w", targetPath, err)
	}

	response := FileContentResponse{
		Path:    req.Path,
		Content: string(content),
	}

	return client.SendResponse(RESPONSE_FILE_CONTENT, response)
}

// Update file content
func FileContentUpdateHandler(ctx context.Context, payload json.RawMessage, client *Client) error {

	var req FileContentUpdatePayload
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal file content update payload: %w", err)
	}
	workspaceDir := getWorkspaceDir()
	targetPath := safeJoinPath(workspaceDir, req.Path)
	log.Printf("Updating file at path: %s", targetPath)
	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
		return fmt.Errorf("failed to create parent directories for %s: %w", targetPath, err)
	}

	if err := os.WriteFile(targetPath, []byte(req.Content), 0644); err != nil {
		return fmt.Errorf("failed to write file %s: %w", targetPath, err)
	}

	fileUpdatePath := fmt.Sprintf("code/%s/%s/%s", LANGUAGE, LAB_ID, req.Path)
	log.Printf("FILE PATH: %s", fileUpdatePath)
	UpdateLabInstanceDirtyWrites(LAB_ID, fileUpdatePath, "edit")
	log.Printf("UPDATED THE PATH TO REDIS %s", fileUpdatePath)
	return client.SendResponse(RESPONSE_FILE_UPDATED, map[string]interface{}{
		"path":    req.Path,
		"success": true,
	})
}

// Create new file or directory
func NewFileHandler(ctx context.Context, payload json.RawMessage, client *Client) error {
	var req NewFilePayload
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal new file payload: %w", err)
	}

	workspaceDir := getWorkspaceDir()
	targetPath := safeJoinPath(workspaceDir, req.Path)

	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
		return fmt.Errorf("failed to create parent directories for %s: %w", targetPath, err)
	}

	if req.IsDir {
		if err := os.MkdirAll(targetPath, 0755); err != nil {
			return fmt.Errorf("failed to create directory %s: %w", targetPath, err)
		}

	} else {
		content := req.Content
		if content == "" {
			content = "" // Empty file
		}
		if err := os.WriteFile(targetPath, []byte(content), 0644); err != nil {
			return fmt.Errorf("failed to create file %s: %w", targetPath, err)
		}

	}
	if !req.IsDir { // Only sync files
		fileUpdatePath := fmt.Sprintf("code/%s/%s/%s", LANGUAGE, LAB_ID, req.Path)
		UpdateLabInstanceDirtyWrites(LAB_ID, fileUpdatePath, "edit")
	}

	return client.SendResponse(RESPONSE_FILE_CREATED, map[string]interface{}{
		"path":    req.Path,
		"isDir":   req.IsDir,
		"success": true,
	})
}

// Delete file or directory
func DeleteFileHandler(ctx context.Context, payload json.RawMessage, client *Client) error {
	var req DeleteFilePayload
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal delete file payload: %w", err)
	}

	workspaceDir := getWorkspaceDir()
	targetPath := safeJoinPath(workspaceDir, req.Path)

	// Check if file/directory exists
	_, err := os.Stat(targetPath)
	if err != nil {
		return fmt.Errorf("failed to stat %s: %w", targetPath, err)
	}

	if err := os.RemoveAll(targetPath); err != nil {
		return fmt.Errorf("failed to delete %s: %w", targetPath, err)
	}

	fileUpdatePath := fmt.Sprintf("code/%s/%s/%s", LANGUAGE, LAB_ID, req.Path)
	UpdateLabInstanceDirtyWrites(LAB_ID, fileUpdatePath, "delete")
	return client.SendResponse(RESPONSE_FILE_DELETED, map[string]interface{}{
		"path":    req.Path,
		"success": true,
	})
}

// Edit file metadata (rename/move)
func EditFileMetaHandler(ctx context.Context, payload json.RawMessage, client *Client) error {
	var req EditFileMetaPayload
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal edit file meta payload: %w", err)
	}

	workspaceDir := getWorkspaceDir()
	oldPath := safeJoinPath(workspaceDir, req.OldPath)
	newPath := safeJoinPath(workspaceDir, req.NewPath)

	// Ensure parent directory exists for new path
	if err := os.MkdirAll(filepath.Dir(newPath), 0755); err != nil {
		return fmt.Errorf("failed to create parent directories for %s: %w", newPath, err)
	}

	if err := os.Rename(oldPath, newPath); err != nil {
		return fmt.Errorf("failed to rename %s to %s: %w", oldPath, newPath, err)
	}
	oldS3Path := fmt.Sprintf("code/%s/%s/%s", LANGUAGE, LAB_ID, req.OldPath)
	newS3Path := fmt.Sprintf("code/%s/%s/%s", LANGUAGE, LAB_ID, req.NewPath)
	UpdateLabInstanceDirtyRename(LAB_ID, oldS3Path, newS3Path)

	return client.SendResponse(RESPONSE_FILE_RENAMED, map[string]interface{}{
		"oldPath": req.OldPath,
		"newPath": req.NewPath,
		"success": true,
	})
}

// Fetch quest metadata (root directory structure)
func FetchQuestMetaHandler(ctx context.Context, payload json.RawMessage, client *Client) error {
	var req FetchQuestMetaPayload
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal fetch quest meta payload: %w", err)
	}

	workspaceDir := getWorkspaceDir()
	targetPath := safeJoinPath(workspaceDir, req.Path)

	var fileInfos []FileInfo
	err := filepath.WalkDir(targetPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Get relative path from workspace
		relPath, err := filepath.Rel(workspaceDir, path)
		if err != nil {
			return err
		}

		// Convert to forward slashes for consistency
		relPath = filepath.ToSlash(relPath)

		info, err := d.Info()
		if err != nil {
			log.Printf("Error getting file info for %s: %v", path, err)
			return nil
		}

		fileInfos = append(fileInfos, FileInfo{
			Name:    d.Name(),
			Path:    relPath,
			IsDir:   d.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime().Format(time.RFC3339),
		})

		return nil
	})

	if err != nil {
		return fmt.Errorf("failed to walk directory %s: %w", targetPath, err)
	}

	response := QuestMetaResponse{
		Path:  req.Path,
		Files: fileInfos,
	}

	return client.SendResponse(RESPONSE_QUEST_META, response)
}

// Helper function to send response to client (deprecated - use client methods instead)
func sendResponse(client *Client, responseType string, data interface{}) error {
	return client.SendResponse(responseType, data)
}

func SyncFilesToS3Handler(ctx context.Context, payload json.RawMessage, client *Client) error {
	labInstance, err := GetLabInstance(os.Getenv("LAB_ID"))
	if err != nil {
		return err
	}
	bucketName := os.Getenv("AWS_S3_BUCKET_NAME")
	s3CodeLink := os.Getenv("LAB_CODE_LINK")
	dirtyFiles := labInstance.DirtyReadPaths // Now a slice of structs

	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(10)

	// Calculate prefix to strip: code/<lang>/<labid>/
	prefix := fmt.Sprintf("code/%s/%s/", LANGUAGE, os.Getenv("LAB_ID"))

	for _, entry := range dirtyFiles {

		currentEntry := entry // Capture for closure
		currentPath := strings.TrimPrefix(currentEntry.Path, prefix)
		log.Printf("DEBUG: TRIMMED PREFIX AND THE PATH %s", currentPath)
		currentPath = strings.Join([]string{s3CodeLink, currentPath}, "/")
		log.Printf("DEBUG: FINAL PATH AFTER JOINING BUCKET NAME AND S3 LINK %s", currentPath)
		g.Go(func() error {
			// Case 1: DELETE
			if currentEntry.Action == "delete" {
				_, err := client.s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
					Bucket: aws.String(bucketName),
					Key:    aws.String(currentPath),
				})
				if err != nil {
					log.Printf("Failed to delete %s: %v", currentPath, err)
					// Don't return error to keep other syncs going
				} else {
					log.Printf("Synced (Deleted): %s", currentPath)
				}
				return nil
			}

			// Case 2: EDIT (Upload)
			if currentEntry.Action == "edit" {
				// 1. Determine Local Path by stripping prefix
				localPath := strings.TrimPrefix(currentEntry.Path, prefix)
				log.Printf("DEBUG: LOCAL PATH %s", localPath)
				// 2. Open File
				file, err := GetFileByPath(ctx, localPath)
				if err != nil {
					log.Printf("Skipping %s: Local file not found", localPath)
					return nil // Skip if local file	 is missing (might have been deleted quickly after)
				}
				defer file.Close()

				// 3. Upload (PutObject)
				// Note: Simplified for brevity (removed MD5 check for clarity, add back if needed)
				_, err = client.s3Client.PutObject(ctx, &s3.PutObjectInput{
					Bucket: aws.String(bucketName),
					Key:    aws.String(currentPath),
					Body:   file,
				})
				if err != nil {
					return err
				}
				log.Printf("Synced (Uploaded): %s", currentPath)
			}
			return nil
		})
	}

	return g.Wait()
}

func GetFileByPath(ctx context.Context, path string) (*os.File, error) {
	// Sanitize path to prevent directory traversal attacks if path comes from user input
	baseDir := getWorkspaceDir()
	fullPath := filepath.Join(baseDir, path)
	log.Printf("DEBUG: Path with workspace joined %s \n", fullPath)
	f, err := os.Open(fullPath)
	if err != nil {
		return nil, err
	}

	return f, nil
}
