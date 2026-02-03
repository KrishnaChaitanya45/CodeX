package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"lms_v0/internal/aws"
	"lms_v0/internal/database"
	"lms_v0/internal/redis"
	"lms_v0/k8s"
	"lms_v0/utils"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type StartRequest struct {
	Language string `json:"language"`
	LabID    string `json:"labId"`
	UserId   string `json:"userId"`
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

func jsonHeaders() map[string]string {
	return map[string]string{
		"Content-Type":                 "application/json",
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	}
}
func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	log.Printf("start-quest: handler invoked")

	// Initialize AWS and Redis clients
	aws.InitAWS()
	redis.InitRedis()
	utils.InitRedisUtils(redis.RedisClient, redis.Context)

	var payload StartRequest
	if err := json.Unmarshal([]byte(req.Body), &payload); err != nil {
		log.Printf("start-quest: invalid payload: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 400, Headers: jsonHeaders(), Body: `{"error":"Invalid request payload"}`}, nil
	}

	if payload.LabID == "" || payload.Language == "" {
		return events.APIGatewayProxyResponse{StatusCode: 400, Headers: jsonHeaders(), Body: `{"error":"Missing required fields"}`}, nil
	}
	utils.RedisUtilsInstance.CreateLabMonitoringQueueIfNotExists()
	utils.RedisUtilsInstance.CreateLabProgressQueueIfNotExists()
	count, err := utils.RedisUtilsInstance.GetNumberOfActiveLabInstances()
	if err != nil {
		log.Printf("start-quest: failed to get number of active lab instances: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Failed to get number of active lab instances: %s"}`, err.Error())}, nil
	}
	if count > ALLOWED_CONCURRENT_LABS {
		response := map[string]interface{}{
			"error":   "Exceeded maximum concurrent labs",
			"allowed": ALLOWED_CONCURRENT_LABS,
			"current": count,
		}
		jsonResp, err := json.Marshal(response)
		if err != nil {
			log.Printf("start-quest: failed to marshal JSON response: %v", err)
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Failed to marshal JSON response: %s"}`, err.Error())}, nil
		}

		return events.APIGatewayProxyResponse{StatusCode: 429, Body: string(jsonResp)}, nil
	}
	language := payload.Language
	labId := payload.LabID
	userId := payload.UserId
	if userId != "" {

		err := svc.ValidateUserAndLimits(userId)
		if err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Init k8s failed: %s"}`, err.Error())}, nil
		}
	}
	fmt.Printf("DEBUG TRYING GET THE LAB ID %s\n", labId)
	lab, err, labExists := svc.GetLabById(labId)
	if err != nil {
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Failed to get lab by ID: %s"}`, err.Error())}, nil
	}

	fmt.Printf("DEBUG LAB EXISTS %v\n", labExists)

	sourceKey := fmt.Sprintf("boilerplate/%s", language)
	destinationKey := fmt.Sprintf("code/%s/%s", language, labId)

	if userId != "" {
		destinationKey = fmt.Sprintf("code/%s/playgrounds/%s/%s", userId, language, labId)
	}

	codeLink := sourceKey

	if userId != "" && !labExists {
		codeLink = destinationKey
	} else if labExists {
		log.Printf("DEBUG: LAB EXISTS WITH CODE LINK %s", lab.CodeLink)
		codeLink = lab.CodeLink
	}
	if !labExists && userId != "" {
		fmt.Printf("DEBUG: LAB NOT FOUND< CREATING LAB AND ADDING IT TO USER WITH ID %s and codeLink %s\n", userId, codeLink)
		lab, err = svc.CreateLabForUser(userId, labId, language, codeLink, uuid.UUID{}, "playground")
		if err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Failed to create lab for user: %s"}`, err.Error())}, nil
		}
	}
	log.Printf("Copying content from %s to %s", sourceKey, destinationKey)
	// Initialize k8s client from in-cluster token/env
	if err := k8s.InitK8sInCluster(); err != nil {
		log.Printf("start-quest: failed to init k8s in-cluster: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Init k8s failed: %s"}`, err.Error())}, nil
	}

	labInstance := utils.LabInstanceEntry{
		Language:       language,
		LabID:          labId,
		UserId:         userId,
		CodeLink:       codeLink,
		CreatedAt:      time.Now().Unix(),
		Status:         utils.Created,
		LastUpdatedAt:  time.Now().Unix(),
		ProgressLogs:   []utils.LabProgressEntry{},
		DirtyReadPaths: []utils.DirtyFileEntry{},
	}
	utils.RedisUtilsInstance.CreateLabInstance(labInstance)
	if !labExists {
		err = utils.CopyS3Folder(sourceKey, destinationKey)
		if err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Failed to copy content to S3: %s"}`, err.Error())}, nil
		}
	}

	log.Printf("DEBUG: SPINNING UP LAB WITH CODE LINK %s\n", codeLink)

	params := k8s.SpinUpParams{
		LabID:                 labId,
		Language:              language,
		AppName:               fmt.Sprintf("%s-%s", language, labId),
		S3Bucket:              os.Getenv("AWS_S3_BUCKET_NAME"),
		S3Key:                 codeLink,
		CodeLink:              codeLink,
		Namespace:             os.Getenv("K8S_NAMESPACE"),
		ShouldCreateNamespace: false,
	}
	if err := k8s.SpinUpPodWithLanguage(params); err != nil {
		log.Printf("start-quest: provisioning failed: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Provisioning failed: %s"}`, err.Error())}, nil
	}

	resp := map[string]any{"success": true, "labId": labId, "message": "Provisioning started"}
	b, _ := json.Marshal(resp)
	return events.APIGatewayProxyResponse{StatusCode: 200, Body: string(b)}, nil
}

func main() {
	lambda.Start(handler)
}
