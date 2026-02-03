package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/url"
	"os"
	"strconv"
	"time"

	"lms_v0/internal/database"
	"lms_v0/internal/redis"
	"lms_v0/k8s"
	"lms_v0/utils"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type StartRequest struct {
	Language string `json:"language"`
	LabID    string `json:"labId"`
}

var (
	svc                        database.Service
	ALLOWED_CONCURRENT_LABS, _ = strconv.ParseUint(os.Getenv("ALLOWED_CONCURRENT_LABS"), 10, 64)
)

type service struct{ db *gorm.DB }

func init() {
	// Initialize shared DB connection for quest metadata
	db := database.Connect("start_quest_handler")
	svc = &service{db: db}
}

func (s *service) Health() map[string]string { return map[string]string{"status": "up"} }
func (s *service) Close() error {
	if s.db == nil {
		return nil
	}
	sqlDB, _ := s.db.DB()
	return sqlDB.Close()
}

// Implement only the methods we need; others are stubs
func (s *service) GetQuestBySlug(slug string) (*database.Quest, error) {
	var quest database.Quest

	err := s.db.
		Preload("Category").
		Preload("TechStack").
		Preload("Topics").
		Preload("Difficulty").
		Preload("FinalTestCases").
		First(&quest, "slug = ?", slug).Error

	if err != nil {
		return nil, err
	}

	var checkpoints []database.Checkpoint
	err = s.db.
		Where("quest_id = ?", quest.ID).
		Order("order_index IS NULL ASC").
		Order("order_index ASC").
		Order("created_at ASC").
		Preload("Testcases").
		Preload("Topics").
		Preload("Hints").
		Preload("Resources").
		Find(&checkpoints).Error

	if err != nil {
		return nil, err
	}

	quest.Checkpoints = checkpoints
	if err != nil {
		return nil, err
	}
	return &quest, nil
}

func (s *service) GetAllQuests() ([]database.QuestMeta, error) {
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
func (s *service) GetAllTechnologies() []string { return nil }
func (s *service) GetAllConcepts() []string     { return nil }
func (s *service) GetAllCategories() []string   { return nil }
func (s *service) GetAllDifficulties() []string { return nil }
func (s *service) AddQuest(database.AddQuestRequest) (string, error) {
	return "", fmt.Errorf("not implemented")
}
func (s *service) DeleteQuest(string) error { return fmt.Errorf("not implemented") }

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

func (s *service) ValidateUserAndLimits(userId string) error {
	maxFreeProjects, _ := strconv.Atoi(os.Getenv("MAX_FREE_PROJECTS"))

	user := database.User{}
	fmt.Printf("DEBUG: VALIDATING USER WITH USER ID %s\n", userId)
	userUUID, err := uuid.Parse(userId)
	if err != nil {
		return fmt.Errorf("INVALID USER ID")

	}
	fmt.Printf("DEBUG: UUID USER WITH USER ID %s\n", userUUID)
	err = s.db.Where(&database.User{ID: userUUID}).First(&user).Error
	if err != nil {
		return fmt.Errorf("USER NOT FOUND")
	}
	fmt.Printf("DEBUG: FOUND USER WITH USER ID %v", user)
	projectsCount := len(user.Projects)

	if projectsCount < maxFreeProjects {
		return nil
	}

	return fmt.Errorf("USER LIMIT EXCEEDED")
}

func (s *service) findTechnology(tx *gorm.DB, name string) (*database.Technology, error) {
	var tech database.Technology
	result := tx.Where("name = ?", name).First(&tech)
	if result.Error != nil {
		return nil, result.Error
	}
	return &tech, nil
}

func (s *service) GetLabById(labId string) (*database.Lab, error, bool) {
	lab := database.Lab{}
	err := s.db.Where(&database.Lab{ID: labId}).First(&lab).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, false
		}
		return nil, err, false
	}
	return &lab, nil, true
}
func (s *service) CreateLabForUser(userId string, labId string, language string, codeLink string, questId uuid.UUID, labType string) (*database.Lab, error) {
	// Parse userId to UUID
	userUUID, err := uuid.Parse(userId)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %v", err)
	}

	// Find or create technology
	var technology *database.Technology
	technology, err = s.findTechnology(s.db, language)

	// Create lab
	lab := database.Lab{
		ID:            labId,         // Assuming ID is string
		UserID:        userUUID,      // Assuming UserID is string
		TechnologyID:  technology.ID, // Assuming TechnologyID is string
		CodeLink:      codeLink,
		CreatedAt:     time.Now(),
		LastUpdatedAt: time.Now(),
		Language:      language,
		QuestID:       &questId,
	}
	// Create in database
	if err := s.db.Create(&lab).Error; err != nil {
		return nil, fmt.Errorf("failed to create lab: %v", err)
	}

	// Update User Table with new playground

	user := database.User{}
	if err := s.db.Find(&user, userUUID).Error; err != nil {
		return nil, fmt.Errorf("failed to find user: %v", err)
	}
	if labType == "playground" {
		user.Playgrounds = append(user.Playgrounds, lab)
	} else {
		user.Projects = append(user.Projects, lab)
	}

	if err := s.db.Save(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to update user: %v", err)
	}

	return &lab, nil
}

