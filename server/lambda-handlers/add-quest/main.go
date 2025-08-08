package main

import (
	"context"
	"encoding/json"
	"fmt"
	"lms_v0/internal/database"
	"log"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

var svc database.Service

func init() { svc = &service{db: database.Connect("add_quest")} }

// service implements the database.Service interface
type service struct {
	db *gorm.DB
}

func (s *service) Health() map[string]string {
	return map[string]string{"status": "up"}
}

func (s *service) Close() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// Helper functions to find existing entities
func (s *service) findTechnology(name string) (*database.Technology, error) {
	var tech database.Technology
	result := s.db.Where("name = ?", name).First(&tech)
	if result.Error != nil {
		return nil, result.Error
	}
	return &tech, nil
}

func (s *service) findTopic(name string) (*database.Topic, error) {
	var t database.Topic
	result := s.db.Where("name = ?", name).First(&t)
	if result.Error != nil {
		return nil, result.Error
	}
	return &t, nil
}

func (s *service) findCategory(name string) (*database.Category, error) {
	var c database.Category
	result := s.db.Where("category = ?", name).First(&c)
	if result.Error != nil {
		return nil, result.Error
	}
	return &c, nil
}

func (s *service) findDifficulty(level string) (*database.Difficulty, error) {
	var d database.Difficulty
	result := s.db.Where("level = ?", level).First(&d)
	if result.Error != nil {
		return nil, result.Error
	}
	return &d, nil
}

// Generate slug from title
func generateSlug(title string) string {
	slug := strings.ToLower(title)
	slug = strings.ReplaceAll(slug, " ", "-")
	// Remove special characters and keep only alphanumeric and hyphens
	var result strings.Builder
	for _, r := range slug {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}
	return result.String()
}

func (s *service) AddQuest(req database.AddQuestRequest) (string, error) {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Find technology
	technologies := make([]*database.Technology, 0, len(req.Technology))
	for _, tech := range req.Technology {
		if tech == "" {
			return "", fmt.Errorf("technology cannot be empty")
		}
		if len(tech) > 50 {
			return "", fmt.Errorf("technology name too long: %s", tech)
		}
		technology, err := s.findTechnology(tech)

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				// Create new technology if it doesn't exist
				technology = &database.Technology{
					ID:   uuid.New(),
					Name: tech,
				}
				if err := tx.Create(technology).Error; err != nil {
					tx.Rollback()
					return "", fmt.Errorf("failed to create technology: %v", err)
				}
				technologies = append(technologies, technology)
			} else {
				tx.Rollback()
				return "", fmt.Errorf("failed to find technology: %v", err)
			}
		}
		technologies = append(technologies, technology)
	}

	// Find topic (concept)
	concepts := make([]*database.Topic, 0, len(req.Concept))
	for _, concept := range req.Concept {
		if concept == "" {
			return "", fmt.Errorf("concept cannot be empty")
		}

		topic, err := s.findTopic(concept)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				// Create new topic if it doesn't exist
				topic = &database.Topic{
					ID:   uuid.New(),
					Name: concept,
				}
				if err := tx.Create(topic).Error; err != nil {
					tx.Rollback()
					return "", fmt.Errorf("failed to create topic: %v", err)
				}
				concepts = append(concepts, topic)
			} else {
				tx.Rollback()
				return "", fmt.Errorf("failed to find topic: %v", err)
			}
		}
		concepts = append(concepts, topic)
	}
	// Find category
	category, err := s.findCategory(req.Category)
	if err != nil {
		tx.Rollback()
		return "", fmt.Errorf("failed to find category: %v", err)
	}

	// Find difficulty
	difficulty, err := s.findDifficulty(req.Difficulty)
	if err != nil {
		tx.Rollback()
		return "", fmt.Errorf("failed to find difficulty: %v", err)
	}
	slug := generateSlug(req.Title)
	// Create quest
	questID := uuid.New()
	quest := database.Quest{
		ID:              questID,
		Name:            req.Title,
		Slug:            slug,
		Description:     req.Description,
		BoilerPlateCode: req.BoilerplateUrl,
		Requirements:    pq.StringArray(req.Requirements), // Empty for now, can be added later
		Image:           "",                               // Empty for now, can be added later
		CategoryID:      category.ID,
		DifficultyID:    difficulty.ID,
		FinalTestCode:   "", // Empty for now, can be added later
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	// Create quest in database
	if err := tx.Create(&quest).Error; err != nil {
		tx.Rollback()
		return "", fmt.Errorf("failed to create quest: %v", err)
	}

	// Associate technology with quest
	if err := tx.Model(&quest).Association("TechStack").Append(technologies); err != nil {
		tx.Rollback()
		return "", fmt.Errorf("failed to associate technology: %v", err)
	}

	// Associate topic with quest
	if err := tx.Model(&quest).Association("Topics").Append(concepts); err != nil {
		tx.Rollback()
		return "", fmt.Errorf("failed to associate topic: %v", err)
	}

	// Create checkpoints
	for _, cp := range req.Checkpoints {
		checkpoint := database.Checkpoint{
			ID:              uuid.New(),
			Title:           cp.Title,
			Description:     cp.Description,
			Requirements:    pq.StringArray(cp.Requirements),
			TestingCode:     cp.TestFileUrl,
			BoilerPlateCode: "", // Empty for now
			QuestID:         questID,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}

		if err := tx.Create(&checkpoint).Error; err != nil {
			tx.Rollback()
			return "", fmt.Errorf("failed to create checkpoint: %v", err)
		}

		// Associate topic with checkpoint
		if err := tx.Model(&checkpoint).Association("Topics").Append(concepts); err != nil {
			tx.Rollback()
			return "", fmt.Errorf("failed to associate topic with checkpoint: %v", err)
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return "", fmt.Errorf("failed to commit transaction: %v", err)
	}

	return slug, nil
}

// The following interface methods are required by database.Service but unused here
func (s *service) GetAllQuests() ([]database.QuestMeta, error) {
	return nil, fmt.Errorf("not implemented in this handler")
}

func (s *service) GetQuestBySlug(slug string) (*database.Quest, error) {
	return nil, fmt.Errorf("not implemented in this handler")
}

func (s *service) GetAllCheckpointsForQuest(questID string) ([]database.Checkpoint, error) {
	return nil, fmt.Errorf("not implemented in this handler")
}

func (s *service) GetCheckpointByID(id string) (*database.Checkpoint, error) {
	return nil, fmt.Errorf("not implemented in this handler")
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

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// Parse request body
	var payload database.AddQuestRequest
	if err := json.Unmarshal([]byte(req.Body), &payload); err != nil {
		log.Printf("Error parsing request body: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers: map[string]string{
				"Content-Type":                 "application/json",
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
			Body: `{"error":"Invalid request payload"}`,
		}, nil
	}

	// Validate required fields
	if payload.Title == "" || payload.Description == "" ||
		payload.Category == "" || payload.Difficulty == "" {
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers: map[string]string{
				"Content-Type":                 "application/json",
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
			Body: `{"error":"Missing required fields"}`,
		}, nil
	}

	// Add quest to database
	slug, err := svc.AddQuest(payload)
	if err != nil {
		log.Printf("Error adding quest: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers: map[string]string{
				"Content-Type":                 "application/json",
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
			Body: fmt.Sprintf(`{"error":"Failed to add quest: %s"}`, err.Error()),
		}, nil
	}

	// Return success response
	response := map[string]any{"success": true, slug: slug, "message": "Quest added successfully"}
	bodyBytes, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshaling response: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers: map[string]string{
				"Content-Type":                 "application/json",
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
			Body: `{"error":"Internal server error"}`,
		}, nil
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
		Body: string(bodyBytes),
	}, nil
}

func main() {
	lambda.Start(handler)
}
