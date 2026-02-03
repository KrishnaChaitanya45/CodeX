package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"lms_v0/internal/database"
	"lms_v0/k8s"
	"lms_v0/utils"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/julienschmidt/httprouter"
)

var (
	ALLOWED_CONCURRENT_LABS = 5
)

func (s *Server) RegisterRoutes() http.Handler {
	r := httprouter.New()

	corsWrapper := s.corsMiddleware(r)

	r.HandlerFunc(http.MethodGet, "/", s.HelloWorldHandler)

	r.HandlerFunc(http.MethodGet, "/health", s.healthHandler)

	r.HandlerFunc(http.MethodGet, "/v0/quests", s.GetAllQuests)
	r.HandlerFunc(http.MethodGet, "/v0/quests/:questSlug", s.GetQuestsHandler)

	// Experimental projects endpoints
	r.HandlerFunc(http.MethodGet, "/v1/experimental/projects", s.GetExperimentalProjectsLanguages)
	r.HandlerFunc(http.MethodGet, "/v1/experimental/projects/:language", s.GetExperimentalProjectsByLanguage)
	r.HandlerFunc(http.MethodGet, "/v1/experimental/quest/:questSlug", s.GetExperimentalQuestMetadata)
	r.HandlerFunc(http.MethodGet, "/v1/experimental/quest/:questSlug/checkpoints", s.GetQuestCheckpoints)
	r.HandlerFunc(http.MethodGet, "/v1/test-results/:labId", s.GetTestResults)

	// Project management endpoints
	r.HandlerFunc(http.MethodGet, "/v0/project/options", s.GetProjectOptions)
	r.HandlerFunc(http.MethodPost, "/v0/project/add", s.AddProjectHandler)
	r.HandlerFunc(http.MethodDelete, "/v0/project/delete", s.DeleteProjectHandler)
	r.HandlerFunc(http.MethodPost, "/v0/quests/add", s.AddProjectHandler) // Use same handler
	// Also support non-v0 prefix
	r.HandlerFunc(http.MethodGet, "/project/options", s.GetProjectOptions)
	r.HandlerFunc(http.MethodPost, "/project/add", s.AddProjectHandler)
	r.HandlerFunc(http.MethodDelete, "/project/delete", s.DeleteProjectHandler)

	r.HandlerFunc(http.MethodPost, "/v1/start/playground", s.StartLabHandler)
	r.HandlerFunc(http.MethodPost, "/v1/start/quest", s.StartQuestHandler)
	r.HandlerFunc(http.MethodPost, "/v1/end/quest", s.EndLabHandler)
	r.HandlerFunc(http.MethodDelete, "/v1/delete/quest", s.DeleteLabHandler)
	r.HandlerFunc(http.MethodPost, "/auth/github/sync", s.SyncUserHandler)

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

func (s *Server) StartLabHandler(w http.ResponseWriter, r *http.Request) {
	utils.RedisUtilsInstance.CreateLabProgressQueueIfNotExists()
	utils.RedisUtilsInstance.CreateLabMonitoringQueueIfNotExists()
	count, err := utils.RedisUtilsInstance.GetNumberOfActiveLabInstances()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get number of active lab instances: %v", err), http.StatusInternalServerError)
		return
	}
	if count > uint64(ALLOWED_CONCURRENT_LABS) {
		response := map[string]interface{}{
			"error":   "Exceeded maximum concurrent labs",
			"allowed": ALLOWED_CONCURRENT_LABS,
			"current": count,
		}
		jsonResp, err := json.Marshal(response)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write(jsonResp)
		return
	}
	var req struct {
		Language string `json:"language"`
		LabID    string `json:"labId"`
		UserId   string `json:"userId"`
	}
	if err = json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}
	language := req.Language
	labId := req.LabID
	userId := req.UserId

	fmt.Printf("DEBUG: CALLED THE USER WITH LABID %s and language %s with User ID %s\n", labId, language, userId)
	if language == "" {
		http.Error(w, "Missing language query parameter", http.StatusBadRequest)
		return
	}

	if labId == "" {
		http.Error(w, "Missing labId query parameter", http.StatusBadRequest)
		return
	}

	if userId != "" {

		err := s.db.ValidateUserAndLimits(userId)
		if err != nil {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
	}

	//TODO: Check If Lab ID Exists, before copying and making new lab
	fmt.Printf("DEBUG TRYING GET THE LAB ID %s\n", labId)
	lab, err, labExists := s.db.GetLabById(labId)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get lab by ID: %v", err), http.StatusInternalServerError)
		return
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
		lab, err = s.db.CreateLabForUser(userId, labId, language, codeLink, uuid.UUID{}, "playground")
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to create lab for user: %v", err), http.StatusInternalServerError)
			return
		}
	}
	log.Printf("Copying content from %s to %s", sourceKey, destinationKey)

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
			http.Error(w, fmt.Sprintf("Failed to copy content to S3: %v", err), http.StatusInternalServerError)
			return
		}
	}

	log.Printf("DEBUG: SPINNING UP LAB WITH CODE LINK %s\n", codeLink)

	params := k8s.SpinUpParams{
		LabID:                 labId,
		Language:              language,
		AppName:               fmt.Sprintf("%s-%s", language, labId),
		S3Bucket:              os.Getenv("AWS_S3_BUCKET_NAME"),
		CodeLink:              codeLink,
		S3Key:                 codeLink,
		Namespace:             "devsarena",
		ShouldCreateNamespace: true,
	}
	log.Printf("Starting to spin up resources for LabID: %s", params.LabID)

	if err := k8s.InitK8sClient(); err != nil {
		log.Printf("failed to initialize kubernetes client: %v", err)
		http.Error(w, fmt.Sprintf("Failed to initialize kubernetes client: %v", err), http.StatusInternalServerError)
		return
	}

	err = k8s.SpinUpPodWithLanguage(params)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to spin up pod: %v", err), http.StatusInternalServerError)
		return
	}
	response := map[string]interface{}{
		"success": true,
		"labId":   labId,
	}

	jsonResp, err := json.Marshal(response)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(jsonResp)

}

