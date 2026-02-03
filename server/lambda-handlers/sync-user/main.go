package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"lms_v0/internal/database"
	"lms_v0/utils"
)

type SyncUserRequest struct {
	GithubID  string `json:"github_id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
	Bio       string `json:"bio"`
	GithubURL string `json:"github_url"`
	Name      string `json:"name"`
}

type SyncUserResponse struct {
	Success   bool   `json:"success"`
	UserID    string `json:"user_id"`
	IsNewUser bool   `json:"is_new_user"`
	Message   string `json:"message,omitempty"`
	Error     string `json:"error,omitempty"`
}

var svc database.Service

type service struct{ db *gorm.DB }

func init() {
	svc = &service{db: database.Connect("sync_user")}
}

func (s *service) Health() map[string]string {
	return map[string]string{"status": "up"}
}

func (s *service) Close() error {
	if s.db == nil {
		return nil
	}
	sqlDB, _ := s.db.DB()
	return sqlDB.Close()
}

// SyncUser performs an upsert (Update or Insert) for a GitHub user
func (s *service) SyncUser(req database.SyncUserRequest) (*database.User, error) {
	user := database.User{
		GithubID:  req.GithubID,
		Username:  req.Username,
		Email:     req.Email,
		AvatarURL: req.AvatarURL,
		Bio:       req.Bio,
		GithubURL: req.GithubURL,
		Name:      req.Name,
		UpdatedAt: time.Now(),
	}

	// Upsert: If GithubID exists, update fields. If not, create new.
	result := s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "github_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"username", "email", "avatar_url", "bio", "github_url", "name", "updated_at"}),
	}).Create(&user)

	if result.Error != nil {
		return nil, result.Error
	}

	// Ensure we have the ID populated if it was an update
	if user.ID == uuid.Nil {
		s.db.Where("github_id = ?", req.GithubID).First(&user)
	}

	return &user, nil
}

// Stub implementations for unused interface methods
func (s *service) GetAllQuests() ([]database.QuestMeta, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *service) GetQuestBySlug(string) (*database.Quest, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *service) GetQuestsByLanguage(string) ([]database.QuestMeta, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *service) GetAllCheckpointsForQuest(string) ([]database.Checkpoint, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *service) GetCheckpointByID(string) (*database.Checkpoint, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *service) GetAllTechnologies() []string {
	return nil
}

func (s *service) GetAllConcepts() []string {
	return nil
}

func (s *service) GetAllCategories() []string {
	return nil
}

func (s *service) GetAllDifficulties() []string {
	return nil
}

func (s *service) AddQuest(database.AddQuestRequest) (string, error) {
	return "", fmt.Errorf("not implemented")
}

func (s *service) DeleteQuest(string) error {
	return fmt.Errorf("not implemented")
}

func (s *service) ValidateUserAndLimits(string) error {
	return fmt.Errorf("not implemented")
}

func (s *service) GetLabById(string) (*database.Lab, error, bool) {
	return nil, fmt.Errorf("not implemented"), false
}

func (s *service) CreateLabForUser(string, string, string, string, uuid.UUID, string) (*database.Lab, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *service) GetUserProjects(uuid.UUID) ([]database.Lab, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *service) SyncLabProgress(context.Context, *database.Lab, utils.LabInstanceEntry) error {
	return fmt.Errorf("not implemented")
}

// Handler processes Lambda events for syncing GitHub users
func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	log.Printf("Processing sync user request")

	// 1. Verify Internal API Secret
	internalSecret := os.Getenv("INTERNAL_API_SECRET")
	authHeader := request.Headers["X-Internal-Secret"]
	if authHeader == "" {
		// Try with different casing
		authHeader = request.Headers["x-internal-secret"]
	}

	if authHeader != internalSecret || internalSecret == "" {
		log.Printf("DEBUG: Unauthorized access attempt. Header: %s, Expected: %s", authHeader, internalSecret)
		return respond(401, SyncUserResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	// 2. Parse request body
	var req SyncUserRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		log.Printf("DEBUG: Body decode error: %v", err)
		return respond(400, SyncUserResponse{
			Success: false,
			Error:   "Invalid JSON payload",
		})
	}

	// Validate required fields
	if req.GithubID == "" || req.Username == "" || req.Email == "" {
		log.Printf("DEBUG: Missing required fields")
		return respond(400, SyncUserResponse{
			Success: false,
			Error:   "Missing required fields (github_id, username, email)",
		})
	}

	log.Printf("Syncing user: %s (GitHub ID: %s)", req.Username, req.GithubID)

	// 3. Check if user exists before sync
	var existingUser database.User
	existsBefore := svc.(*service).db.Where("github_id = ?", req.GithubID).First(&existingUser).Error == nil

	// 4. Sync user to database
	dbReq := database.SyncUserRequest{
		GithubID:  req.GithubID,
		Username:  req.Username,
		Email:     req.Email,
		AvatarURL: req.AvatarURL,
		Bio:       req.Bio,
		GithubURL: req.GithubURL,
		Name:      req.Name,
	}

	user, err := svc.SyncUser(dbReq)
	if err != nil {
		log.Printf("Sync error: %v", err)
		return respond(500, SyncUserResponse{
			Success: false,
			Error:   "Failed to sync user to database",
		})
	}

	log.Printf("User synced successfully: %s (ID: %s, NewUser: %v)", user.Username, user.ID.String(), !existsBefore)

	// 5. Respond with user UUID and is_new_user flag
	return respond(200, SyncUserResponse{
		Success:   true,
		UserID:    user.ID.String(),
		IsNewUser: !existsBefore,
		Message:   "User synced successfully",
	})
}

func respond(status int, body interface{}) (events.APIGatewayProxyResponse, error) {
	var data []byte
	switch v := body.(type) {
	case string:
		data = []byte(v)
	default:
		b, err := json.Marshal(v)
		if err != nil {
			log.Printf("json encode error: %v", err)
			return events.APIGatewayProxyResponse{StatusCode: 500}, err
		}
		data = b
	}

	return events.APIGatewayProxyResponse{
		StatusCode:      status,
		Body:            string(data),
		IsBase64Encoded: false,
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
	}, nil
}

func main() {
	lambda.Start(handler)
}
