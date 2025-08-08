package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"lms_v0/internal/database"

	"github.com/julienschmidt/httprouter"
)

func (s *Server) RegisterRoutes() http.Handler {
	r := httprouter.New()

	corsWrapper := s.corsMiddleware(r)

	r.HandlerFunc(http.MethodGet, "/", s.HelloWorldHandler)

	r.HandlerFunc(http.MethodGet, "/health", s.healthHandler)

	r.HandlerFunc(http.MethodGet, "/v0/quests", s.GetAllQuests)
	r.HandlerFunc(http.MethodGet, "/v0/quests/:questSlug", s.GetQuestsHandler)

	// Project management endpoints
	r.HandlerFunc(http.MethodGet, "/v0/project/options", s.GetProjectOptions)
	r.HandlerFunc(http.MethodPost, "/v0/project/add", s.AddProjectHandler)
	r.HandlerFunc(http.MethodPost, "/v0/quests/add", s.AddProjectHandler) // Use same handler
	// Also support non-v0 prefix
	r.HandlerFunc(http.MethodGet, "/project/options", s.GetProjectOptions)
	r.HandlerFunc(http.MethodPost, "/project/add", s.AddProjectHandler)

	return corsWrapper
}

// CORS middleware
func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*") // Use "*" for all origins, or replace with specific origins
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token")
		w.Header().Set("Access-Control-Allow-Credentials", "false") // Set to "true" if credentials are needed

		// Handle preflight OPTIONS requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) HelloWorldHandler(w http.ResponseWriter, r *http.Request) {
	resp := make(map[string]string)
	resp["message"] = "Hello World"

	jsonResp, err := json.Marshal(resp)
	if err != nil {
		log.Fatalf("error handling JSON marshal. Err: %v", err)
	}

	_, _ = w.Write(jsonResp)
}

func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
	jsonResp, err := json.Marshal(s.db.Health())

	if err != nil {
		log.Fatalf("error handling JSON marshal. Err: %v", err)
	}

	_, _ = w.Write(jsonResp)
}

func (s *Server) GetQuestsHandler(w http.ResponseWriter, r *http.Request) {
	// Fetch full quest details including code URLs, checkpoints, and test cases
	params := httprouter.ParamsFromContext(r.Context())
	questSlug := params.ByName("questSlug")
	quest, err := s.db.GetQuestBySlug(questSlug)
	if err != nil {
		http.Error(w, "Quest not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(quest); err != nil {
		log.Printf("error encoding quest response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

func (s *Server) GetAllQuests(w http.ResponseWriter, r *http.Request) {
	quests, err := s.db.GetAllQuests()
	if err != nil {
		http.Error(w, "Error fetching quests", http.StatusInternalServerError)
		return
	}
	jsonResp, err := json.Marshal(quests)
	if err != nil {
		log.Fatalf("error handling JSON marshal. Err: %v", err)
	}
	_, _ = w.Write(jsonResp)
}

// GetProjectOptions returns available dropdown options for creating a project
func (s *Server) GetProjectOptions(w http.ResponseWriter, r *http.Request) {
	technologies := s.db.GetAllTechnologies()
	concepts := s.db.GetAllConcepts()
	categories := s.db.GetAllCategories()
	difficulties := s.db.GetAllDifficulties()

	options := map[string][]string{
		"technologies": technologies,
		"concepts":     concepts,
		"categories":   categories,
		"difficulties": difficulties,
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(options)
}

// AddProjectHandler accepts new project data and saves it to the database
func (s *Server) AddProjectHandler(w http.ResponseWriter, r *http.Request) {
	var payload database.AddQuestRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if payload.Title == "" || payload.Description == "" ||
		payload.Category == "" || payload.Difficulty == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Add quest to database
	slug, err := s.db.AddQuest(payload)
	if err != nil {
		log.Printf("Error adding quest: %v", err)
		http.Error(w, fmt.Sprintf("Failed to add quest: %v", err), http.StatusInternalServerError)
		return
	}
	response := map[string]any{
		"message": "Quest added successfully",
		"slug":    slug,
		"success": true,
	}

	w.Header().Set("Content-Type", "application/json")
	log.Printf("Quest added successfully with slug: %s and %v", slug, response)
	_ = json.NewEncoder(w).Encode(response)
}