// StartQuestRequest represents the request payload for starting a quest
type StartQuestRequest struct {
	Language    string `json:"language"`
	ProjectSlug string `json:"projectSlug"`
	UserId      string `json:userId`
	LabID       string `json:"labId"`
}

// StartQuestResponse represents the response payload for starting a quest
type StartQuestResponse struct {
	Success bool   `json:"success"`
	LabID   string `json:"labId"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

func (s *Server) StartQuestHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	// Parse request
	var req StartQuestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response := StartQuestResponse{
			Success: false,
			Error:   "Invalid JSON payload",
		}
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(response)
		return
	}

	// Validate required fields
	if req.Language == "" {
		response := StartQuestResponse{
			Success: false,
			Error:   "Missing language parameter",
		}
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(response)
		return
	}

	if req.ProjectSlug == "" {
		response := StartQuestResponse{
			Success: false,
			Error:   "Missing projectSlug parameter",
		}
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(response)
		return
	}

	// Generate LabID if not provided
	if req.LabID == "" {
		req.LabID = uuid.New().String()
	}

	if req.UserId == "" {
		response := StartQuestResponse{
			Success: false,
			Error:   "Missing userId parameter",
		}
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(response)
		return
	}

	userId := req.UserId
	language := req.Language
	labId := req.LabID
	err := s.db.ValidateUserAndLimits(userId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	// Check concurrent lab limits
	utils.RedisUtilsInstance.CreateLabProgressQueueIfNotExists()
	utils.RedisUtilsInstance.CreateLabMonitoringQueueIfNotExists()
	count, err := utils.RedisUtilsInstance.GetNumberOfActiveLabInstances()
	if err != nil {
		response := StartQuestResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to get number of active lab instances: %v", err),
		}
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(response)
		return
	}

	if count > uint64(ALLOWED_CONCURRENT_LABS) {
		response := StartQuestResponse{
			Success: false,
			Error:   "Exceeded maximum concurrent labs",
		}
		w.WriteHeader(http.StatusTooManyRequests)
		_ = json.NewEncoder(w).Encode(response)
		return
	}

	// Get quest details from database
	quest, err := s.db.GetQuestBySlug(req.ProjectSlug)
	if err != nil {
		response := StartQuestResponse{
			Success: false,
			Error:   fmt.Sprintf("Quest not found: %v", err),
		}
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(response)
		return
	}
	fmt.Printf("DEBUG TRYING GET THE LAB ID %s\n", req.LabID)
	lab, err, labExists := s.db.GetLabById(req.LabID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get lab by ID: %v", err), http.StatusInternalServerError)
		return
	}

	fmt.Printf("DEBUG LAB EXISTS %v\n", labExists)
	// Initialize K8s client
	if err := k8s.InitK8sClient(); err != nil {
		log.Printf("Failed to initialize kubernetes client: %v", err)
		response := StartQuestResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to initialize kubernetes client: %v", err),
		}
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(response)
		return
	}

	sourceKey := quest.BoilerPlateCode
	destinationKey := fmt.Sprintf("code/%s/projects/%s/%s/%s", userId, language, quest.Slug, labId)

	codeLink := destinationKey

	if labExists {
		codeLink = lab.CodeLink
	} else {
		fmt.Printf("DEBUG: LAB NOT FOUND< CREATING LAB AND ADDING IT TO USER WITH ID %s and codeLink %s\n", userId, codeLink)
		lab, err = s.db.CreateLabForUser(userId, labId, language, codeLink, quest.ID, "project")
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to create lab for user: %v", err), http.StatusInternalServerError)
			return
		}
	}
	log.Printf("Copying content from %s to %s", sourceKey, destinationKey)
	if !labExists {
		err = utils.CopyS3Folder(sourceKey, destinationKey)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to copy content to S3: %v", err), http.StatusInternalServerError)
			return
		}
	}
	// Prepare quest parameters
	questParams := k8s.SpinUpQuestParams{
		LabID:                 req.LabID,
		Language:              req.Language,
		ProjectSlug:           req.ProjectSlug,
		CodeLink:              codeLink,
		S3Bucket:              os.Getenv("AWS_S3_BUCKET_NAME"),
		BoilerplateKey:        codeLink, // URL from database
		TestFilesKey:          "",
		Namespace:             "devsarena",
		ShouldCreateNamespace: true,
	}

	testResults :=
		[]utils.TestResult{}
	if labExists {
		err := json.Unmarshal(lab.TestResults, &testResults)
		if err != nil {
			log.Printf("Failed to unmarshal test results: %v", err)
			testResults = []utils.TestResult{}
		}
	}

	activeCheckpoint := 1
	if labExists {
		activeCheckpoint = lab.ActiveCheckpoint
	}
	// Create lab instance in Redis
	labInstance := utils.LabInstanceEntry{
		Language:         req.Language,
		LabID:            req.LabID,
		CodeLink:         codeLink,
		CreatedAt:        time.Now().Unix(),
		Status:           utils.Created,
		ActiveCheckpoint: activeCheckpoint,
		LastUpdatedAt:    time.Now().Unix(),
		ProgressLogs:     []utils.LabProgressEntry{},
		DirtyReadPaths:   []utils.DirtyFileEntry{},
		TestResults:      testResults,
	}
	utils.RedisUtilsInstance.CreateLabInstance(labInstance)

	log.Printf("Starting quest pod for LabID: %s, Project: %s, Language: %s", req.LabID, req.ProjectSlug, req.Language)

	// Spin up quest pod - test files will be copied from devsarena/projects/{projectSlug}/tests/
	err = k8s.SpinUpQuestPod(questParams)
	if err != nil {
		log.Printf("Failed to spin up quest pod: %v", err)
		response := StartQuestResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to spin up quest pod: %v", err),
		}
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(response)
		return
	}

	// Success response
	response := StartQuestResponse{
		Success: true,
		LabID:   req.LabID,
		Message: "Quest environment started successfully",
	}

	log.Printf("Quest pod started successfully for LabID: %s", req.LabID)
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(response)

}

func (s *Server) EndLabHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Language string `json:"language"`
		LabID    string `json:"labId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}
	language := req.Language
	labId := req.LabID
	if language == "" || labId == "" {
		http.Error(w, "Missing language or labId in request body", http.StatusBadRequest)
		return
	}
	log.Printf("DEBUG: TRYING TO GET THE LAB INSTANCE with ID %s", labId)
	labInstanceDetails, err := utils.RedisUtilsInstance.GetLabInstance(labId)
	if err != nil {
		log.Printf("DEBUG: FAILED TO GET THE LAB ID %v", err.Error())
		http.Error(w, "Lab instance not found", http.StatusNotFound)
		return
	}

	lab, err, labExistsInDB := s.db.GetLabById(labId)

	if labExistsInDB {
		err := s.db.SyncLabProgress(context.TODO(), lab, *labInstanceDetails)
		if err != nil {
			// TODO: REPORT THIS ERROR IN MIXPANEL MOVING FORWARD
			log.Printf("FAILED TO SYNC LAB PROGRESS %v\n", err.Error())
		}
		//? AN INTERNAL API TO TRIGGER RUNNER SERVICE TO SYNC DIRTY READS
		err = s.TriggerS3SyncFromRunner(labId)
		if err != nil {
			log.Printf("FAILED TO SYNC LAB PROGRESS FROM RUNNER %v\n", err.Error())
		}
	}

	params := struct {
		LabID     string
		Language  string
		AppName   string
		Namespace string
	}{
		LabID:     labId,
		Language:  language,
		AppName:   fmt.Sprintf("%s-%s", language, labId),
		Namespace: "devsarena",
	}

	err = k8s.InitK8sClient()
	if err != nil {
		log.Printf("Failed to initialize kubernetes client: %v", err)
		http.Error(w, fmt.Sprintf("Failed to initialize kubernetes client: %v", err), http.StatusInternalServerError)
		return
	}

	log.Printf("Tearing down resources for LabID: %s", params.LabID)
	if err = k8s.TearDownPodWithLanguage(params); err != nil {
		log.Printf("Failed to teardown resources: %v", err)
		http.Error(w, fmt.Sprintf("Failed to teardown resources: %v", err), http.StatusInternalServerError)
		return
	}

	utils.RedisUtilsInstance.RemoveLabInstance(labId)

	w.WriteHeader(http.StatusOK)
}

