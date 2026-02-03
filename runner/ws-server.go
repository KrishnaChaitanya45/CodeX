package main

import (
	"context"
	"log"
	"net/http"
	"net/url"
	"sync"

	"github.com/gorilla/websocket"
)

var (
	websocketUpgrader = websocket.Upgrader{
		CheckOrigin:     checkOrigin,
		ReadBufferSize:  5 * 1024 * 1024, // 5 MB
		WriteBufferSize: 5 * 1024 * 1024, // 5 MB

	}
)

type WSManager struct {
	fsHandlers map[string]fsHandler
	sync.RWMutex
}

func NewFSManager(ctx context.Context) *WSManager {
	return &WSManager{
		fsHandlers: make(map[string]fsHandler),
	}
}

func startFSServer(ctx context.Context) {
	manager := NewFSManager(ctx)
	manager.setupHandlers()
	http.HandleFunc("/fs", manager.serveFS)
	log.Println("File system WebSocket server listening on :8081")
}

func (m *WSManager) serveFS(w http.ResponseWriter, r *http.Request) {

	conn, err := websocketUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	s3Client, err := InitS3Client()
	if err != nil {
		log.Println("Failed to initialize S3 client:", err)
		return
	}
	client := NewClient(conn, m, s3Client)

	// Send connection established message using standardized format
	if err := client.SendInfo("Connection established", map[string]string{
		"server":  "runner-service",
		"version": "1.7.0",
	}); err != nil {
		log.Println("Failed to send connection message:", err)
		return
	}

	m.setupHandlers()

	// Start client message handling
	go client.readMessages()
	go client.writeMessages()

	// Wait for client to disconnect
	<-client.done
	log.Println("Client disconnected")

	// Cleanup
	client.Close()
	conn.Close()
}

func (m *WSManager) setupHandlers() {
	m.fsHandlers[FS_FILE_CONTENT_UPDATE] = FileContentUpdateHandler
	m.fsHandlers[FS_LOAD_DIR] = LoadDirHandler
	m.fsHandlers[FS_FETCH_FILE_CONTENT] = FetchFileContentHandler
	m.fsHandlers[FS_NEW_FILE] = NewFileHandler
	m.fsHandlers[FS_DELETE_FILE] = DeleteFileHandler
	m.fsHandlers[FS_EDIT_FILE_META] = EditFileMetaHandler
	m.fsHandlers[FS_FETCH_QUEST_META] = FetchQuestMetaHandler
	m.fsHandlers[FS_INITIALIZE_CLIENT] = InitializeClientHandler
	m.fsHandlers[SYNC_FILES_TO_S3] = SyncFilesToS3Handler
}

func (m *WSManager) routeEvent(event Event, client *Client) error {
	m.RLock()
	handler, exists := m.fsHandlers[event.Type]
	m.RUnlock()

	if !exists {
		log.Printf("No handler found for event type: %s", event.Type)
		return client.SendError("Unknown event type", "Handler not found for event type: "+event.Type)
	}

	// Update lab monitor queue with user interaction
	if LAB_ID != "" {
		UpdateLabMonitorQueue(LAB_ID)
	}

	// Create a context for the handler
	ctx := context.Background()

	// Call the handler
	if err := handler(ctx, event.Payload, client); err != nil {
		log.Printf("Handler error for event type %s: %v", event.Type, err)
		return client.SendError("Handler execution failed", err.Error())
	}

	return nil
}

func checkOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	log.Printf(" RECEIVED REQUEST FROM %v REMOTE ADDRR %v ORIGIN,", r.RemoteAddr, origin)
	if origin == "" {
		return true
	}
	u, err := url.Parse(origin)
	if err != nil {
		return true
	}

	host := u.Host
	if host == "devsarena.in" || host == "staging.devsarena.in" {
		return true
	}
	return true
}
