package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"gorm.io/gorm"

	"lms_v0/internal/database"
)

var svc database.Service

type service struct{ db *gorm.DB }

func init() { svc = &service{db: database.Connect("get_all_quests")} }

func (s *service) DeleteQuest(string) error { return fmt.Errorf("not implemented") }

func (s *service) GetQuestsByLanguage(string) ([]database.QuestMeta, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *service) Health() map[string]string { return map[string]string{"status": "up"} }
func (s *service) Close() error {
	if s.db == nil {
		return nil
	}
	sqlDB, _ := s.db.DB()
	return sqlDB.Close()
}

func (s *service) GetAllQuests() ([]database.QuestMeta, error) {
	var quests []database.Quest
	err := s.db.Preload("Category").
		Preload("TechStack").
		Preload("Topics").
		Preload("Difficulty").
		Find(&quests).Error
	if err != nil {
		return nil, err
	}
	metas := make([]database.QuestMeta, len(quests))
	for i, q := range quests {
		metas[i] = database.QuestMeta{
			ID:          q.ID,
			Name:        q.Name,
			Slug:        q.Slug,
			Description: q.Description,
			Image:       q.Image,
			Category:    q.Category,
			TechStack:   q.TechStack,
			Topics:      q.Topics,
			Difficulty:  q.Difficulty,
			CreatedAt:   q.CreatedAt,
			UpdatedAt:   q.UpdatedAt,
		}
	}
	return metas, nil
}

// stubs for unused interface methods
func (s *service) GetQuestBySlug(string) (*database.Quest, error) {
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

func respond(status int, body interface{}) (events.APIGatewayProxyResponse, error) {
	var data []byte
	switch v := body.(type) {
	case string:
		data = []byte(v)
	default:
		b, err := json.Marshal(v)
		if err != nil {
			b = []byte(`{"error":"marshal"}`)
		}
		data = b
	}
	return events.APIGatewayProxyResponse{
		StatusCode: status,
		Body:       string(data),
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type,Authorization",
		},
	}, nil
}

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	if strings.EqualFold(req.HTTPMethod, "OPTIONS") {
		return respond(200, "{}")
	}
	quests, err := svc.GetAllQuests()
	if err != nil {
		log.Printf("GetAllQuests error: %v", err)
		return respond(500, map[string]string{"error": "internal"})
	}
	return respond(200, quests)
}

func main() {
	lambda.Start(handler)
}