func (s *Server) TriggerS3SyncFromRunner(labId string) error {
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

// DeleteProjectHandler removes a project from the database and cleans up S3 objects
func (s *Server) DeleteProjectHandler(w http.ResponseWriter, r *http.Request) {
	var payload database.DeleteQuestRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if payload.Slug == "" {
		http.Error(w, "Missing slug field", http.StatusBadRequest)
		return
	}

	// Get quest details before deletion to clean up S3 objects
	quest, err := s.db.GetQuestBySlug(payload.Slug)
	if err != nil {
		log.Printf("Error finding quest: %v", err)
		http.Error(w, fmt.Sprintf("Quest not found: %v", err), http.StatusNotFound)
		return
	}

	// Delete quest from database
	err = s.db.DeleteQuest(payload.Slug)
	if err != nil {
		log.Printf("Error deleting quest: %v", err)
		http.Error(w, fmt.Sprintf("Failed to delete quest: %v", err), http.StatusInternalServerError)
		return
	}

	// TODO: Clean up S3 objects if BoilerPlateCode exists
	if quest.BoilerPlateCode != "" {
		log.Printf("TODO: Clean up S3 objects for quest boilerplate: %s", quest.BoilerPlateCode)
	}

	// TODO: Clean up checkpoint test files from S3
	for _, checkpoint := range quest.Checkpoints {
		if checkpoint.TestingCode != "" {
			log.Printf("TODO: Clean up checkpoint test file: %s", checkpoint.TestingCode)
		}
	}

	response := map[string]interface{}{
		"message": "Quest deleted successfully",
		"slug":    payload.Slug,
		"success": true,
	}

	w.Header().Set("Content-Type", "application/json")
	log.Printf("Quest deleted successfully: %s", payload.Slug)
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(response)
}

func (s *Server) DeleteLabHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Language string `json:"language"`
		LabID    string `json:"labId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	language := req.Language
	labId := req.LabID

	if language == "" {
		http.Error(w, "Missing language parameter", http.StatusBadRequest)
		return
	}

	if labId == "" {
		http.Error(w, "Missing labId parameter", http.StatusBadRequest)
		return
	}

	log.Printf("Deleting lab data for LabID: %s, Language: %s", labId, language)

	// Delete the folder from R2/S3
	err := utils.DeleteR2Folder(language, labId)
	if err != nil {
		log.Printf("Failed to delete lab data from R2: %v", err)
		http.Error(w, fmt.Sprintf("Failed to delete lab data: %v", err), http.StatusInternalServerError)
		return
	}

	// Remove from Redis if it exists
	utils.RedisUtilsInstance.RemoveLabInstance(labId)

	response := map[string]interface{}{
		"message":  "Lab data deleted successfully",
		"labId":    labId,
		"language": language,
		"success":  true,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding delete response: %v", err)
	}
}

// GetExperimentalProjectsLanguages returns all available programming languages/technologies
func (s *Server) GetExperimentalProjectsLanguages(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	languages := s.db.GetAllTechnologies()

	response := map[string]interface{}{
		"success":   true,
		"languages": languages,
	}

	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding languages response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

// GetExperimentalProjectsByLanguage returns all projects for a specific language
func (s *Server) GetExperimentalProjectsByLanguage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Extract language from URL path
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	language := pathParts[3] // /v1/experimental/projects/{language}

	if language == "" {
		http.Error(w, "Language parameter is required", http.StatusBadRequest)
		return
	}

	language = strings.ToLower(language)

	log.Printf("Fetching projects for language: %s", language)
	projects, err := s.db.GetQuestsByLanguage(language)
	if err != nil {
		log.Printf("Error getting projects for language %s: %v", language, err)
		http.Error(w, "Failed to get projects", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success":  true,
		"language": language,
		"projects": projects,
	}

	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding projects response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

// GetExperimentalQuestMetadata returns detailed quest metadata for the experimental IDE
func (s *Server) GetExperimentalQuestMetadata(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Extract quest slug from URL path
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	questSlug := pathParts[3] // /v1/experimental/quest/{questSlug}

	if questSlug == "" {
		http.Error(w, "Quest slug parameter is required", http.StatusBadRequest)
		return
	}

	quest, err := s.db.GetQuestBySlug(questSlug)
	if err != nil {
		log.Printf("Error getting quest metadata for slug %s: %v", questSlug, err)
		http.Error(w, "Quest not found", http.StatusNotFound)
		return
	}

	// Format response for experimental IDE
	response := map[string]interface{}{
		"success":     true,
		"quest":       quest,
		"projectSlug": questSlug,
		"metadata": map[string]interface{}{
			"name":         quest.Name,
			"description":  quest.Description,
			"difficulty":   quest.Difficulty,
			"category":     quest.Category,
			"techStack":    quest.TechStack,
			"topics":       quest.Topics,
			"checkpoints":  quest.Checkpoints,
			"requirements": quest.Requirements,
		},
	}

	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding quest metadata response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

// GetQuestCheckpoints returns detailed checkpoint information
func (s *Server) GetQuestCheckpoints(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 5 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	questSlug := pathParts[3]

	quest, err := s.db.GetQuestBySlug(questSlug)
	if err != nil {
		http.Error(w, "Quest not found", http.StatusNotFound)
		return
	}

	checkpoints := make([]map[string]interface{}, len(quest.Checkpoints))
	for i, checkpoint := range quest.Checkpoints {
		checkpoints[i] = map[string]interface{}{
			"id":           fmt.Sprintf("%d", i+1),
			"title":        checkpoint.Title,
			"description":  checkpoint.Description,
			"requirements": checkpoint.Requirements,
			"status":       "pending",
		}
	}

	response := map[string]interface{}{
		"success":     true,
		"checkpoints": checkpoints,
		"total":       len(quest.Checkpoints),
	}

	json.NewEncoder(w).Encode(response)
}

// GetTestResults returns test results for a lab
func (s *Server) GetTestResults(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 3 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	labID := pathParts[2]

	response := map[string]interface{}{
		"success": true,
		"labId":   labID,
		"results": map[string]interface{}{},
	}

	json.NewEncoder(w).Encode(response)
}

func (s *Server) SyncUserHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Verify Secret
	if r.Header.Get("X-Internal-Secret") != os.Getenv("INTERNAL_API_SECRET") {
		fmt.Printf("DEBUG: Unauthorized access attempt %v didnt match with %v\n", r.Header.Get("X-Internal-Secret"), os.Getenv("INTERNAL_API_SECRET"))
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. Parse Body
	var req database.SyncUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fmt.Printf("DEBUG: BODY DECODE ERROR %v", err.Error())
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// 3. Sync DB
	user, err := s.db.SyncUser(req)
	if err != nil {
		log.Printf("Sync error: %v", err)
		http.Error(w, "Sync failed", http.StatusInternalServerError)
		return
	}

	fmt.Printf("DEBUG: ALL GOOD SENDING THE REPSNSE\n")
	// 4. Respond with UUID
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"user_id": user.ID.String(),
		"success": "true",
	})
}
