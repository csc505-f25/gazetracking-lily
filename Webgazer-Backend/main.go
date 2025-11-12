package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/handlers"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var db *gorm.DB

func main() {
	// Initialize database
	var err error
	db, err = gorm.Open(sqlite.Open("readability.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto-migrate the schema
	err = db.AutoMigrate(
		&Participant{},
		&StudySession{},
		&CalibrationData{},
		&AccuracyMeasurement{},
		&QuizResponse{},
		&GazePoint{},
		&ReadingEvent{},
		&StudyText{},
		&QuizQuestion{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	fmt.Println("Database initialized successfully")

	// Setup routes
	http.HandleFunc("/api/participant", handleParticipant)
	http.HandleFunc("/api/session", handleSession)
	http.HandleFunc("/api/quiz-response", handleQuizResponse)
	http.HandleFunc("/api/calibration", handleCalibration)
	http.HandleFunc("/api/gaze-point", handleGazePoint)
	http.HandleFunc("/api/reading-event", handleReadingEvent)
	http.HandleFunc("/api/accuracy", handleAccuracy)
	http.HandleFunc("/api/study-text", handleStudyText)
	http.HandleFunc("/api/quiz-questions", handleQuizQuestions)
	http.HandleFunc("/api/admin/study-text", handleAdminStudyText)
	http.HandleFunc("/api/admin/quiz-question", handleAdminQuizQuestion)
	http.HandleFunc("/api/health", handleHealth)
	
	// Seed initial data if database is empty
	seedInitialData()

	// CORS middleware
	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"http://localhost:5173", "http://localhost:4173", "http://localhost:3000"}),
		handlers.AllowedMethods([]string{"GET", "POST", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type"}),
	)(http.DefaultServeMux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server starting on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, corsHandler))
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func handleParticipant(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var participant Participant
	if err := json.NewDecoder(r.Body).Decode(&participant); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Set default source if not provided
	if participant.Source == "" {
		participant.Source = "web"
	}

	// Create participant in database
	if err := db.Create(&participant).Error; err != nil {
		http.Error(w, "Failed to save participant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"id":      participant.ID,
		"source":  participant.Source,
	})
}

func handleSession(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var session StudySession
	if err := json.NewDecoder(r.Body).Decode(&session); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Create session in database
	if err := db.Create(&session).Error; err != nil {
		http.Error(w, "Failed to save session: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"session_id": session.SessionID,
		"id": session.ID,
	})
}

func handleQuizResponse(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var quizResponse QuizResponse
	if err := json.NewDecoder(r.Body).Decode(&quizResponse); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Set timestamp if not provided
	if quizResponse.Timestamp.IsZero() {
		quizResponse.Timestamp = time.Now()
	}

	// Create quiz response in database
	if err := db.Create(&quizResponse).Error; err != nil {
		http.Error(w, "Failed to save quiz response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"id":      quizResponse.ID,
	})
}

func handleCalibration(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var calibration CalibrationData
	if err := json.NewDecoder(r.Body).Decode(&calibration); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Set timestamp if not provided
	if calibration.Timestamp.IsZero() {
		calibration.Timestamp = time.Now()
	}

	// Create calibration data in database
	if err := db.Create(&calibration).Error; err != nil {
		http.Error(w, "Failed to save calibration data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"id":      calibration.ID,
	})
}

func handleGazePoint(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var gazePoint GazePoint
	if err := json.NewDecoder(r.Body).Decode(&gazePoint); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Set timestamp if not provided
	if gazePoint.Timestamp.IsZero() {
		gazePoint.Timestamp = time.Now()
	}

	// Create gaze point in database
	if err := db.Create(&gazePoint).Error; err != nil {
		http.Error(w, "Failed to save gaze point: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"id":      gazePoint.ID,
	})
}

func handleReadingEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var readingEvent ReadingEvent
	if err := json.NewDecoder(r.Body).Decode(&readingEvent); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Set timestamp if not provided
	if readingEvent.Timestamp.IsZero() {
		readingEvent.Timestamp = time.Now()
	}

	// Create reading event in database
	if err := db.Create(&readingEvent).Error; err != nil {
		http.Error(w, "Failed to save reading event: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"id":      readingEvent.ID,
	})
}

func handleAccuracy(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var accuracy AccuracyMeasurement
	if err := json.NewDecoder(r.Body).Decode(&accuracy); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Set timestamp if not provided
	if accuracy.Timestamp.IsZero() {
		accuracy.Timestamp = time.Now()
	}

	// Create accuracy measurement in database
	if err := db.Create(&accuracy).Error; err != nil {
		http.Error(w, "Failed to save accuracy measurement: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"id":      accuracy.ID,
	})
}

func handleStudyText(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get version from query parameter, default to "default"
	version := r.URL.Query().Get("version")
	if version == "" {
		version = "default"
	}

	var studyText StudyText
	if err := db.Where("version = ? AND active = ?", version, true).First(&studyText).Error; err != nil {
		// If not found, try to get any active study text
		if err := db.Where("active = ?", true).First(&studyText).Error; err != nil {
			http.Error(w, "No study text found", http.StatusNotFound)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":         studyText.ID,
		"version":    studyText.Version,
		"content":    studyText.Content,
		"font_left":  studyText.FontLeft,
		"font_right": studyText.FontRight,
	})
}

func handleQuizQuestions(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get study_text_id from query parameter
	studyTextID := r.URL.Query().Get("study_text_id")
	
	var questions []QuizQuestion
	query := db.Order("`order` ASC")
	
	if studyTextID != "" {
		query = query.Where("study_text_id = ?", studyTextID)
	} else {
		// If no study_text_id provided, get questions for active study text
		var studyText StudyText
		if err := db.Where("active = ?", true).First(&studyText).Error; err != nil {
			http.Error(w, "No active study text found", http.StatusNotFound)
			return
		}
		query = query.Where("study_text_id = ?", studyText.ID)
	}

	if err := query.Find(&questions).Error; err != nil {
		http.Error(w, "Failed to fetch quiz questions: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Format response to match frontend expectations
	type QuizQResponse struct {
		ID      string   `json:"id"`
		Prompt  string   `json:"prompt"`
		Choices []string `json:"choices"`
		Answer  int      `json:"answer"`
	}

	response := make([]QuizQResponse, len(questions))
	for i, q := range questions {
		var choices []string
		if err := json.Unmarshal([]byte(q.Choices), &choices); err != nil {
			log.Printf("Error unmarshaling choices for question %s: %v", q.QuestionID, err)
			continue
		}

		response[i] = QuizQResponse{
			ID:      q.QuestionID,
			Prompt:  q.Prompt,
			Choices: choices,
			Answer:  q.Answer,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Admin endpoints for managing study text and quiz questions

func handleAdminStudyText(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case "POST":
		// Create new study text
		var studyText StudyText
		if err := json.NewDecoder(r.Body).Decode(&studyText); err != nil {
			http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
			return
		}

		// Set defaults
		if studyText.Version == "" {
			studyText.Version = "default"
		}
		if studyText.FontLeft == "" {
			studyText.FontLeft = "serif"
		}
		if studyText.FontRight == "" {
			studyText.FontRight = "sans"
		}

		// If this is set to active, deactivate all others
		if studyText.Active {
			db.Model(&StudyText{}).Where("active = ?", true).Update("active", false)
		}

		if err := db.Create(&studyText).Error; err != nil {
			http.Error(w, "Failed to create study text: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"id":      studyText.ID,
			"message": "Study text created successfully",
		})

	case "PUT":
		// Update existing study text
		var updateData struct {
			ID        uint   `json:"id"`
			Version   string `json:"version,omitempty"`
			Content   string `json:"content,omitempty"`
			FontLeft  string `json:"font_left,omitempty"`
			FontRight string `json:"font_right,omitempty"`
			Active    *bool  `json:"active,omitempty"`
		}

		if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
			http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
			return
		}

		if updateData.ID == 0 {
			http.Error(w, "ID is required", http.StatusBadRequest)
			return
		}

		var studyText StudyText
		if err := db.First(&studyText, updateData.ID).Error; err != nil {
			http.Error(w, "Study text not found", http.StatusNotFound)
			return
		}

		// Update fields
		if updateData.Version != "" {
			studyText.Version = updateData.Version
		}
		if updateData.Content != "" {
			studyText.Content = updateData.Content
		}
		if updateData.FontLeft != "" {
			studyText.FontLeft = updateData.FontLeft
		}
		if updateData.FontRight != "" {
			studyText.FontRight = updateData.FontRight
		}
		if updateData.Active != nil {
			// If setting to active, deactivate all others first
			if *updateData.Active {
				db.Model(&StudyText{}).Where("active = ? AND id != ?", true, updateData.ID).Update("active", false)
			}
			studyText.Active = *updateData.Active
		}

		if err := db.Save(&studyText).Error; err != nil {
			http.Error(w, "Failed to update study text: "+err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"id":      studyText.ID,
			"message": "Study text updated successfully",
		})

	case "GET":
		// List all study texts
		var studyTexts []StudyText
		if err := db.Order("created_at DESC").Find(&studyTexts).Error; err != nil {
			http.Error(w, "Failed to fetch study texts: "+err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data":    studyTexts,
		})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleAdminQuizQuestion(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case "POST":
		// Create new quiz question
		var questionData struct {
			StudyTextID uint     `json:"study_text_id"`
			QuestionID  string   `json:"question_id"`
			Prompt      string   `json:"prompt"`
			Choices     []string `json:"choices"`
			Answer      int      `json:"answer"`
			Order       int      `json:"order"`
		}

		if err := json.NewDecoder(r.Body).Decode(&questionData); err != nil {
			http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
			return
		}

		// Validate required fields
		if questionData.StudyTextID == 0 || questionData.QuestionID == "" || questionData.Prompt == "" {
			http.Error(w, "study_text_id, question_id, and prompt are required", http.StatusBadRequest)
			return
		}

		// Convert choices to JSON string
		choicesJSON, err := json.Marshal(questionData.Choices)
		if err != nil {
			http.Error(w, "Invalid choices format: "+err.Error(), http.StatusBadRequest)
			return
		}

		question := QuizQuestion{
			StudyTextID: questionData.StudyTextID,
			QuestionID:  questionData.QuestionID,
			Prompt:     questionData.Prompt,
			Choices:    string(choicesJSON),
			Answer:     questionData.Answer,
			Order:      questionData.Order,
		}

		if err := db.Create(&question).Error; err != nil {
			http.Error(w, "Failed to create quiz question: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"id":      question.ID,
			"message": "Quiz question created successfully",
		})

	case "PUT":
		// Update existing quiz question
		var updateData struct {
			ID         uint      `json:"id"`
			QuestionID string    `json:"question_id,omitempty"`
			Prompt     string    `json:"prompt,omitempty"`
			Choices    []string  `json:"choices,omitempty"`
			Answer     *int      `json:"answer,omitempty"`
			Order      *int      `json:"order,omitempty"`
		}

		if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
			http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
			return
		}

		if updateData.ID == 0 {
			http.Error(w, "ID is required", http.StatusBadRequest)
			return
		}

		var question QuizQuestion
		if err := db.First(&question, updateData.ID).Error; err != nil {
			http.Error(w, "Quiz question not found", http.StatusNotFound)
			return
		}

		// Update fields
		if updateData.QuestionID != "" {
			question.QuestionID = updateData.QuestionID
		}
		if updateData.Prompt != "" {
			question.Prompt = updateData.Prompt
		}
		if updateData.Choices != nil {
			choicesJSON, err := json.Marshal(updateData.Choices)
			if err != nil {
				http.Error(w, "Invalid choices format: "+err.Error(), http.StatusBadRequest)
				return
			}
			question.Choices = string(choicesJSON)
		}
		if updateData.Answer != nil {
			question.Answer = *updateData.Answer
		}
		if updateData.Order != nil {
			question.Order = *updateData.Order
		}

		if err := db.Save(&question).Error; err != nil {
			http.Error(w, "Failed to update quiz question: "+err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"id":      question.ID,
			"message": "Quiz question updated successfully",
		})

	case "DELETE":
		// Delete quiz question
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "ID parameter is required", http.StatusBadRequest)
			return
		}

		if err := db.Delete(&QuizQuestion{}, id).Error; err != nil {
			http.Error(w, "Failed to delete quiz question: "+err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Quiz question deleted successfully",
		})

	case "GET":
		// Get single quiz question by ID
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "ID parameter is required", http.StatusBadRequest)
			return
		}

		var question QuizQuestion
		if err := db.First(&question, id).Error; err != nil {
			http.Error(w, "Quiz question not found", http.StatusNotFound)
			return
		}

		// Parse choices JSON
		var choices []string
		json.Unmarshal([]byte(question.Choices), &choices)

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"id":           question.ID,
				"study_text_id": question.StudyTextID,
				"question_id":  question.QuestionID,
				"prompt":       question.Prompt,
				"choices":      choices,
				"answer":       question.Answer,
				"order":        question.Order,
			},
		})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