func (s *service) GetUserProjects(userID uuid.UUID) ([]database.Lab, error) {

	return nil, nil
}

func (s *service) SyncLabProgress(ctx context.Context, lab *database.Lab, labDetails utils.LabInstanceEntry) error {
	return nil
}
func TriggerS3SyncFromRunner(labId string) error {
	u := url.URL{
		Scheme: "wss",
		Host:   fmt.Sprintf("%s.devsarena.in", labId),
		Path:   "/fs",
	}

	log.Printf("Triggering S3 Sync: Connecting to %s", u.String())
	dialer := websocket.Dialer{
		HandshakeTimeout: 5 * time.Second,
	}
	conn, _, err := dialer.Dial(u.String(), nil)
	if err != nil {
		return fmt.Errorf("failed to dial runner websocket: %w", err)
	}

	defer conn.Close()
	message := map[string]interface{}{
		"type":    "fs_sync_files_to_s3",
		"payload": map[string]string{}, // Payload can be empty as per your runner logic
	}

	// 4. Send the Message
	if err := conn.WriteJSON(message); err != nil {
		return fmt.Errorf("failed to write sync message to websocket: %w", err)
	}
	conn.SetReadDeadline(time.Now().Add(8 * time.Second))
	_, _, err = conn.ReadMessage()
	if err != nil {
		// It's okay if we time out reading the response, as long as the write succeeded.
		log.Printf("Warning: No immediate response from runner sync (might be processing): %v", err)
	}

	log.Printf("Successfully triggered S3 sync for LabID: %s", labId)
	return nil
}
func jsonHeaders() map[string]string {
	return map[string]string{
		"Content-Type":                 "application/json",
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	}
}
func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	log.Printf("end-quest: handler invoked")
	redis.InitRedis()
	utils.InitRedisUtils(redis.RedisClient, redis.Context)

	var payload StartRequest
	if err := json.Unmarshal([]byte(req.Body), &payload); err != nil {
		log.Printf("end-quest: invalid payload: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 400, Headers: jsonHeaders(), Body: `{"error":"Invalid request payload"}`}, nil
	}
	labId := payload.LabID
	language := payload.Language

	if labId == "" || language == "" {
		return events.APIGatewayProxyResponse{StatusCode: 400, Headers: jsonHeaders(), Body: `{"error":"Missing required fields"}`}, nil
	}
	log.Printf("DEBUG: TRYING TO GET THE LAB INSTANCE with ID %s", labId)
	labInstanceDetails, err := utils.RedisUtilsInstance.GetLabInstance(labId)
	if err != nil {
		log.Printf("DEBUG: FAILED TO GET THE LAB ID %v", err.Error())
		return events.APIGatewayProxyResponse{StatusCode: 404, Headers: jsonHeaders(), Body: `{"error":"Lab instance not found"}`}, nil
	}

	lab, err, labExistsInDB := svc.GetLabById(labId)

	if labExistsInDB {
		err := svc.SyncLabProgress(context.TODO(), lab, *labInstanceDetails)
		if err != nil {
			// TODO: REPORT THIS ERROR IN MIXPANEL MOVING FORWARD
			log.Printf("FAILED TO SYNC LAB PROGRESS %v\n", err.Error())
		}
		//? AN INTERNAL API TO TRIGGER RUNNER SERVICE TO SYNC DIRTY READS
		err = TriggerS3SyncFromRunner(labId)
		if err != nil {
			log.Printf("FAILED TO SYNC LAB PROGRESS FROM RUNNER %v\n", err.Error())
		}
	}
	// Initialize k8s client from in-cluster token/env
	if err := k8s.InitK8sInCluster(); err != nil {
		log.Printf("start-quest: failed to init k8s in-cluster: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Init k8s failed: %s"}`, err.Error())}, nil
	}

	params := k8s.SpinDownParams{
		LabID:     payload.LabID,
		Language:  payload.Language,
		AppName:   fmt.Sprintf("%s-%s", payload.Language, payload.LabID),
		Namespace: os.Getenv("K8S_NAMESPACE"),
	}
	if err := k8s.TearDownPodWithLanguage(params); err != nil {
		log.Printf("start-quest: provisioning failed: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Deletion failed: %s"}`, err.Error())}, nil
	}
	utils.RedisUtilsInstance.RemoveLabInstance(labId)

	resp := map[string]any{"success": true, "labId": payload.LabID, "message": "Tearing down started"}
	b, _ := json.Marshal(resp)
	return events.APIGatewayProxyResponse{StatusCode: 200, Body: string(b)}, nil
}

func main() {
	lambda.Start(handler)
}
