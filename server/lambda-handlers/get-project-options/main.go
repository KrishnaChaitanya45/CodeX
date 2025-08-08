package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"gorm.io/gorm"

	"lms_v0/internal/database"
)

var (
	svc database.Service
)

type service struct{ db *gorm.DB }

func init() { svc = &service{db: database.Connect("project_options")} }

func (s *service) Health() map[string]string { return map[string]string{"status": "up"} }
func (s *service) Close() error {
	if s.db == nil {
		return nil
	}
	sqlDB, _ := s.db.DB()
	return sqlDB.Close()
}

func (s *service) GetAllTechnologies() []string {
	var out []string
	s.db.Model(&database.Technology{}).Pluck("name", &out)
	return out
}
func (s *service) GetAllConcepts() []string {
	var out []string
	s.db.Model(&database.Topic{}).Pluck("name", &out)
	return out
}
func (s *service) GetAllCategories() []string {
	var out []string
	s.db.Model(&database.Category{}).Pluck("category", &out)
	return out
}
func (s *service) GetAllDifficulties() []string {
	var out []string
	s.db.Model(&database.Difficulty{}).Pluck("level", &out)
	return out
}

// stubs
func (s *service) GetAllQuests() ([]database.QuestMeta, error) {
	return nil, fmt.Errorf("not implemented")
}
func (s *service) GetQuestBySlug(string) (*database.Quest, error) {
	return nil, fmt.Errorf("not implemented")
}
func (s *service) GetAllCheckpointsForQuest(string) ([]database.Checkpoint, error) {
	return nil, fmt.Errorf("not implemented")
}
func (s *service) GetCheckpointByID(string) (*database.Checkpoint, error) {
	return nil, fmt.Errorf("not implemented")
}
func (s *service) AddQuest(database.AddQuestRequest) (string, error) {
	return "", fmt.Errorf("not implemented")
}

func respond(status int, body interface{}) (events.APIGatewayProxyResponse, error) {
	var b []byte
	switch v := body.(type) {
	case string:
		b = []byte(v)
	default:
		j, err := json.Marshal(v)
		if err != nil {
			j = []byte(`{"error":"marshal"}`)
		}
		b = j
	}
	return events.APIGatewayProxyResponse{StatusCode: status, Body: string(b), Headers: map[string]string{"Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization"}}, nil
}

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	if strings.EqualFold(req.HTTPMethod, "OPTIONS") {
		return respond(200, "{}")
	}
	options := map[string][]string{
		"technologies": sSafeSlice(svc.GetAllTechnologies()),
		"concepts":     sSafeSlice(svc.GetAllConcepts()),
		"categories":   sSafeSlice(svc.GetAllCategories()),
		"difficulties": sSafeSlice(svc.GetAllDifficulties()),
	}
	return respond(200, options)
}

func sSafeSlice(in []string) []string {
	if in == nil {
		return []string{}
	}
	return in
}

func main() { lambda.Start(handler) }
